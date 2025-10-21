-- Drop existing policies for comments table
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Users can create their own comments" 
ON public.comments 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments 
FOR DELETE 
USING ((select auth.uid()) = user_id);