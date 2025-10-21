-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image_url TEXT,
  source TEXT,
  external_url TEXT,
  imo_score INTEGER,
  pros TEXT[],
  cons TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_reviews table
CREATE TABLE public.user_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  video_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create affiliate_clicks table
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_logs table
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on user-specific tables
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_reviews
CREATE POLICY "Users can view all reviews" 
ON public.user_reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own reviews" 
ON public.user_reviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.user_reviews 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.user_reviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for affiliate_clicks
CREATE POLICY "Users can view their own clicks" 
ON public.affiliate_clicks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clicks" 
ON public.affiliate_clicks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for usage_logs
CREATE POLICY "Users can view their own usage logs" 
ON public.usage_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own usage logs" 
ON public.usage_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_videos_product_id ON public.videos(product_id);
CREATE INDEX idx_user_reviews_user_id ON public.user_reviews(user_id);
CREATE INDEX idx_user_reviews_product_id ON public.user_reviews(product_id);
CREATE INDEX idx_affiliate_clicks_user_id ON public.affiliate_clicks(user_id);
CREATE INDEX idx_affiliate_clicks_product_id ON public.affiliate_clicks(product_id);
CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_type ON public.usage_logs(type);