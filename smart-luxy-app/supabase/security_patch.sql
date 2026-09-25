-- WAZYO — Production hardening patch v2
-- Apply after the existing schema. Safe to rerun.
-- This patch does NOT require frontend changes.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.orders add column if not exists request_fingerprint text;
create index if not exists idx_orders_telephone_created_at on public.orders(telephone, created_at desc);
create index if not exists idx_orders_request_fingerprint_created_at on public.orders(request_fingerprint, created_at desc);

create table if not exists private.order_rate_limits (
  key_hash   text not null,
  request_at timestamptz not null default now()
);
create index if not exists idx_private_order_rate_limits_key_time
  on private.order_rate_limits(key_hash, request_at desc);
revoke all on private.order_rate_limits from public, anon, authenticated;

create table if not exists private.review_rate_limits (
  key_hash    text not null,
  scope       text not null,
  product_id  bigint,
  request_at  timestamptz not null default now()
);
create index if not exists idx_private_review_rate_limits_scope_key_time
  on private.review_rate_limits(scope, key_hash, request_at desc);
revoke all on private.review_rate_limits from public, anon, authenticated;

create table if not exists public.shipping_dispatches (
  id            bigserial primary key,
  provider      text not null check (provider = 'yalidine'),
  order_id      text not null references public.orders(id),
  status        text not null default 'creating'
                check (status in ('creating','created','failed','unknown')),
  attempts      integer not null default 1 check (attempts >= 1),
  tracking_code text,
  label_url     text,
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(provider, order_id),
  unique(provider, tracking_code)
);
create index if not exists idx_shipping_dispatches_status_updated_at
  on public.shipping_dispatches(status, updated_at desc);
alter table public.shipping_dispatches enable row level security;
drop policy if exists "admin manage shipping dispatches" on public.shipping_dispatches;
create policy "admin manage shipping dispatches"
  on public.shipping_dispatches for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.touch_shipping_dispatch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_shipping_dispatch_updated_at() from public;
drop trigger if exists trg_shipping_dispatches_updated_at on public.shipping_dispatches;
create trigger trg_shipping_dispatches_updated_at
before update on public.shipping_dispatches
for each row execute function public.touch_shipping_dispatch_updated_at();

