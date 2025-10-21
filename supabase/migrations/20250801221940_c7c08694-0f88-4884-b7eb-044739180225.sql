-- Update category_unlocks table to handle search queries instead of categories
ALTER TABLE public.category_unlocks RENAME TO search_unlocks;
ALTER TABLE public.search_unlocks RENAME COLUMN category TO search_query;

-- Update the unique constraint
DROP INDEX IF EXISTS category_unlocks_user_id_category_key;
CREATE UNIQUE INDEX search_unlocks_user_id_search_query_key ON public.search_unlocks(user_id, search_query);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own category unlocks" ON public.search_unlocks;
DROP POLICY IF EXISTS "Service role can insert category unlocks" ON public.search_unlocks;
DROP POLICY IF EXISTS "admins_can_view_all_category_unlocks" ON public.search_unlocks;

CREATE POLICY "Users can view their own search unlocks" 
ON public.search_unlocks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert search unlocks" 
ON public.search_unlocks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "admins_can_view_all_search_unlocks" 
ON public.search_unlocks 
FOR SELECT 
USING (is_admin());