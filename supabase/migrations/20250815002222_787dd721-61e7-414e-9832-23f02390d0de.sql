-- Add missing product_keywords column to products table
ALTER TABLE public.products 
ADD COLUMN product_keywords text[];

-- Add proper unique constraint for products table to fix ON CONFLICT issues
ALTER TABLE public.products 
ADD CONSTRAINT products_source_source_id_unique UNIQUE (source, source_id);

-- Create index for better performance on product_keywords
CREATE INDEX IF NOT EXISTS idx_products_keywords ON public.products USING GIN(product_keywords);