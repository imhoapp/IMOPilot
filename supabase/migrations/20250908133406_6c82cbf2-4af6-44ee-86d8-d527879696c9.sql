-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION get_likes_for_products(
  product_ids UUID[],
  user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  like_count INTEGER,
  liked_by_user BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    COALESCE(like_counts.count, 0)::INTEGER as like_count,
    COALESCE(user_likes.liked, FALSE) as liked_by_user
  FROM unnest(product_ids) as p(id)
  LEFT JOIN (
    SELECT 
      pl.product_id,
      COUNT(*)::INTEGER as count
    FROM product_likes pl
    WHERE pl.product_id = ANY(product_ids)
    GROUP BY pl.product_id
  ) like_counts ON like_counts.product_id = p.id
  LEFT JOIN (
    SELECT 
      pl.product_id,
      TRUE as liked
    FROM product_likes pl
    WHERE pl.product_id = ANY(product_ids)
      AND pl.user_id = user_id
      AND user_id IS NOT NULL
  ) user_likes ON user_likes.product_id = p.id;
END;
$$;

-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION search_products_paginated(
  search_query TEXT,
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 12,
  sort_by TEXT DEFAULT 'newest',
  min_price NUMERIC DEFAULT 0,
  max_price NUMERIC DEFAULT 999999,
  min_imo_score INTEGER DEFAULT 0,
  min_rating NUMERIC DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  image_url TEXT,
  image_urls TEXT[],
  product_url TEXT,
  source TEXT,
  source_id TEXT,
  imo_score INTEGER,
  pros TEXT[],
  cons TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  reviews_summary TEXT,
  site_rating NUMERIC,
  query TEXT,
  total_count BIGINT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offset_val INTEGER;
  total_products BIGINT;
BEGIN
  offset_val := (page_num - 1) * page_size;
  
  -- Get total count first
  SELECT COUNT(*) INTO total_products
  FROM products p
  WHERE (search_query IS NULL OR search_query = '' OR 
         p.title ILIKE '%' || search_query || '%' OR 
         p.description ILIKE '%' || search_query || '%' OR
         p.query ILIKE '%' || search_query || '%')
    AND p.price >= min_price 
    AND p.price <= max_price
    AND (min_imo_score = 0 OR p.imo_score >= min_imo_score)
    AND (min_rating = 0 OR p.site_rating >= min_rating);

  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.image_url,
    p.image_urls,
    p.product_url,
    p.source,
    p.source_id,
    p.imo_score,
    p.pros,
    p.cons,
    p.created_at,
    p.reviews_summary,
    p.site_rating,
    p.query,
    total_products
  FROM products p
  WHERE (search_query IS NULL OR search_query = '' OR 
         p.title ILIKE '%' || search_query || '%' OR 
         p.description ILIKE '%' || search_query || '%' OR
         p.query ILIKE '%' || search_query || '%')
    AND p.price >= min_price 
    AND p.price <= max_price
    AND (min_imo_score = 0 OR p.imo_score >= min_imo_score)
    AND (min_rating = 0 OR p.site_rating >= min_rating)
  ORDER BY 
    CASE 
      WHEN sort_by = 'price_low' THEN p.price
      ELSE NULL
    END ASC,
    CASE 
      WHEN sort_by = 'price_high' THEN p.price
      ELSE NULL
    END DESC,
    CASE 
      WHEN sort_by = 'imo_score' THEN p.imo_score
      ELSE NULL
    END DESC,
    CASE 
      WHEN sort_by = 'rating' THEN p.site_rating
      ELSE NULL
    END DESC,
    CASE 
      WHEN sort_by = 'newest' OR sort_by IS NULL THEN p.created_at
      ELSE NULL
    END DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$$;