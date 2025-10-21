-- Update search_products_paginated function to support most_reviewed sorting
CREATE OR REPLACE FUNCTION public.search_products_paginated(search_query text, page_num integer DEFAULT 1, page_size integer DEFAULT 12, sort_by text DEFAULT 'newest'::text, min_price numeric DEFAULT 0, max_price numeric DEFAULT 999999, min_imo_score integer DEFAULT 0, min_rating numeric DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, price numeric, image_url text, image_urls text[], product_url text, source text, source_id text, imo_score integer, pros text[], cons text[], created_at timestamp with time zone, reviews_summary text, site_rating numeric, query text, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      WHEN sort_by = 'most_reviewed' THEN p.reviews_count
      ELSE NULL
    END DESC,
    CASE 
      WHEN sort_by = 'newest' OR sort_by IS NULL THEN p.created_at
      ELSE NULL
    END DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$function$;

-- Update search_products_priority function to support most_reviewed sorting  
CREATE OR REPLACE FUNCTION public.search_products_priority(search_query text, page_num integer DEFAULT 1, page_size integer DEFAULT 12, sort_by text DEFAULT 'newest'::text, min_price numeric DEFAULT 0, max_price numeric DEFAULT 999999, min_imo_score integer DEFAULT 0, min_rating numeric DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, price numeric, image_url text, image_urls text[], product_url text, source text, source_id text, imo_score integer, pros text[], cons text[], created_at timestamp with time zone, reviews_summary text, site_rating numeric, query text, total_count bigint, priority_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  offset_val INTEGER;
  total_products BIGINT;
  exact_query_match_count BIGINT;
BEGIN
  offset_val := (page_num - 1) * page_size;

  -- Count exact query matches first
  SELECT COUNT(*) INTO exact_query_match_count
  FROM products p
  WHERE p.query = LOWER(search_query)
    AND p.price >= min_price
    AND p.price <= max_price
    AND (min_imo_score = 0 OR p.imo_score >= min_imo_score)
    AND (min_rating = 0 OR p.site_rating >= min_rating);

  -- Get total count for all matching products
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
    total_products,
    -- Priority scoring: exact query match = 1, partial match = 0
    CASE
      WHEN p.query = LOWER(search_query) THEN 1
      ELSE 0
    END as priority_score
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
    -- First by priority (exact query matches first)
    CASE
      WHEN p.query = LOWER(search_query) THEN 1
      ELSE 0
    END DESC,
    -- Then by the requested sort order
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
      WHEN sort_by = 'most_reviewed' THEN p.reviews_count
      ELSE NULL
    END DESC,
    CASE
      WHEN sort_by = 'newest' OR sort_by IS NULL THEN p.created_at
      ELSE NULL
    END DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$function$;