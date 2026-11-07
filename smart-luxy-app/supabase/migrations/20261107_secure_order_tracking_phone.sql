-- WAZYO: require the order phone number before returning tracking details.
-- Existing order IDs remain unchanged; this is compatible with old orders.
-- Rate limiting is applied by order ID even when request IP headers are absent,
-- and additionally by IP whenever a valid proxy IP header is available.

begin;

create or replace function public.get_order_tracking(
  p_order_id text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'extensions', 'pg_temp'
as $function$
declare
  o public.orders;
  v_headers jsonb;
  v_ip text;
  v_id text := upper(trim(coalesce(p_order_id, '')));
  v_phone_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_order_phone_digits text;
  v_id_key text;
  v_ip_key text;
  v_id_count integer := 0;
  v_ip_count integer := 0;
begin
  -- Existing IDs are generated as SL- plus ten hexadecimal characters.
  if v_id !~ '^SL-[A-F0-9]{10}$' then
    return null;
  end if;

  -- Canonicalize Algerian local (0XXXXXXXXX) and international (213XXXXXXXXX)
  -- forms so the customer may enter the same number with or without its prefix.
  if left(v_phone_digits, 5) = '00213' and length(v_phone_digits) = 14 then
    v_phone_digits := substring(v_phone_digits from 6);
  elsif left(v_phone_digits, 3) = '213' and length(v_phone_digits) = 12 then
    v_phone_digits := substring(v_phone_digits from 4);
  elsif left(v_phone_digits, 1) = '0' and length(v_phone_digits) = 10 then
    v_phone_digits := substring(v_phone_digits from 2);
  end if;

  if length(v_phone_digits) < 9 or length(v_phone_digits) > 10 then
    return null;
  end if;

  v_id_key := encode(digest('tracking-order:' || v_id, 'sha256'), 'hex');

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
    v_ip := trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1));
    if v_ip is null or v_ip = '' then
      v_ip := trim(v_headers->>'cf-connecting-ip');
    end if;
    if v_ip is not null and v_ip <> '' then
      begin
        perform v_ip::inet;
        v_ip_key := encode(digest('tracking-ip:' || v_ip, 'sha256'), 'hex');
      exception when others then
        v_ip := null;
        v_ip_key := null;
      end;
    end if;
  exception when others then
    v_ip := null;
    v_ip_key := null;
  end;

  -- Serialize attempts per order ID and, when available, per IP.
  perform pg_advisory_xact_lock(hashtext('wazyo-tracking-order:' || v_id_key));
  if v_ip_key is not null then
    perform pg_advisory_xact_lock(hashtext('wazyo-tracking-ip:' || v_ip_key));
  end if;

  delete from private.order_tracking_rate_limits
  where request_at < now() - interval '30 minutes';

  select count(*) into v_id_count
  from private.order_tracking_rate_limits
  where key_hash = v_id_key
    and request_at >= now() - interval '10 minutes';

  if v_ip_key is not null then
    select count(*) into v_ip_count
    from private.order_tracking_rate_limits
    where key_hash = v_ip_key
      and request_at >= now() - interval '10 minutes';
  end if;

  if v_id_count >= 8 or v_ip_count >= 30 then
    raise exception 'Trop de tentatives de suivi. Réessaie dans quelques minutes.';
  end if;

  insert into private.order_tracking_rate_limits(key_hash) values (v_id_key);
  if v_ip_key is not null then
    insert into private.order_tracking_rate_limits(key_hash) values (v_ip_key);
  end if;

  select * into o
  from public.orders
  where id = v_id;

  if not found then
    return null;
  end if;

  v_order_phone_digits := regexp_replace(coalesce(o.telephone, ''), '\D', '', 'g');
  if left(v_order_phone_digits, 5) = '00213' and length(v_order_phone_digits) = 14 then
    v_order_phone_digits := substring(v_order_phone_digits from 6);
  elsif left(v_order_phone_digits, 3) = '213' and length(v_order_phone_digits) = 12 then
    v_order_phone_digits := substring(v_order_phone_digits from 4);
  elsif left(v_order_phone_digits, 1) = '0' and length(v_order_phone_digits) = 10 then
    v_order_phone_digits := substring(v_order_phone_digits from 2);
  end if;

  -- Same response for unknown order IDs and incorrect phone numbers.
  if v_order_phone_digits is null
     or v_order_phone_digits <> v_phone_digits then
    return null;
  end if;

  return jsonb_build_object(
    'id', o.id,
    'statut', o.statut,
    'created_at', o.created_at,
    'items', o.items,
    'sous_total', o.sous_total,
    'promo_code', o.promo_code,
    'promo_reduction', o.promo_reduction,
    'total', o.total,
    'mode_livraison', o.mode_livraison,
    'frais_livraison', o.frais_livraison,
    'wilaya', o.wilaya,
    'commune', o.commune,
    'tracking_code', o.tracking_code,
    'livraison_company', o.livraison_company
  );
end;
$function$;

revoke all on function public.get_order_tracking(text) from public, anon, authenticated;
revoke all on function public.get_order_tracking(text, text) from public;
grant execute on function public.get_order_tracking(text, text) to anon, authenticated;

drop function if exists public.get_order_tracking(text);

commit;
