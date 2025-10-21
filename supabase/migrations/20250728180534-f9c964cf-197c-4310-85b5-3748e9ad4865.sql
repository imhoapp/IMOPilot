-- Create subscriptions table to track user subscription status
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  subscription_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create category_unlocks table for pay-per-unlock purchases
CREATE TABLE public.category_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  unlock_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment_transactions table for tracking all payments
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL, -- 'subscription' or 'category_unlock'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add subscription_tier and access_level columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN subscription_tier TEXT DEFAULT 'free',
ADD COLUMN access_level TEXT DEFAULT 'basic';

-- Enable Row Level Security on all new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions table
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (true);

-- RLS Policies for category_unlocks table
CREATE POLICY "Users can view their own category unlocks" 
ON public.category_unlocks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert category unlocks" 
ON public.category_unlocks 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for payment_transactions table
CREATE POLICY "Users can view their own payment transactions" 
ON public.payment_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert payment transactions" 
ON public.payment_transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update payment transactions" 
ON public.payment_transactions 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_category_unlocks_user_id ON public.category_unlocks(user_id);
CREATE INDEX idx_category_unlocks_category ON public.category_unlocks(category);
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_stripe_session_id ON public.payment_transactions(stripe_session_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint to prevent duplicate active subscriptions per user
CREATE UNIQUE INDEX idx_unique_active_subscription 
ON public.subscriptions(user_id) 
WHERE is_active = true;

-- Create unique constraint to prevent duplicate category unlocks per user
CREATE UNIQUE INDEX idx_unique_category_unlock 
ON public.category_unlocks(user_id, category);