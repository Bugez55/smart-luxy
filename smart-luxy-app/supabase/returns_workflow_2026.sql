-- Wazyo: support returned parcels and restore stock exactly once.
-- Applied to the production Supabase project on 2026-11-07.
-- Returned orders keep their history; the stock marker prevents duplicate restoration.

alter table public.orders drop constraint if exists orders_statut_check;
alter table public.orders
  add constraint orders_statut_check
  check (statut in ('new','confirmed','shipped','delivered','cancelled','returned'));

create or replace function public.enforce_order_status_workflow()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if old.statut = new.statut then return new; end if;
  if old.statut = 'new' and new.statut not in ('confirmed','cancelled') then
    raise exception 'Transition interdite : % → %', old.statut, new.statut;
  end if;
  if old.statut = 'confirmed' and new.statut not in ('shipped','cancelled') then
    raise exception 'Transition interdite : % → %', old.statut, new.statut;
  end if;
  if old.statut = 'shipped' and new.statut not in ('delivered','cancelled','returned') then
    raise exception 'Transition interdite : % → %', old.statut, new.statut;
  end if;
  if old.statut = 'delivered' and new.statut <> 'returned' then
    raise exception 'Une commande livrée ne peut changer de statut que vers Retournée';
  end if;
  if old.statut = 'cancelled' then
    raise exception 'Une commande annulée ne peut plus être réactivée';
  end if;
  if old.statut = 'returned' then
    raise exception 'Une commande retournée est un statut final';
  end if;
  insert into public.order_status_history(order_id,from_status,to_status,changed_by)
  values(old.id,old.statut,new.statut,auth.uid());
  return new;
end;
$function$;

create or replace function public.restore_color_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  item jsonb; product_id bigint; qty integer; color_name text;
  colors_json jsonb; c jsonb; new_colors jsonb; found_color boolean; color_stock integer;
begin
  if ((new.statut='cancelled' and old.statut in ('new','confirmed'))
      or (new.statut='returned' and old.statut in ('shipped','delivered')))
     and new.stock_restored_at is null then
    for item in select value from jsonb_array_elements(coalesce(new.items,'[]'::jsonb)) loop
      product_id := nullif(item->>'id','')::bigint;
      qty := greatest(0,coalesce((item->>'qty')::integer,0));
      color_name := nullif(btrim(coalesce(item->>'color',item->>'couleur')),'');
      if product_id is not null and qty>0 and color_name is not null then
        select colors into colors_json from public.products where id=product_id for update;
        colors_json := case when jsonb_typeof(coalesce(colors_json,'[]'::jsonb))='array'
          then coalesce(colors_json,'[]'::jsonb) else '[]'::jsonb end;
        new_colors := '[]'::jsonb; found_color := false;
        for c in select value from jsonb_array_elements(colors_json) loop
          if lower(btrim(coalesce(c->>'name','')))=lower(color_name) then
            found_color := true;
            if nullif(btrim(coalesce(c->>'stock','')),'') is not null
               and btrim(c->>'stock') ~ '^[0-9]+$' then
              color_stock := (c->>'stock')::integer;
              c := jsonb_set(c,'{stock}',to_jsonb(color_stock+qty),true);
            end if;
          end if;
          new_colors := new_colors || jsonb_build_array(c);
        end loop;
        if found_color then update public.products set colors=new_colors where id=product_id; end if;
      end if;
    end loop;
  end if;
  return new;
end;
$function$;

create or replace function public.restore_model_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_item jsonb; v_product_id bigint; v_model_name text; v_qty integer;
  v_product public.products; v_models jsonb; v_model jsonb; v_new_models jsonb;
  v_found boolean; v_stock integer;
