-- Add column to track if detailed product information has been fetched
ALTER TABLE public.products 
ADD COLUMN is_detailed_fetched BOOLEAN DEFAULT FALSE;