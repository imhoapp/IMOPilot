-- Remove unnecessary Amazon-specific columns, keep only bullet_points and brand
ALTER TABLE public.products 
DROP COLUMN IF EXISTS original_price,
DROP COLUMN IF EXISTS discount_end,
DROP COLUMN IF EXISTS stock_info,
DROP COLUMN IF EXISTS categories,
DROP COLUMN IF EXISTS variations,
DROP COLUMN IF EXISTS sales_rank,
DROP COLUMN IF EXISTS product_dimensions,
DROP COLUMN IF EXISTS delivery_info,
DROP COLUMN IF EXISTS featured_merchant,
DROP COLUMN IF EXISTS is_prime_eligible,
DROP COLUMN IF EXISTS amazon_choice;