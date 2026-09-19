-- ================================================================
-- WAZYO — Supabase production schema / security baseline
-- IMPORTANT:
-- 1) Run this file in Supabase SQL Editor.
-- 2) Create the admin user first in Supabase Authentication.
-- 3) Then add that user's UUID to public.admin_users with:
--    insert into public.admin_users(user_id) values ('YOUR-AUTH-USER-UUID');
-- ================================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                 bigserial primary key,
  nom                text not null,
  prix               numeric(12,2) not null check (prix >= 0),
  prix_old           numeric(12,2),
  cout_achat         numeric(12,2),
  frais_liv_est      numeric(12,2),
  ads_cout_da        numeric(12,2),
  taux_confirmation  numeric(5,2) default 60,
  taux_livraison     numeric(5,2) default 60,
  cout_stockage      numeric(12,2),
  cout_retour        numeric(12,2),
  categorie          text,
  badge              text,
  emoji              text default '📦',
  img                text,
  images             jsonb default '[]'::jsonb,
  images_gallery     jsonb,
  description        text,
  specs              jsonb default '[]'::jsonb,
  display_order      integer default 99,
  is_active          boolean default true,
  stock              integer,
  stock_initial      integer,
  video_url          text,
  display_mode       text default 'scroll',
  card_color         text,
  ventes             integer default 0,
  note_etoiles       numeric(3,2) default 5,
  nb_commandes      integer default 0,
  bundles            jsonb,
  faq                jsonb,
  created_at         timestamptz default now()
);

alter table public.products add column if not exists cout_achat numeric(12,2);
alter table public.products add column if not exists frais_liv_est numeric(12,2);
alter table public.products add column if not exists ads_cout_da numeric(12,2);
alter table public.products add column if not exists taux_confirmation numeric(5,2) default 60;
alter table public.products add column if not exists taux_livraison numeric(5,2) default 60;
alter table public.products add column if not exists cout_stockage numeric(12,2);
alter table public.products add column if not exists cout_retour numeric(12,2);
alter table public.products add column if not exists images_gallery jsonb;
alter table public.products add column if not exists stock integer;
alter table public.products add column if not exists stock_initial integer;
alter table public.products add column if not exists video_url text;
alter table public.products add column if not exists display_mode text default 'scroll';
alter table public.products add column if not exists card_color text;
alter table public.products add column if not exists ventes integer default 0;
alter table public.products add column if not exists note_etoiles numeric(3,2) default 5;
alter table public.products add column if not exists nb_commandes integer default 0;
alter table public.products add column if not exists bundles jsonb;
alter table public.products add column if not exists faq jsonb;

-- ─────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                    text primary key,
  nom_client            text not null,
  telephone             text not null,
  wilaya                text not null,
  commune               text not null,
  adresse               text,
  note                  text,
  items                 jsonb not null default '[]'::jsonb,
  sous_total            numeric(12,2) not null default 0,
  promo_code            text,
  promo_reduction       numeric(12,2) not null default 0,
  total                 numeric(12,2) not null default 0,
  statut                text not null default 'new',
  mode_livraison        text not null default 'domicile',
  mode_paiement         text default 'livraison',
  frais_livraison       numeric(12,2) not null default 0,
  fbc                   text,
  fbp                   text,
  tracking_code         text,
  livraison_company     text,
  purchase_event_sent_at timestamptz,
  created_at            timestamptz default now()
);

alter table public.orders add column if not exists sous_total numeric(12,2) not null default 0;
alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists promo_reduction numeric(12,2) not null default 0;
alter table public.orders add column if not exists mode_paiement text default 'livraison';
alter table public.orders add column if not exists tracking_code text;
alter table public.orders add column if not exists livraison_company text;
alter table public.orders add column if not exists purchase_event_sent_at timestamptz;
alter table public.orders add column if not exists stock_restored_at timestamptz;
alter table public.orders add column if not exists fbc text;
alter table public.orders add column if not exists fbp text;

