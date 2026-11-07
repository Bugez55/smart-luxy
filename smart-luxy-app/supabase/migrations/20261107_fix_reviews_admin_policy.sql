-- Restrict review writes to administrators.
-- Public and authenticated users retain read-only access through
-- the separate "public read reviews" policy.
--
-- Apply this migration in Supabase SQL Editor only after reviewing it.
-- This does not modify existing reviews or order data.

begin;

drop policy if exists "admin manage reviews" on public.reviews;

create policy "admin manage reviews"
on public.reviews
for all
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and char_length(trim(nom)) between 1 and 80
  and char_length(trim(commentaire)) between 1 and 1200
  and note between 1 and 5
);

commit;
