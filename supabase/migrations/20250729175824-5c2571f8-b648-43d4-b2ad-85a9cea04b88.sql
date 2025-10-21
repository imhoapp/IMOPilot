-- Create admin role and security function for analytics access
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'user';

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Update RLS policies for analytics_events table (admin only access)
DROP POLICY IF EXISTS "users_can_insert_events" ON public.analytics_events;
DROP POLICY IF EXISTS "users_can_view_own_events" ON public.analytics_events;
DROP POLICY IF EXISTS "service_role_can_insert_events" ON public.analytics_events;
DROP POLICY IF EXISTS "service_role_can_view_all_events" ON public.analytics_events;

-- Allow service role to insert events (for tracking)
CREATE POLICY "service_role_can_insert_events" ON public.analytics_events
FOR INSERT WITH CHECK (true);

-- Allow authenticated users to insert their own events
CREATE POLICY "users_can_insert_own_events" ON public.analytics_events
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can view analytics events
CREATE POLICY "admins_can_view_all_events" ON public.analytics_events
FOR SELECT USING (public.is_admin());

-- Update RLS policies for subscription_events table (admin only access)
DROP POLICY IF EXISTS "Service role can view subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Service role can insert subscription events" ON public.subscription_events;

CREATE POLICY "service_role_can_insert_subscription_events" ON public.subscription_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_insert_subscription_events" ON public.subscription_events
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "admins_can_view_subscription_events" ON public.subscription_events
FOR SELECT USING (public.is_admin());

-- Update RLS policies for user_interactions table (admin only access)
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.user_interactions;
DROP POLICY IF EXISTS "Service role can insert user interactions" ON public.user_interactions;
DROP POLICY IF EXISTS "Service role can view all user interactions" ON public.user_interactions;

CREATE POLICY "service_role_can_insert_interactions" ON public.user_interactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_insert_interactions" ON public.user_interactions
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "admins_can_view_interactions" ON public.user_interactions
FOR SELECT USING (public.is_admin());

-- Update RLS policies for affiliate_clicks table (admin only access)
DROP POLICY IF EXISTS "Users can view their own clicks" ON public.affiliate_clicks;
DROP POLICY IF EXISTS "Users can create their own clicks" ON public.affiliate_clicks;

CREATE POLICY "users_can_insert_affiliate_clicks" ON public.affiliate_clicks
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "admins_can_view_affiliate_clicks" ON public.affiliate_clicks
FOR SELECT USING (public.is_admin());

-- Update RLS policies for payment_transactions (admin only view)
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;

CREATE POLICY "admins_can_view_payment_transactions" ON public.payment_transactions
FOR SELECT USING (public.is_admin());

-- Category unlocks should remain user-viewable for their own records
-- but admins should see all
CREATE POLICY "admins_can_view_all_category_unlocks" ON public.category_unlocks
FOR SELECT USING (public.is_admin());