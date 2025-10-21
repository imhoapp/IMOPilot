-- Add image_urls column to products table to store multiple image URLs
ALTER TABLE public.products 
ADD COLUMN image_urls TEXT[];