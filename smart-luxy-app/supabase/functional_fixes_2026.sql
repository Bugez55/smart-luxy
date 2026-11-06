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

-- 1b) Public rates: invoker rights, constrained to the three public tariff columns.
-- The production table already has SELECT grants and a public-read RLS policy.
create or replace function public.get_public_shipping_rates()
returns table (
  wilaya text,
  bureau numeric(12,2),
  domicile numeric(12,2)
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select r.wilaya, r.bureau, r.domicile
  from public.shipping_rates r
  order by r.wilaya;
$$;

revoke all on function public.get_public_shipping_rates() from public;
grant execute on function public.get_public_shipping_rates() to anon, authenticated;

-- 2) Meta CAPI: preserve the existing shared Lead rate limiter; add only the missing Purchase claim column.
alter table public.orders
  add column if not exists purchase_event_claimed_at timestamptz;

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
    allowed_mime_types = (
      select array_agg(distinct allowed.mime_type order by allowed.mime_type)
      from unnest(
        coalesce(current_bucket.allowed_mime_types, array[]::text[])
        || excluded.allowed_mime_types
      ) as allowed(mime_type)
    );


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
set search_path = public, private, extensions, pg_temp
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


-- 7) Remove legacy permissive policies that bypass the admin allowlist.
-- The matching admin-only policies remain in place and continue to protect the panel.
drop policy if exists "admin products all" on public.products;
drop policy if exists "admin orders all" on public.orders;
drop policy if exists "admin client_notes" on public.client_notes;

-- Only active banners are public. Management remains restricted to is_admin().
drop policy if exists "banner admin" on public.banner_messages;
drop policy if exists "banner read" on public.banner_messages;

-- Public settings reads stay available through the key-filtered policy
-- "settings read public"; public writes and unfiltered reads are removed.
drop policy if exists "settings update" on public.settings;
drop policy if exists "settings upsert" on public.settings;
drop policy if exists "settings write" on public.settings;
drop policy if exists "public read settings" on public.settings;

-- Product image reads remain public; uploads/updates/deletes require is_admin().
drop policy if exists "admin upload images" on storage.objects;
drop policy if exists "admin update images" on storage.objects;
drop policy if exists "admin delete images" on storage.objects;

-- Retire the old plaintext-password verifier. The storefront now uses Supabase Auth.
revoke all on function public.verify_admin_password(text) from public, anon, authenticated;

-- These RPCs are admin-panel operations; their bodies also enforce is_admin().
revoke all on function public.create_affiliate_link_admin(
  bigint, bigint, text, numeric, numeric, timestamptz, timestamptz
) from public, anon;
grant execute on function public.create_affiliate_link_admin(
  bigint, bigint, text, numeric, numeric, timestamptz, timestamptz
) to authenticated;

revoke all on function public.get_affiliate_financial_dashboard() from public, anon;
grant execute on function public.get_affiliate_financial_dashboard() to authenticated;


-- 8) Keep trigger-only SECURITY DEFINER helpers out of the PostgREST RPC surface.
-- PostgreSQL triggers continue to invoke their bound functions; direct EXECUTE
-- grants are not needed by storefront or admin clients.
revoke all on function public.check_order_rate_limit() from public, anon, authenticated;
revoke all on function public.check_order_total() from public, anon, authenticated;
revoke all on function public.compute_order_total(jsonb, numeric) from public, anon, authenticated;
revoke all on function public.enforce_order_status_and_restore_stock() from public, anon, authenticated;
revoke all on function public.enforce_order_status_workflow() from public, anon, authenticated;
revoke all on function public.guard_public_review_insert() from public, anon, authenticated;
revoke all on function public.increment_product_order_count() from public, anon, authenticated;
revoke all on function public.restore_color_stock_on_cancel() from public, anon, authenticated;
revoke all on function public.restore_color_stock_on_delete() from public, anon, authenticated;
revoke all on function public.restore_model_stock_on_cancel() from public, anon, authenticated;
revoke all on function public.restore_model_stock_on_delete() from public, anon, authenticated;
revoke all on function public.restore_stock_on_delete() from public, anon, authenticated;
revoke all on function public.set_order_client_id() from public, anon, authenticated;
revoke all on function public.snapshot_affiliate_financials() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Admin identity and legacy admin-only dashboard must not be exposed to guests.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.get_affiliate_dashboard() from public, anon;
grant execute on function public.get_affiliate_dashboard() to authenticated;

-- Fixed, deterministic path for the shipment timestamp trigger.
alter function public.touch_shipping_dispatch_updated_at()
  set search_path = pg_catalog, public;


-- 9) Legacy affiliate RLS policies must target authenticated admins only.
-- Older production databases created these tables/policies outside schema.sql.
-- Keep this compatibility block conditional so clean installs without the
-- optional affiliate module do not fail.
do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'influencers' and policyname = 'influencers_admin_all') then
    execute 'alter policy influencers_admin_all on public.influencers to authenticated';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'affiliate_links' and policyname = 'affiliate_links_admin_all') then
    execute 'alter policy affiliate_links_admin_all on public.affiliate_links to authenticated';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'affiliate_clicks' and policyname = 'affiliate_clicks_admin_all') then
    execute 'alter policy affiliate_clicks_admin_all on public.affiliate_clicks to authenticated';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'affiliate_order_attributions' and policyname = 'affiliate_order_attributions_admin_all') then
    execute 'alter policy affiliate_order_attributions_admin_all on public.affiliate_order_attributions to authenticated';
  end if;
end
$$;


-- 10) Public settings are allow-listed, never block-listed.
-- New settings are private by default until deliberately added here.
begin;
alter policy "settings read public"
  on public.settings
  using (
    key = any (array[
      'baridimob_actif',
      'baridimob_numero',
      'ccp_actif',
      'ccp_nom',
      'ccp_numero',
      'custom_themes',
      'free_ship',
      'hero_media_type',
      'hero_media_url',
      'maintenance',
      'shop_address',
      'shop_email',
      'shop_name',
      'shop_phone',
      'theme_accent',
      'theme_bg',
      'theme_card',
      'theme_preset',
      'theme_text',
      'theme_text_sub'
    ]::text[])
  );
commit;
