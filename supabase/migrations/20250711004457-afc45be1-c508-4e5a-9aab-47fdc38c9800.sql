-- Create product_likes table for users to like products
CREATE TABLE public.product_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_likes
CREATE POLICY "Users can view all product likes" 
ON public.product_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own product likes" 
ON public.product_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product likes" 
ON public.product_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_product_likes_user_id ON public.product_likes(user_id);
CREATE INDEX idx_product_likes_product_id ON public.product_likes(product_id);

-- Create unique constraint to prevent duplicate likes
CREATE UNIQUE INDEX idx_product_likes_user_product_unique ON public.product_likes(user_id, product_id);