-- Hardened create_order: same function signature, so the frontend needs no change.
create or replace function public.create_order(
  p_nom_client text,
  p_telephone text,
  p_wilaya text,
  p_commune text,
  p_adresse text default '',
  p_note text default '',
  p_items jsonb default '[]'::jsonb,
  p_mode_livraison text default 'domicile',
  p_frais_livraison numeric default 0,
  p_mode_paiement text default 'livraison',
  p_promo_code text default null,
  p_fbc text default null,
  p_fbp text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_wilaya text;
  v_phone text;
  v_client_ip text;
  v_headers_raw text;
  v_headers jsonb;
  v_mode text := case when p_mode_livraison = 'bureau' then 'bureau' else 'domicile' end;
  v_payment text := case when p_mode_paiement in ('livraison','ccp','baridimob') then p_mode_paiement else 'livraison' end;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_shipping numeric(12,2);
  v_free_ship numeric(12,2);
  v_free_ship_text text;
  v_total numeric(12,2);
  v_promo record;
  v_stock_alerts jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_product public.products;
  v_line record;
  v_existing public.orders;
  v_request_fingerprint text;
  v_rate_count integer;
  v_rate_key text;
begin
  if length(trim(coalesce(p_nom_client,''))) not between 2 and 120 then
    raise exception 'Nom invalide';
  end if;

  v_phone := regexp_replace(trim(coalesce(p_telephone,'')), '\D', '', 'g');
  if v_phone ~ '^213[567][0-9]{8}$' then
    v_phone := '0' || substring(v_phone from 4);
  end if;
  if v_phone !~ '^0[567][0-9]{8}$' then
    raise exception 'Téléphone invalide';
  end if;

  if length(trim(coalesce(p_wilaya,''))) < 2 then
    raise exception 'Wilaya invalide';
  end if;
  if length(trim(coalesce(p_commune,''))) < 1 then
    raise exception 'Commune invalide';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Panier vide';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Panier trop volumineux';
  end if;

  v_wilaya := regexp_replace(trim(p_wilaya), '^\d+\s*—\s*', '');

  v_request_fingerprint := encode(
    digest(
      jsonb_build_object(
        'nom', lower(trim(p_nom_client)),
        'telephone', v_phone,
        'wilaya', lower(trim(v_wilaya)),
        'commune', lower(trim(p_commune)),
        'adresse', lower(trim(coalesce(p_adresse,''))),
        'note', left(trim(coalesce(p_note,'')), 1200),
        'items', p_items,
        'mode_livraison', v_mode,
        'mode_paiement', v_payment,
        'promo_code', upper(trim(coalesce(p_promo_code,'')))
      )::text,
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(hashtext('wazyo-order-idem:' || v_request_fingerprint));

  select * into v_existing
  from public.orders
  where request_fingerprint = v_request_fingerprint
    and created_at >= now() - interval '30 minutes'
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'nom_client', v_existing.nom_client,
      'telephone', v_existing.telephone,
      'wilaya', v_existing.wilaya,
      'commune', v_existing.commune,
      'items', v_existing.items,
      'sous_total', v_existing.sous_total,
      'promo_code', v_existing.promo_code,
      'promo_reduction', v_existing.promo_reduction,
      'total', v_existing.total,
      'statut', v_existing.statut,
      'mode_livraison', v_existing.mode_livraison,
      'mode_paiement', v_existing.mode_paiement,
      'frais_livraison', v_existing.frais_livraison,
      'created_at', v_existing.created_at,
      'stock_alerts', '[]'::jsonb
    );
  end if;

  begin
    v_headers_raw := current_setting('request.headers', true);
    v_headers := coalesce(nullif(v_headers_raw, ''), '{}')::jsonb;
    v_client_ip := trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1));
    if v_client_ip is null or v_client_ip = '' then
      v_client_ip := trim(v_headers->>'cf-connecting-ip');
    end if;
    if v_client_ip is not null and v_client_ip <> '' then
      begin
        perform v_client_ip::inet;
      exception when others then
        v_client_ip := null;
      end;
    end if;
  exception when others then
    v_client_ip := null;
  end;

  if v_client_ip is not null then
    v_rate_key := encode(digest('ip:' || v_client_ip, 'sha256'), 'hex');
    perform pg_advisory_xact_lock(hashtext('wazyo-order-rate:' || v_rate_key));
    delete from private.order_rate_limits where request_at < now() - interval '30 minutes';
    select count(*) into v_rate_count
    from private.order_rate_limits
    where key_hash = v_rate_key and request_at >= now() - interval '10 minutes';
    if v_rate_count >= 12 then
      raise exception 'Trop de tentatives de commande. Réessayez dans quelques minutes.';
    end if;
    insert into private.order_rate_limits(key_hash) values (v_rate_key);
  end if;

  delete from private.order_rate_limits where request_at < now() - interval '30 minutes';
  v_rate_key := encode(digest('phone:' || v_phone, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtext('wazyo-order-rate:' || v_rate_key));
  select count(*) into v_rate_count
  from private.order_rate_limits
  where key_hash = v_rate_key and request_at >= now() - interval '10 minutes';
  if v_rate_count >= 6 then
    raise exception 'Trop de commandes pour ce numéro. Réessayez dans quelques minutes.';
  end if;
  insert into private.order_rate_limits(key_hash) values (v_rate_key);

  select case when v_mode = 'bureau' then bureau else domicile end
  into v_shipping
  from public.shipping_rates
  where lower(wilaya) = lower(v_wilaya);
  if v_shipping is null then
    raise exception 'Tarif de livraison indisponible pour cette wilaya';
  end if;

  select trim(value) into v_free_ship_text from public.settings where key = 'free_ship';
  if v_free_ship_text is not null and v_free_ship_text ~ '^[0-9]+(\.[0-9]+)?$' then
    v_free_ship := v_free_ship_text::numeric;
  end if;

  for v_line in
    select (value->>'id')::bigint as product_id,
           sum((value->>'qty')::integer)::integer as qty
    from jsonb_array_elements(p_items) as x(value)
    group by (value->>'id')::bigint
    order by (value->>'id')::bigint
  loop
    if v_line.product_id is null or v_line.qty is null or v_line.qty < 1 or v_line.qty > 50 then
      raise exception 'Quantité invalide';
    end if;

    select * into v_product from public.products where id = v_line.product_id for update;
    if not found or not v_product.is_active then
      raise exception 'Produit indisponible';
    end if;
    if v_product.stock is not null and v_product.stock < v_line.qty then
      raise exception 'Stock insuffisant pour le produit: %', v_product.nom;
    end if;

    v_subtotal := v_subtotal + (v_product.prix * v_line.qty);
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_product.id,
        'nom', v_product.nom,
        'prix', v_product.prix,
        'categorie', v_product.categorie,
        'img', v_product.img,
        'qty', v_line.qty
      )
    );

    if v_product.stock is not null then
      update public.products
      set stock = stock - v_line.qty,
          ventes = coalesce(ventes, 0) + v_line.qty,
          nb_commandes = coalesce(nb_commandes, 0) + 1
      where id = v_product.id;

      if v_product.stock - v_line.qty <= 5 then
        v_stock_alerts := v_stock_alerts || jsonb_build_array(
          jsonb_build_object(
            'id', v_product.id,
            'nom', v_product.nom,
            'stock', greatest(0, v_product.stock - v_line.qty)
          )
        );
      end if;
    end if;
  end loop;

  if v_free_ship is not null and v_free_ship > 0 and v_subtotal >= v_free_ship then
    v_shipping := 0;
  end if;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo
    from public.promos
    where code = upper(trim(p_promo_code))
      and actif = true
      and (max_uses is null or uses < max_uses)
    for update;
    if not found then
      raise exception 'Code promo invalide ou expiré';
    end if;
    v_discount := round(v_subtotal * v_promo.reduction / 100.0);
    update public.promos set uses = uses + 1 where id = v_promo.id;
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + v_shipping;
  v_id := 'SL-' || upper(encode(gen_random_bytes(5), 'hex'));

  insert into public.orders (
    id, nom_client, telephone, wilaya, commune, adresse, note,
    items, sous_total, promo_code, promo_reduction, total, statut,
    mode_livraison, mode_paiement, frais_livraison, fbc, fbp, request_fingerprint
  )
  values (
    v_id, trim(p_nom_client), v_phone,
    trim(p_wilaya), trim(p_commune),
    left(coalesce(trim(p_adresse), ''), 2000),
    left(coalesce(trim(p_note), ''), 1200),
    v_items, v_subtotal,
    case when p_promo_code is null or trim(p_promo_code) = '' then null else upper(trim(p_promo_code)) end,
    v_discount, v_total, 'new',
    v_mode, v_payment, v_shipping,
    left(p_fbc, 500), left(p_fbp, 500), v_request_fingerprint
  );

  return jsonb_build_object(
    'id', v_id,
    'nom_client', trim(p_nom_client),
    'telephone', v_phone,
    'wilaya', trim(p_wilaya),
    'commune', trim(p_commune),
    'items', v_items,
    'sous_total', v_subtotal,
    'promo_code', case when p_promo_code is null or trim(p_promo_code) = '' then null else upper(trim(p_promo_code)) end,
    'promo_reduction', v_discount,
    'total', v_total,
    'statut', 'new',
    'mode_livraison', v_mode,
    'mode_paiement', v_payment,
    'frais_livraison', v_shipping,
    'created_at', now(),
    'stock_alerts', v_stock_alerts
  );
