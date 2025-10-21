-- Add source_id column to products table for per-source unique identifiers
ALTER TABLE public.products 
ADD COLUMN source_id text;

-- Add index on source_id for faster lookups
CREATE INDEX idx_products_source_id ON public.products(source_id);

-- Add composite unique constraint on source and source_id to prevent duplicates
ALTER TABLE public.products 
ADD CONSTRAINT unique_source_source_id UNIQUE (source, source_id);

-- Update source column to support Google products by modifying any existing constraints
-- (Note: Since source is just a text column, no schema change needed for Google support)