-- Drop existing policies for product_likes table
DROP POLICY IF EXISTS "Users can create their own product likes" ON public.product_likes;
DROP POLICY IF EXISTS "Users can delete their own product likes" ON public.product_likes;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Users can create their own product likes" 
ON public.product_likes 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own product likes" 
ON public.product_likes 
FOR DELETE 
USING ((select auth.uid()) = user_id);