alter table public.orders drop constraint if exists orders_statut_check;
alter table public.orders
  add constraint orders_statut_check
  check (statut in ('new','confirmed','shipped','delivered','cancelled'));

create or replace function public.restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  qty integer;
  product_id bigint;
begin
  if old.statut = 'cancelled' and new.statut <> 'cancelled' then
    raise exception 'Une commande annulée ne peut pas être réactivée';
  end if;

  if new.statut = 'cancelled'
     and old.statut <> 'cancelled'
     and old.statut in ('new','confirmed')
     and new.stock_restored_at is null then
    for item in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
      product_id := nullif(item->>'id', '')::bigint;
      qty := greatest(0, coalesce((item->>'qty')::integer, 0));
      if product_id is not null and qty > 0 then
        update public.products
        set stock = case when stock is null then null else stock + qty end
        where id = product_id;
      end if;
    end loop;
    new.stock_restored_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_restore_stock_on_cancel on public.orders;
create trigger trg_restore_stock_on_cancel
before update of statut on public.orders
for each row execute function public.restore_stock_on_cancel();

create or replace function public.restore_stock_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  qty integer;
  product_id bigint;
begin
  if old.statut in ('new','confirmed') and old.stock_restored_at is null then
    for item in select * from jsonb_array_elements(coalesce(old.items, '[]'::jsonb)) loop
      product_id := nullif(item->>'id', '')::bigint;
      qty := greatest(0, coalesce((item->>'qty')::integer, 0));
      if product_id is not null and qty > 0 then
        update public.products
        set stock = case when stock is null then null else stock + qty end
        where id = product_id;
      end if;
    end loop;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_restore_stock_on_delete on public.orders;
create trigger trg_restore_stock_on_delete
before delete on public.orders
for each row execute function public.restore_stock_on_delete();

-- ─────────────────────────────────────────────────────────────
-- PROMOS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.promos (
  id         bigserial primary key,
  code       text not null unique,
  reduction  numeric(5,2) not null check (reduction > 0 and reduction <= 100),
  max_uses   integer,
  uses       integer not null default 0 check (uses >= 0),
  actif      boolean not null default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id           bigserial primary key,
  product_id   bigint not null references public.products(id) on delete cascade,
  nom          text not null,
  note         integer not null check (note between 1 and 5),
  commentaire  text not null,
  photo        text,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- SETTINGS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz default now()
);

