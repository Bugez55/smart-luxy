-- WAZYO: manually curated product-to-product complementary recommendations.
-- Existing products receive an empty list, preserving their current storefront behavior.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS complementary_product_ids jsonb
  NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_complementary_product_ids_is_array'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_complementary_product_ids_is_array
      CHECK (jsonb_typeof(complementary_product_ids) = 'array');
  END IF;
END
$$;
