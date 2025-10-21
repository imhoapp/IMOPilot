-- Add needs_ai_analysis flag to products and helpful indexes
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS needs_ai_analysis boolean NOT NULL DEFAULT true;

-- Backfill: mark analyzed rows as not needing analysis
UPDATE public.products
SET needs_ai_analysis = false
WHERE imo_score IS NOT NULL
  AND pros IS NOT NULL AND array_length(pros, 1) > 0
  AND cons IS NOT NULL AND array_length(cons, 1) > 0;

-- Indexes for query pagination and analysis checks
CREATE INDEX IF NOT EXISTS idx_products_query ON public.products (query);
CREATE INDEX IF NOT EXISTS idx_products_query_needs_ai ON public.products (query, needs_ai_analysis);