-- Rename home_depot_reviews table to product_reviews
ALTER TABLE public.home_depot_reviews RENAME TO product_reviews;

-- Update function name for product_reviews
ALTER FUNCTION public.update_home_depot_reviews_updated_at() RENAME TO update_product_reviews_updated_at;

-- Update trigger name for product_reviews
ALTER TRIGGER update_home_depot_reviews_updated_at ON public.product_reviews RENAME TO update_product_reviews_updated_at;

-- Update indexes
ALTER INDEX idx_home_depot_reviews_product_id RENAME TO idx_product_reviews_product_id;
ALTER INDEX idx_home_depot_reviews_rating RENAME TO idx_product_reviews_rating;

-- Update constraints
ALTER TABLE public.product_reviews RENAME CONSTRAINT fk_home_depot_reviews_product_id TO fk_product_reviews_product_id;
ALTER TABLE public.product_reviews RENAME CONSTRAINT unique_external_review_per_product TO unique_product_review_per_product;

-- Update RLS policy
DROP POLICY "Home Depot reviews are viewable by everyone" ON public.product_reviews;
CREATE POLICY "Product reviews are viewable by everyone" 
ON public.product_reviews 
FOR SELECT 
USING (true);