-- WAZYO — Functional fixes (2026-11)
-- Apply after schema.sql + security_patch.sql on existing projects.
-- Idempotent: safe to rerun. Does not modify existing shipping-rate values.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1) Shipping fees remain editable in the admin panel.
-- Public storefronts read only the rate columns through this SECURITY DEFINER RPC.
create or replace function public.get_public_shipping_rates()
returns table (
  wilaya text,
  bureau numeric(12,2),
  domicile numeric(12,2)
)
language sql
stable
security definer
set search_path = public
as $$
  select r.wilaya, r.bureau, r.domicile
  from public.shipping_rates r
  order by r.wilaya;
$$;

revoke all on function public.get_public_shipping_rates() from public;
grant execute on function public.get_public_shipping_rates() to anon, authenticated;

-- 2) Meta CAPI: columns and a persistent, shared Lead rate limiter.
alter table public.orders
  add column if not exists purchase_event_claimed_at timestamptz;

create table if not exists private.meta_capi_lead_rate_limits (
  ip_hash text not null,
  request_at timestamptz not null default now()
);

create index if not exists idx_meta_capi_lead_rate_limits_hash_time
  on private.meta_capi_lead_rate_limits(ip_hash, request_at desc);

revoke all on private.meta_capi_lead_rate_limits from public, anon, authenticated;

create or replace function public.consume_meta_capi_lead_rate_limit(
  p_ip_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 or length(p_ip_hash) > 128 then
    raise exception 'Invalid rate-limit key';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit parameters';
  end if;

  perform pg_advisory_xact_lock(hashtext('wazyo-meta-lead:' || p_ip_hash));

  delete from private.meta_capi_lead_rate_limits
  where request_at < now() - interval '1 day';

  select count(*) into v_count
  from private.meta_capi_lead_rate_limits
  where ip_hash = p_ip_hash
    and request_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into private.meta_capi_lead_rate_limits(ip_hash)
  values (p_ip_hash);

  return true;
end;
$$;

revoke all on function public.consume_meta_capi_lead_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_meta_capi_lead_rate_limit(text, integer, integer) to service_role;

-- 3) Yalidine reconciliation: update the order only after the parcel is recorded.
create or replace function public.reconcile_yalidine_order(
  p_order_id text,
  p_tracking_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_order_id text := upper(trim(coalesce(p_order_id, '')));
  v_tracking text := trim(coalesce(p_tracking_code, ''));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator authorization required';
  end if;

  if v_order_id !~ '^SL-[A-Z0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'Numéro de commande invalide.');
  end if;

  if v_tracking = '' or length(v_tracking) > 120 then
    return jsonb_build_object('ok', false, 'error', 'Numéro de suivi invalide.');
  end if;

  select * into v_order
  from public.orders
  where id = v_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Commande introuvable.');
  end if;

  if v_order.statut = 'shipped'
     and v_order.tracking_code = v_tracking
     and lower(coalesce(v_order.livraison_company, '')) = 'yalidine' then
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  if v_order.statut not in ('new', 'confirmed') then
    return jsonb_build_object(
      'ok', false,
      'conflict', true,
      'error', 'La commande a changé de statut. Vérification manuelle requise.'
    );
  end if;

  if v_order.tracking_code is not null and trim(v_order.tracking_code) <> ''
     and v_order.tracking_code <> v_tracking then
    return jsonb_build_object(
      'ok', false,
      'conflict', true,
      'error', 'Un autre numéro de suivi est déjà associé à cette commande.'
    );
  end if;

  update public.orders
  set tracking_code = v_tracking,
      livraison_company = 'Yalidine',
      statut = 'shipped'
  where id = v_order_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.reconcile_yalidine_order(text, text) from public, anon;
grant execute on function public.reconcile_yalidine_order(text, text) to authenticated;

-- 4) Durable one-time Telegram notification claims.
alter table public.orders
  add column if not exists telegram_notification_claimed_at timestamptz,
  add column if not exists telegram_notified_at timestamptz;

-- 5) Match the importer limits and formats accepted by Storage.
insert into storage.buckets as current_bucket (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  6291456,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = greatest(coalesce(current_bucket.file_size_limit, 0), excluded.file_size_limit),
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[];


-- 6) Rate-limit public tracking lookups without exposing customer contact details.
create table if not exists private.order_tracking_rate_limits (
  key_hash text not null,
  request_at timestamptz not null default now()
);
create index if not exists idx_order_tracking_rate_limits_key_time
  on private.order_tracking_rate_limits(key_hash, request_at desc);
revoke all on private.order_tracking_rate_limits from public, anon, authenticated;

create or replace function public.get_order_tracking(p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  o public.orders;
  v_headers jsonb;
  v_ip text;
  v_key text;
  v_count integer;
begin
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

  if v_ip is not null then
    v_key := encode(digest('tracking-ip:' || v_ip, 'sha256'), 'hex');
    perform pg_advisory_xact_lock(hashtext('wazyo-tracking:' || v_key));
    delete from private.order_tracking_rate_limits
    where request_at < now() - interval '30 minutes';

    select count(*) into v_count
    from private.order_tracking_rate_limits
    where key_hash = v_key
      and request_at >= now() - interval '10 minutes';

    if v_count >= 30 then
      raise exception 'Trop de tentatives de suivi. Réessaie dans quelques minutes.';
    end if;

    insert into private.order_tracking_rate_limits(key_hash)
    values (v_key);
  end if;

  select * into o
  from public.orders
  where id = upper(trim(coalesce(p_order_id, '')));

  if not found then
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
$$;

revoke all on function public.get_order_tracking(text) from public;
grant execute on function public.get_order_tracking(text) to anon, authenticated;

commit;
