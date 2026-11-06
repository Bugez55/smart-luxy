-- WAZYO — rate limiting for public affiliate click tracking.
-- Visitor offers still resolve when a rate threshold is reached; only the
-- analytics insert is skipped. Raw IP addresses are never stored.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.affiliate_click_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null,
  updated_at timestamptz not null
);

alter table private.affiliate_click_rate_limits enable row level security;
revoke all on table private.affiliate_click_rate_limits from public, anon, authenticated, service_role;

create or replace function private.consume_affiliate_click_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 500
     or p_window_seconds < 1 or p_window_seconds > 3600 then
    return false;
  end if;

  insert into private.affiliate_click_rate_limits as current_rate (
    key_hash, window_started_at, request_count, updated_at
  )
  values (p_key_hash, v_now, 1, v_now)
  on conflict (key_hash) do update set
    window_started_at = case
      when current_rate.window_started_at
        <= v_now - (p_window_seconds * interval '1 second')
      then v_now else current_rate.window_started_at end,
    request_count = case
      when current_rate.window_started_at
        <= v_now - (p_window_seconds * interval '1 second')
      then 1 else current_rate.request_count + 1 end,
    updated_at = v_now
  returning request_count into v_count;

  if pg_catalog.random() < 0.01 then
    delete from private.affiliate_click_rate_limits
    where updated_at < v_now - interval '7 days';
  end if;

  return v_count <= p_limit;
end;
$function$;

revoke all on function private.consume_affiliate_click_rate_limit(text, integer, integer)
  from public, anon, authenticated, service_role;

create or replace function public.track_affiliate_click(
  p_code text,
  p_visitor_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $function$
declare
  v_link record;
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_ip_hash text;
  v_visitor_hash text;
  v_valid_visitor boolean := false;
  v_allow_click boolean := true;
begin
  -- The browser-supplied visitor key is only for de-duplication, not identity.
  v_valid_visitor :=
    p_visitor_key is not null
    and length(btrim(p_visitor_key)) between 16 and 64
    and btrim(p_visitor_key) ~ '^[A-Za-z0-9-]+$';

  begin
    v_headers := coalesce(
      nullif(current_setting('request.headers', true), ''),
      '{}'
    )::jsonb;

    v_ip := trim(split_part(
      coalesce(
        v_headers->>'x-forwarded-for',
        v_headers->>'cf-connecting-ip',
        v_headers->>'x-real-ip',
        ''
      ),
      ',',
      1
    ));

    if v_ip is not null and v_ip <> '' then
      begin
        v_ip := host(v_ip::inet);
      exception when others then
        v_ip := null;
      end;
    end if;
  exception when others then
    v_ip := null;
  end;

  -- Best effort IP limit (60 per 10 minutes); Supabase gateway headers are
  -- used when available. Hash the address before storing the rate-limit key.
  if v_ip is not null then
    v_ip_hash := encode(
      digest('affiliate-click-ip:' || v_ip, 'sha256'),
      'hex'
    );

    if not private.consume_affiliate_click_rate_limit(v_ip_hash, 60, 600) then
      v_allow_click := false;
    end if;
  end if;

  -- Secondary browser-key limit (12 per 10 minutes). This is not a substitute
  -- for an IP limit, but reduces accidental or repeated calls from one client.
  if v_valid_visitor then
    v_visitor_hash := encode(
      digest('affiliate-click-visitor:' || lower(btrim(p_visitor_key)), 'sha256'),
      'hex'
    );

    if not private.consume_affiliate_click_rate_limit(v_visitor_hash, 12, 600) then
      v_allow_click := false;
    end if;
  else
    v_allow_click := false;
  end if;

  select
    al.id,
    al.code,
    al.product_id,
    al.discount_percent,
    i.name as influencer_name,
    p.nom as product_name
  into v_link
  from public.affiliate_links al
  join public.influencers i on i.id = al.influencer_id
  join public.products p on p.id = al.product_id
  where al.code = upper(btrim(coalesce(p_code, '')))
    and al.active = true
    and i.active = true
    and p.is_active = true
    and (al.starts_at is null or al.starts_at <= now())
    and (al.ends_at is null or al.ends_at >= now())
  limit 1;

  if not found then
    return null;
  end if;

  if v_allow_click then
    insert into public.affiliate_clicks(link_id, visitor_key, click_day)
    values (v_link.id, lower(btrim(p_visitor_key)), current_date)
    on conflict (link_id, visitor_key, click_day) do nothing;
  end if;

  -- Do not block a valid discount merely because an analytics limit was hit.
  return jsonb_build_object(
    'id', v_link.id,
    'code', v_link.code,
    'product_id', v_link.product_id,
    'discount_percent', v_link.discount_percent,
    'influencer_name', v_link.influencer_name,
    'product_name', v_link.product_name
  );
end;
$function$;

revoke all on function public.track_affiliate_click(text, text) from public;
grant execute on function public.track_affiliate_click(text, text)
  to anon, authenticated, service_role;

commit;
