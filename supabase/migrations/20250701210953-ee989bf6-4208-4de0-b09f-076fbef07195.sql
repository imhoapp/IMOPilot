-- Add new fields to products table for reviews summary and site rating
ALTER TABLE public.products 
ADD COLUMN reviews_summary TEXT,
ADD COLUMN site_rating DECIMAL(3,2);