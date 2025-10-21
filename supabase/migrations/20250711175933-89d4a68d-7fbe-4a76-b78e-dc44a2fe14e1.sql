-- Drop existing policies for profiles table
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING ((select auth.uid()) = id);

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING ((select auth.uid()) = id);