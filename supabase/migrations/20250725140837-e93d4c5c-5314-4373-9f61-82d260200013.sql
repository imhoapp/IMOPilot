-- Add source column to product_reviews table
ALTER TABLE public.product_reviews 
ADD COLUMN source text DEFAULT 'Unknown';