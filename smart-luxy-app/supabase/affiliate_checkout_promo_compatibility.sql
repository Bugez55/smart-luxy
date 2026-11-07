-- WAZYO — Affiliate checkout compatibility fix
-- Fixes affiliate checkout when the matching legacy promo row is inactive.
-- The affiliate link remains the source of truth for discount/commission.
-- The legacy promo row is temporarily enabled only inside the same transaction
-- so the existing order engine can apply its normal discount and stock logic.
-- Its active flag, max_uses and uses counter are restored before returning.
-- No production database is changed by committing this file.

begin;

do $migration$
declare
  v_function record;
  v_definition text;
  v_original_call text;
  v_replacement_call text;
  v_patched boolean := false;
begin
  for v_function in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_order_with_affiliate',
        'create_order_with_colors_affiliate'
      )
  loop
    v_definition := pg_get_functiondef(v_function.oid);

    -- Add saved promo state exactly once.
    if position('v_promo_was_active boolean' in v_definition) = 0 then
      if position('v_link record;' in v_definition) = 0 then
        raise exception 'Unexpected affiliate function declaration: %', v_function.proname;
      end if;
      v_definition := replace(
        v_definition,
        'v_link record;',
        'v_promo_was_active boolean; v_promo_max_uses integer; v_promo_uses integer; v_link record;'
      );
    end if;

    if v_function.proname = 'create_order_with_affiliate' then
      v_original_call := 'select public.create_order(p_nom_client,p_telephone,p_wilaya,p_commune,p_adresse,p_note,p_items,p_mode_livraison,p_frais_livraison,p_mode_paiement,v_link.code,p_fbc,p_fbp) into v_order;';
      v_replacement_call := $replacement$
select actif, max_uses, uses
  into v_promo_was_active, v_promo_max_uses, v_promo_uses
from public.promos
where code = upper(btrim(v_link.code))
for update;

if not found then
  raise exception 'Configuration promotionnelle interne absente pour le lien influenceur';
end if;

update public.promos
set actif = true, max_uses = null
where code = upper(btrim(v_link.code));

select public.create_order(
  p_nom_client,p_telephone,p_wilaya,p_commune,p_adresse,p_note,p_items,
  p_mode_livraison,p_frais_livraison,p_mode_paiement,v_link.code,p_fbc,p_fbp
) into v_order;

update public.promos
set actif = v_promo_was_active,
    max_uses = v_promo_max_uses,
    uses = v_promo_uses
where code = upper(btrim(v_link.code));
$replacement$;
    else
      v_original_call := 'select public.create_order_with_colors(p_nom_client,p_telephone,p_wilaya,p_commune,p_adresse,p_note,p_items,p_mode_livraison,p_frais_livraison,p_mode_paiement,v_link.code,p_fbc,p_fbp) into v_order;';
      v_replacement_call := $replacement$
select actif, max_uses, uses
  into v_promo_was_active, v_promo_max_uses, v_promo_uses
from public.promos
where code = upper(btrim(v_link.code))
for update;

if not found then
  raise exception 'Configuration promotionnelle interne absente pour le lien influenceur';
end if;

update public.promos
set actif = true, max_uses = null
where code = upper(btrim(v_link.code));

select public.create_order_with_colors(
  p_nom_client,p_telephone,p_wilaya,p_commune,p_adresse,p_note,p_items,
  p_mode_livraison,p_frais_livraison,p_mode_paiement,v_link.code,p_fbc,p_fbp
) into v_order;

update public.promos
set actif = v_promo_was_active,
    max_uses = v_promo_max_uses,
    uses = v_promo_uses
where code = upper(btrim(v_link.code));
$replacement$;
    end if;

    if position(v_original_call in v_definition) > 0 then
      v_definition := replace(v_definition, v_original_call, v_replacement_call);
      execute v_definition;
      v_patched := true;
    elsif position('v_promo_was_active boolean' in v_definition) = 0 then
      raise exception 'Expected order-engine call not found in %', v_function.proname;
    end if;
  end loop;

  if not v_patched then
    raise notice 'Affiliate checkout functions already patched or not installed; no function body changed.';
  end if;
end;
$migration$;

commit;
