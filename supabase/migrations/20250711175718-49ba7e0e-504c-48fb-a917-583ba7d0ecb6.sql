-- Drop existing policies for user_reviews table
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.user_reviews;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Users can create their own reviews" 
ON public.user_reviews 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.user_reviews 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.user_reviews 
FOR DELETE 
USING ((select auth.uid()) = user_id);