end;
$$;

revoke all on function public.create_order(text,text,text,text,text,text,jsonb,text,numeric,text,text,text,text) from public;
grant execute on function public.create_order(text,text,text,text,text,text,jsonb,text,numeric,text,text,text,text) to anon, authenticated;

create or replace function public.guard_public_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers jsonb;
  v_ip text;
  v_identity_hash text;
  v_product_key text;
  v_count integer;
begin
  if auth.uid() is not null and public.is_admin() then
    return new;
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
    v_ip := trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1));
    if v_ip is null or v_ip = '' then
      v_ip := trim(v_headers->>'cf-connecting-ip');
    end if;
    if v_ip is not null and v_ip <> '' then
      begin
        perform v_ip::inet;
      exception when others then
        v_ip := null;
      end;
    end if;
  exception when others then
    v_ip := null;
  end;

  delete from private.review_rate_limits where request_at < now() - interval '24 hours';

  if v_ip is not null then
    v_identity_hash := encode(digest('ip:' || v_ip, 'sha256'), 'hex');
    perform pg_advisory_xact_lock(hashtext('wazyo-review-rate:' || v_identity_hash));
    select count(*) into v_count
    from private.review_rate_limits
    where scope = 'global' and key_hash = v_identity_hash
      and request_at >= now() - interval '15 minutes';
    if v_count >= 8 then
      raise exception 'Trop de tentatives d''avis. Réessayez plus tard.';
    end if;

    v_product_key := encode(digest('ip-product:' || v_ip || ':' || new.product_id::text, 'sha256'), 'hex');
    select count(*) into v_count
    from private.review_rate_limits
    where scope = 'product' and key_hash = v_product_key
      and request_at >= now() - interval '24 hours';
    if v_count >= 1 then
      raise exception 'Un avis a déjà été envoyé pour ce produit récemment.';
    end if;

    insert into private.review_rate_limits(key_hash, scope, product_id)
    values (v_identity_hash, 'global', new.product_id);
    insert into private.review_rate_limits(key_hash, scope, product_id)
    values (v_product_key, 'product', new.product_id);
  else
    v_identity_hash := encode(digest('name-product:' || lower(trim(new.nom)) || ':' || new.product_id::text, 'sha256'), 'hex');
    perform pg_advisory_xact_lock(hashtext('wazyo-review-rate:' || v_identity_hash));
    select count(*) into v_count
    from private.review_rate_limits
    where scope = 'fallback' and key_hash = v_identity_hash
      and request_at >= now() - interval '24 hours';
    if v_count >= 1 then
      raise exception 'Un avis a déjà été envoyé pour ce produit récemment.';
    end if;
    insert into private.review_rate_limits(key_hash, scope, product_id)
    values (v_identity_hash, 'fallback', new.product_id);
  end if;

  select count(*) into v_count
  from public.reviews
  where product_id = new.product_id
    and lower(regexp_replace(trim(commentaire), '\s+', ' ', 'g')) = lower(regexp_replace(trim(new.commentaire), '\s+', ' ', 'g'))
    and created_at >= now() - interval '24 hours';
  if v_count >= 1 then
    raise exception 'Cet avis existe déjà.';
  end if;

  return new;
end;
$$;
revoke all on function public.guard_public_review_insert() from public;
drop trigger if exists trg_guard_public_review_insert on public.reviews;
create trigger trg_guard_public_review_insert
before insert on public.reviews
for each row execute function public.guard_public_review_insert();