begin
  if ((new.statut='cancelled' and old.statut in ('new','confirmed'))
      or (new.statut='returned' and old.statut in ('shipped','delivered')))
     and new.stock_restored_at is null then
    for v_item in select value from jsonb_array_elements(coalesce(new.items,'[]'::jsonb)) loop
      v_product_id := nullif(v_item->>'id','')::bigint;
      v_model_name := nullif(btrim(coalesce(v_item->>'model',v_item->>'modele')),'');
      v_qty := greatest(0,coalesce(nullif(v_item->>'qty','')::integer,0));
      if v_product_id is null or v_model_name is null or v_qty<=0 then continue; end if;
      select * into v_product from public.products where id=v_product_id for update;
      if not found then raise exception 'Produit % introuvable pour restaurer le modèle',v_product_id; end if;
      v_models := case when jsonb_typeof(coalesce(v_product.models,'[]'::jsonb))='array'
        then coalesce(v_product.models,'[]'::jsonb) else '[]'::jsonb end;
      v_new_models := '[]'::jsonb; v_found := false;
      for v_model in select value from jsonb_array_elements(v_models) loop
        if lower(btrim(coalesce(v_model->>'name','')))=lower(v_model_name) then
          v_found := true;
          if nullif(btrim(coalesce(v_model->>'stock','')),'') is not null
             and btrim(v_model->>'stock') ~ '^[0-9]+$' then
            v_stock := (v_model->>'stock')::integer;
            v_model := jsonb_set(v_model,'{stock}',to_jsonb(v_stock+v_qty),true);
          end if;
        end if;
        v_new_models := v_new_models || jsonb_build_array(v_model);
      end loop;
      if not v_found then raise exception 'Modèle % introuvable pour le produit %',v_model_name,v_product_id; end if;
      update public.products set models=v_new_models where id=v_product_id;
    end loop;
  end if;
  return new;
end;
$function$;

create or replace function public.enforce_order_status_and_restore_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_product_id bigint; v_product_stock integer; v_show_models boolean;
  v_has_model_line boolean; v_total_qty integer;
begin
  if old.statut=new.statut then return new; end if;
  if not ((old.statut='new' and new.statut in ('confirmed','cancelled'))
       or (old.statut='confirmed' and new.statut in ('shipped','cancelled'))
       or (old.statut='shipped' and new.statut in ('delivered','cancelled','returned'))
       or (old.statut='delivered' and new.statut='returned')) then
    raise exception 'Transition de statut interdite : % -> %',old.statut,new.statut;
  end if;

  if ((new.statut='cancelled' and old.statut in ('new','confirmed'))
      or (new.statut='returned' and old.statut in ('shipped','delivered')))
     and new.stock_restored_at is null then
    for v_product_id in
      select distinct nullif(value->>'id','')::bigint
      from jsonb_array_elements(coalesce(new.items,'[]'::jsonb))
      where nullif(value->>'id','') is not null
    loop
      select stock,coalesce(show_models,false) into v_product_stock,v_show_models
      from public.products where id=v_product_id;
      if not found then raise exception 'Produit % introuvable pour restaurer le stock',v_product_id; end if;

      select coalesce(sum(greatest(0,coalesce(nullif(value->>'qty','')::integer,0))),0)::integer
      into v_total_qty
      from jsonb_array_elements(coalesce(new.items,'[]'::jsonb))
      where nullif(value->>'id','')::bigint=v_product_id;

      select exists(
        select 1 from jsonb_array_elements(coalesce(new.items,'[]'::jsonb)) as x(value)
        where nullif(x.value->>'id','')::bigint=v_product_id
          and nullif(btrim(coalesce(x.value->>'model',x.value->>'modele','')),'') is not null
      ) into v_has_model_line;

      if v_total_qty>0 then
        if v_show_models and v_has_model_line and v_product_stock is not null then
          update public.products set ventes=greatest(0,coalesce(ventes,0)-v_total_qty),
            nb_commandes=greatest(0,coalesce(nb_commandes,0)-1) where id=v_product_id;
        elsif v_show_models and v_has_model_line then
          update public.products set nb_commandes=greatest(0,coalesce(nb_commandes,0)-1)
          where id=v_product_id;
        elsif v_product_stock is not null then
          update public.products set stock=stock+v_total_qty,
            ventes=greatest(0,coalesce(ventes,0)-v_total_qty),
            nb_commandes=greatest(0,coalesce(nb_commandes,0)-1) where id=v_product_id;
        end if;
      end if;
    end loop;
    new.stock_restored_at := now();
  end if;
  return new;
end;
$function$;
