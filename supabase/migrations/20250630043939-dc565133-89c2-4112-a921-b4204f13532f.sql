-- Add unique constraint on product_url to prevent duplicates
ALTER TABLE public.products 
ADD CONSTRAINT unique_product_url UNIQUE (product_url);