-- WAZYO security hardening: keep influencer commission terms internal.
-- Public order RPCs still return the discount applied to the customer, but
-- no longer disclose the private commission rate or commission amount.
-- Idempotent: already-hardened functions are left unchanged.

do $migration$
declare
  v_function record;
  v_definition text;
  v_old_fragment text := ',''affiliate_commission_percent'',v_link.commission_percent,''affiliate_commission_amount'',v_commission';
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

    if position(v_old_fragment in v_definition) > 0 then
      v_definition := replace(v_definition, v_old_fragment, '');
      execute v_definition;
    end if;
  end loop;
end;
$migration$;

-- The models checkout RPC is a third public order endpoint. It stores the
-- commission internally in affiliate_order_attributions, but must not return
-- the commission rate or amount to an anonymous storefront caller.
do $model_privacy$
declare
  v_definition text;
  v_hardened_definition text;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_order_with_models';

  if v_definition is not null then
    -- Match the two adjacent JSON response fields independent of LF/CRLF.
    v_hardened_definition := regexp_replace(
      v_definition,
      E',\\r?\\n[[:space:]]*''affiliate_commission_percent''[^\\r\\n]*,\\r?\\n[[:space:]]*''affiliate_commission_amount''[^\\r\\n]*',
      '',
      'g'
    );

    -- The idempotent-order response has a commission amount field without
    -- the adjacent percent field, so remove that public JSON key separately.
    v_hardened_definition := regexp_replace(
      v_hardened_definition,
      E',\\r?\\n[[:space:]]*''affiliate_commission_amount''[^\\r\\n]*',
      '',
      'g'
    );

    if v_hardened_definition <> v_definition then
      execute v_hardened_definition;
    end if;
  end if;
end;
$model_privacy$;
