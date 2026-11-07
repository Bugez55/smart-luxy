-- WAZYO security hardening: keep influencer commission terms internal.
-- Public order RPCs still return the discount applied to the customer, but
-- no longer disclose the private commission rate or commission amount.

do $migration$
declare
  v_function record;
  v_definition text;
  v_old_fragment text := ',''affiliate_commission_percent'',v_link.commission_percent,''affiliate_commission_amount'',v_commission';
begin
  for v_function in
    select p.oid, n.nspname, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_order_with_affiliate',
        'create_order_with_colors_affiliate'
      )
  loop
    v_definition := pg_get_functiondef(v_function.oid);

    if position(v_old_fragment in v_definition) = 0 then
      raise exception 'Expected public commission fields not found in %. Review function before applying.', v_function.proname;
    end if;

    v_definition := replace(v_definition, v_old_fragment, '');
    execute v_definition;
  end loop;
end;
$migration$;
