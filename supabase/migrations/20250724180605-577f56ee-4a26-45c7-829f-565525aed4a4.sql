-- Add columns to store detailed product information from various sources
ALTER TABLE public.products 
ADD COLUMN bullet_points TEXT,
ADD COLUMN original_price NUMERIC,
ADD COLUMN discount_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN stock_info TEXT,
ADD COLUMN brand TEXT,
ADD COLUMN categories JSONB,
ADD COLUMN variations JSONB,
ADD COLUMN sales_rank JSONB,
ADD COLUMN product_dimensions TEXT,
ADD COLUMN delivery_info JSONB,
ADD COLUMN featured_merchant JSONB,
ADD COLUMN is_prime_eligible BOOLEAN,
ADD COLUMN amazon_choice BOOLEAN;