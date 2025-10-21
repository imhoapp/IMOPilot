-- Add unique constraint to external_review_id column in product_reviews table
ALTER TABLE public.product_reviews 
ADD CONSTRAINT product_reviews_external_review_id_unique 
UNIQUE (external_review_id);