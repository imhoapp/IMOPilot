-- Add missing columns to products table for Home Depot integration
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS query TEXT,
ADD COLUMN IF NOT EXISTS product_url TEXT;