insert into public.settings(key, value) values
  ('shop_name', 'Wazyo'),
  ('shop_phone', '213556688810'),
  ('shop_email', 'smartluxydz@gmail.com'),
  ('shop_address', 'Tizi Ouzou, Algérie'),
  ('free_ship', ''),
  ('maintenance', 'false'),
  ('ccp_numero', ''),
  ('ccp_nom', ''),
  ('baridimob_numero', ''),
  ('ccp_actif', 'false'),
  ('baridimob_actif', 'false')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- BANNER MESSAGES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.banner_messages (
  id         bigserial primary key,
  message    text not null,
  actif      boolean not null default true,
  position   integer not null default 99,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- CLIENT NOTES (ADMIN ONLY)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_notes (
  telephone   text primary key,
  note        text default '',
  tag         text,
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- ADMIN ALLOWLIST
-- ─────────────────────────────────────────────────────────────
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

-- Admin can read only their own allowlist row.
drop policy if exists "admin can read own allowlist row" on public.admin_users;
create policy "admin can read own allowlist row"
  on public.admin_users
  for select to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- SHIPPING RATES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.shipping_rates (
  wilaya     text primary key,
  bureau     numeric(12,2) not null default 0,
  domicile   numeric(12,2) not null default 0
);

insert into public.shipping_rates (wilaya, bureau, domicile) values
  ("Adrar", 1000, 1600),
  ("Chlef", 400, 800),
  ("Laghouat", 600, 1100),
  ("Oum El Bouaghi", 400, 950),
  ("Batna", 400, 950),
  ("B\u00e9ja\u00efa", 400, 850),
  ("Biskra", 600, 1100),
  ("B\u00e9char", 750, 1400),
  ("Blida", 400, 800),
  ("Bouira", 400, 850),
  ("Tamanrasset", 1000, 1800),
  ("T\u00e9bessa", 600, 1100),
  ("Tlemcen", 400, 850),
  ("Tiaret", 400, 850),
  ("Tizi Ouzou", 0, 300),
  ("Alger", 300, 750),
  ("Djelfa", 600, 1100),
  ("Jijel", 400, 950),
  ("S\u00e9tif", 400, 900),
  ("Sa\u00efda", 400, 850),
  ("Skikda", 400, 950),
  ("Sidi Bel Abb\u00e8s", 400, 850),
  ("Annaba", 400, 900),
  ("Guelma", 400, 950),
  ("Constantine", 400, 900),
  ("M\u00e9d\u00e9a", 400, 850),
  ("Mostaganem", 400, 800),
  ("M'Sila", 400, 900),
  ("Mascara", 400, 850),
  ("Ouargla", 750, 1200),
  ("Oran", 400, 850),
  ("El Bayadh", 400, 900),
  ("Illizi", 1500, 1900),
  ("Bordj Bou Arr\u00e9ridj", 400, 900),
  ("Boumerd\u00e8s", 400, 850),
  ("El Tarf", 400, 1000),
  ("Tindouf", 1500, 1900),
  ("Tissemsilt", 400, 850),
  ("El Oued", 750, 1200),
  ("Khenchela", 600, 1000),
  ("Souk Ahras", 600, 1000),
  ("Tipaza", 400, 850),
  ("Mila", 400, 950),
  ("A\u00efn Defla", 400, 850),
  ("Na\u00e2ma", 600, 1200),
  ("A\u00efn T\u00e9mouchent", 400, 850),
  ("Gharda\u00efa", 750, 1200),
  ("Relizane", 400, 800),
  ("Timimoun", 1000, 1600),
  ("Bordj Badji Mokhtar", 1500, 1900),
  ("Ouled Djellal", 600, 1100),
  ("B\u00e9ni Abb\u00e8s", 750, 1400),
  ("In Salah", 1000, 1800),
  ("In Guezzam", 1500, 1900),
  ("Touggourt", 750, 1200),
  ("Djanet", 1500, 1900),
  ("El M'Ghair", 750, 1200),
  ("El Meniaa", 750, 1200),
  ("Aflou", 600, 1100),
  ("A\u00efn Oussera", 600, 1100),
  ("Barika", 400, 950),
  ("Bir El Ater", 600, 1100),
  ("Bou Sa\u00e2da", 400, 900),
  ("El Abiodh Sidi Cheikh", 400, 900),
  ("El Aricha", 400, 850),
  ("El Kantara", 600, 1100),
  ("Ksar Chellala", 400, 850),
  ("Ksar El Boukhari", 400, 850),
  ("Messaad", 600, 1100)
on conflict (wilaya) do update
set bureau = excluded.bureau, domicile = excluded.domicile;

-- ─────────────────────────────────────────────────────────────
-- ADMIN CHECK
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.promos enable row level security;
alter table public.reviews enable row level security;
alter table public.settings enable row level security;
alter table public.banner_messages enable row level security;
alter table public.client_notes enable row level security;
alter table public.shipping_rates enable row level security;

-- Products: public can only read active products; admins manage all.
drop policy if exists "public read active products" on public.products;
drop policy if exists "admin manage products" on public.products;
create policy "public read active products"
  on public.products for select to anon, authenticated
  using (is_active = true);
create policy "admin manage products"
  on public.products for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Orders: public cannot query/update them directly. Creation/tracking use RPCs.
drop policy if exists "admin manage orders" on public.orders;
create policy "admin manage orders"
  on public.orders for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Promos: public validation uses validate_promo(); only admins can read/write table.
drop policy if exists "admin manage promos" on public.promos;
create policy "admin manage promos"
  on public.promos for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Reviews: public can read/write their own submitted reviews; admin can manage.
drop policy if exists "public read reviews" on public.reviews;
drop policy if exists "public insert reviews" on public.reviews;
drop policy if exists "admin manage reviews" on public.reviews;
create policy "public read reviews"
  on public.reviews for select to anon, authenticated
  using (true);
create policy "public insert reviews"
  on public.reviews for insert to anon, authenticated
  with check (
    char_length(trim(nom)) between 1 and 80
    and char_length(trim(commentaire)) between 1 and 1200
    and note between 1 and 5
  );
create policy "admin manage reviews"
  on public.reviews for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Settings: values are intentionally public because the storefront reads them.
drop policy if exists "public read settings" on public.settings;
drop policy if exists "admin manage settings" on public.settings;
create policy "public read settings"
  on public.settings for select to anon, authenticated
  using (true);
create policy "admin manage settings"
  on public.settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Banner: public sees only active messages.
drop policy if exists "public read active banners" on public.banner_messages;
drop policy if exists "admin manage banners" on public.banner_messages;
create policy "public read active banners"
  on public.banner_messages for select to anon, authenticated
  using (actif = true);
create policy "admin manage banners"
  on public.banner_messages for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Client notes: admin only.
drop policy if exists "admin manage client notes" on public.client_notes;
create policy "admin manage client notes"
  on public.client_notes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Shipping rates: storefront uses create_order RPC, admin can inspect/update.
drop policy if exists "admin manage shipping rates" on public.shipping_rates;
create policy "admin manage shipping rates"
  on public.shipping_rates for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- TRACKING RPC — never returns phone/address/name
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_order_tracking(p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  select * into o
  from public.orders
  where id = upper(trim(p_order_id));

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

-- ─────────────────────────────────────────────────────────────
-- PROMO VALIDATION RPC — reveals only the requested promo code
-- ─────────────────────────────────────────────────────────────
create or replace function public.validate_promo(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.promos;
begin
  select * into p
  from public.promos
  where code = upper(trim(p_code))
    and actif = true
    and (max_uses is null or uses < max_uses)
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'code', p.code,
    'reduction', p.reduction,
    'discount', round(greatest(coalesce(p_subtotal, 0), 0) * p.reduction / 100.0)
  );
end;
$$;

revoke all on function public.validate_promo(text, numeric) from public;
grant execute on function public.validate_promo(text, numeric) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- ORDER CREATION RPC
-- Recalculates product prices, validates stock, shipping and promo
-- atomically, then decrements stock in the same transaction.
-- ─────────────────────────────────────────────────────────────
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
begin
  if length(trim(coalesce(p_nom_client,''))) not between 2 and 120 then
    raise exception 'Nom invalide';
  end if;

  if regexp_replace(coalesce(p_telephone,''), '\D', '', 'g') !~ '^0[0-9]{9}$' then
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

  v_wilaya := regexp_replace(trim(p_wilaya), '^\d+\s*—\s*', '');

  select
    case when v_mode = 'bureau' then bureau else domicile end
  into v_shipping
  from public.shipping_rates
  where lower(wilaya) = lower(v_wilaya);

  if v_shipping is null then
    raise exception 'Tarif de livraison indisponible pour cette wilaya';
  end if;

  select trim(value) into v_free_ship_text
  from public.settings
  where key = 'free_ship';

  if v_free_ship_text is not null and v_free_ship_text ~ '^[0-9]+(\.[0-9]+)?$' then
    v_free_ship := v_free_ship_text::numeric;
  end if;

  -- Aggregate duplicate product lines and lock rows in ID order.
  for v_line in
    select
      (value->>'id')::bigint as product_id,
      sum((value->>'qty')::integer)::integer as qty
    from jsonb_array_elements(p_items) as x(value)
    group by (value->>'id')::bigint
    order by (value->>'id')::bigint
  loop
    if v_line.product_id is null or v_line.qty is null or v_line.qty < 1 or v_line.qty > 50 then
      raise exception 'Quantité invalide';
    end if;

    select * into v_product
    from public.products
    where id = v_line.product_id
    for update;

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
      set
        stock = stock - v_line.qty,
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
    select *
    into v_promo
    from public.promos
    where code = upper(trim(p_promo_code))
      and actif = true
      and (max_uses is null or uses < max_uses)
    for update;

    if not found then
      raise exception 'Code promo invalide ou expiré';
    end if;

    v_discount := round(v_subtotal * v_promo.reduction / 100.0);

    update public.promos
    set uses = uses + 1
    where id = v_promo.id;
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + v_shipping;

  v_id := 'SL-' || upper(encode(gen_random_bytes(5), 'hex'));

  insert into public.orders (
    id, nom_client, telephone, wilaya, commune, adresse, note,
    items, sous_total, promo_code, promo_reduction, total, statut,
    mode_livraison, mode_paiement, frais_livraison, fbc, fbp
  )
  values (
    v_id, trim(p_nom_client), regexp_replace(trim(p_telephone), '\D', '', 'g'),
    trim(p_wilaya), trim(p_commune),
    left(coalesce(trim(p_adresse), ''), 2000),
    left(coalesce(trim(p_note), ''), 1200),
    v_items, v_subtotal,
    case when p_promo_code is null or trim(p_promo_code) = '' then null else upper(trim(p_promo_code)) end,
    v_discount, v_total, 'new',
    v_mode, v_payment, v_shipping,
    left(p_fbc, 500), left(p_fbp, 500)
  );

  return jsonb_build_object(
    'id', v_id,
    'nom_client', trim(p_nom_client),
    'telephone', regexp_replace(trim(p_telephone), '\D', '', 'g'),
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

revoke all on function public.create_order(text,text,text,text,text,text,jsonb,text,numeric,text,text,text) from public;
grant execute on function public.create_order(text,text,text,text,text,text,jsonb,text,numeric,text,text,text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- STORAGE
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']::text[];

drop policy if exists "public read product images" on storage.objects;
drop policy if exists "public review image upload" on storage.objects;
drop policy if exists "admin manage product images" on storage.objects;

create policy "public read product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "public review image upload"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'product-images'
    and name like 'reviews/%'
  );

create policy "admin manage product images"
  on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- DEMO PRODUCTS
-- Kept only for a new empty database.
-- ─────────────────────────────────────────────────────────────
insert into public.products (nom, prix, prix_old, categorie, badge, emoji, description, specs, display_order)
select *
from (values
  ('Mini Robot Culinaire 4-en-1', 2990::numeric, 4500::numeric, 'Cuisine', '⚡ Nouveau', '🔪',
   'Hachoir électrique + trancheur + éplucheur + brosse nettoyante. Sans fil, rechargeable USB-C, imperméable IPX5.',
   '["Fonctions : hachoir + trancheur + éplucheur + brosse", "Charge USB Type-C", "Imperméable IPX5", "Dimensions : 20.5×9.5 cm"]'::jsonb, 1),
  ('Friteuse à Air Chaud 5.5L', 3500::numeric, 5500::numeric, 'Cuisine', '🔥 Tendance', '🍟',
   'Friteuse sans huile 1800W, 8 programmes automatiques, bac antiadhésif lavable au lave-vaisselle.',
   '["Capacité 5.5L — 4 à 6 personnes", "Puissance 1800W", "8 programmes automatiques", "Bac lavable lave-vaisselle"]'::jsonb, 2)
) as seed(nom, prix, prix_old, categorie, badge, emoji, description, specs, display_order)
where not exists (select 1 from public.products);
