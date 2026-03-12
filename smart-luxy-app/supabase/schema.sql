-- ══════════════════════════════════════════════════════════
-- SMART LUXY — Schéma Supabase
-- Coller dans : Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════

-- ── Table Products ────────────────────────────────────────
create table if not exists public.products (
  id            bigserial primary key,
  nom           text not null,
  prix          numeric not null,
  prix_old      numeric,
  categorie     text,
  badge         text,
  emoji         text default '📦',
  img           text,
  images        jsonb default '[]',
  desc          text,
  specs         jsonb default '[]',
  display_order integer default 99,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ── Table Orders ──────────────────────────────────────────
create table if not exists public.orders (
  id          text primary key,
  nom_client  text not null,
  telephone   text not null,
  wilaya      text not null,
  commune     text not null,
  adresse     text,
  note        text,
  items       jsonb not null default '[]',
  total       numeric not null default 0,
  statut      text not null default 'new',
  created_at  timestamptz default now()
);

-- ── RLS : accès public lecture produits ───────────────────
alter table public.products enable row level security;
alter table public.orders   enable row level security;

-- Produits : tout le monde peut lire les actifs
create policy "read active products"
  on public.products for select
  using (is_active = true);

-- Produits : tout le monde peut modifier (admin via mot de passe dans l'app)
create policy "all products management"
  on public.products for all
  using (true) with check (true);

-- Commandes : tout le monde peut insérer
create policy "insert orders"
  on public.orders for insert
  with check (true);

-- Commandes : tout le monde peut lire/modifier (admin dans l'app)
create policy "manage orders"
  on public.orders for all
  using (true) with check (true);

-- ── Storage bucket product-images ─────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict do nothing;

create policy "public read images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "upload images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

create policy "update images"
  on storage.objects for update
  using (bucket_id = 'product-images');

create policy "delete images"
  on storage.objects for delete
  using (bucket_id = 'product-images');

-- ── Produits de démonstration (optionnel) ─────────────────
insert into public.products (nom, prix, prix_old, categorie, badge, emoji, desc, specs, display_order)
values
  ('Mini Robot Culinaire 4-en-1', 2990, 4500, 'Cuisine', '⚡ Nouveau', '🔪',
   'Hachoir électrique + trancheur + éplucheur + brosse nettoyante. Sans fil, rechargeable USB-C, imperméable IPX5.',
   '["Fonctions : hachoir + trancheur + éplucheur + brosse", "Charge USB Type-C", "Imperméable IPX5", "Dimensions : 20.5×9.5 cm"]',
   1),
  ('Friteuse à Air Chaud 5.5L', 3500, 5500, 'Cuisine', '🔥 Tendance', '🍟',
   'Friteuse sans huile 1800W, 8 programmes automatiques, bac antiadhésif lavable au lave-vaisselle.',
   '["Capacité 5.5L — 4 à 6 personnes", "Puissance 1800W", "8 programmes automatiques", "Bac lavable lave-vaisselle"]',
   2);
