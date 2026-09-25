-- WAZYO — Reviews admin-only patch
-- Apply after the existing security patch.
-- Safe to rerun. Does not delete existing reviews or product images.
-- Public storefront keeps SELECT access; only admins can write reviews.

begin;

-- Stop all anonymous/authenticated public review submissions.
drop policy if exists "public insert reviews" on public.reviews;

-- Keep an explicit admin-only write policy in case the base schema differs.
drop policy if exists "admin manage reviews" on public.reviews;
create policy "admin manage reviews"
  on public.reviews
  for all
  to authenticated
  using (public.is_admin())
  with check (
    char_length(trim(nom)) between 1 and 80
    and char_length(trim(commentaire)) between 1 and 1200
    and note between 1 and 5
  );

-- Remove public review-photo uploads.
-- Product images remain readable publicly because the storefront needs them.
drop policy if exists "public review image upload" on storage.objects;

commit;
