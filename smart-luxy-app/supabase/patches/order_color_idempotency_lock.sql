-- WAZYO — serialize color-variant order retries
-- Apply only after supabase/feature_compatibility_preflight.sql confirms that
-- public.create_order_with_colors(...) exists with this signature.
--
-- The wrapper checks request_fingerprint before delegating to create_order().
-- Without the same advisory transaction lock, two simultaneous identical
-- requests can both pass that check; the second base call returns the first
-- order, but the wrapper then decrements the selected color stock again.
--
-- This patch adds the same idempotency lock used by create_order() before the
-- wrapper's duplicate lookup. It does not change prices, delivery, promotions,
-- order contents, existing orders, or stock values.

begin;

do $patch$
declare
  v_function regprocedure :=
    to_regprocedure('public.create_order_with_colors(text,text,text,text,text,text,jsonb,text,numeric,text,text,text,text)');
  v_definition text;
  v_anchor text := '-- IMPORTANT: return an already-created identical order immediately.';
  v_lock text :=
    '  perform pg_advisory_xact_lock(hashtext(''wazyo-order-idem:'' || v_request_fingerprint));'
    || E'\n\n';
  v_position integer;
begin
  if v_function is null then
    raise exception
      'Expected public.create_order_with_colors(...) was not found. No function was changed.';
  end if;

  select pg_get_functiondef(v_function) into v_definition;

  if position('wazyo-order-idem:' in v_definition) > 0 then
    raise notice 'Color-order idempotency lock is already present; no change needed.';
    return;
  end if;

  v_position := strpos(v_definition, v_anchor);
  if v_position = 0 then
    raise exception
      'The expected duplicate-check section was not found. No function was changed.';
  end if;

  v_definition := substring(v_definition from 1 for v_position - 1)
    || v_lock
    || substring(v_definition from v_position);
  execute v_definition;

  raise notice 'Color-order idempotency lock added successfully.';
end;
$patch$;

commit;
