-- Create table for Home Depot reviews fetched from SerpAPI
CREATE TABLE public.home_depot_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  external_review_id TEXT NOT NULL,
  reviewer_name TEXT,
  rating INTEGER NOT NULL,
  title TEXT,
  review_text TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  review_date TIMESTAMP WITH TIME ZONE,
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.home_depot_reviews ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (reviews are public information)
CREATE POLICY "Home Depot reviews are viewable by everyone" 
ON public.home_depot_reviews 
FOR SELECT 
USING (true);

-- Add foreign key constraint
ALTER TABLE public.home_depot_reviews 
ADD CONSTRAINT fk_home_depot_reviews_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Create unique constraint to prevent duplicate reviews
ALTER TABLE public.home_depot_reviews 
ADD CONSTRAINT unique_external_review_per_product 
UNIQUE (product_id, external_review_id);

-- Create index for better performance
CREATE INDEX idx_home_depot_reviews_product_id ON public.home_depot_reviews(product_id);
CREATE INDEX idx_home_depot_reviews_rating ON public.home_depot_reviews(rating);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_home_depot_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_home_depot_reviews_updated_at
  BEFORE UPDATE ON public.home_depot_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_home_depot_reviews_updated_at();