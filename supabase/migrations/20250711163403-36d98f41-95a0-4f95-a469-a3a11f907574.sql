-- Enable Row Level Security on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on videos table  
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Products table policies
-- Allow everyone to view products (public read access)
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (true);

-- Only allow inserts/updates from service role (edge functions)
-- Regular authenticated users cannot create/modify products
CREATE POLICY "Only service role can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Only service role can update products" 
ON public.products 
FOR UPDATE 
USING (false);

CREATE POLICY "Only service role can delete products" 
ON public.products 
FOR DELETE 
USING (false);

-- Videos table policies  
-- Allow everyone to view videos (public read access)
CREATE POLICY "Videos are viewable by everyone" 
ON public.videos 
FOR SELECT 
USING (true);

-- Only allow inserts/updates from service role (edge functions)
-- Regular authenticated users cannot create/modify videos
CREATE POLICY "Only service role can insert videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Only service role can update videos" 
ON public.videos 
FOR UPDATE 
USING (false);

CREATE POLICY "Only service role can delete videos" 
ON public.videos 
FOR DELETE 
USING (false);