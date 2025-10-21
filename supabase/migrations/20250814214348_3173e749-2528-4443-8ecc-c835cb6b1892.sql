-- Make user 4ac8a6b8-69c0-448a-91cc-33f6e5c60b18 a premium user for testing

-- Update the profiles table to set premium access
UPDATE public.profiles 
SET 
  subscription_tier = 'premium',
  access_level = 'premium',
  updated_at = now()
WHERE id = '4ac8a6b8-69c0-448a-91cc-33f6e5c60b18';

-- Insert or update subscription record
INSERT INTO public.subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  plan_type,
  is_active,
  subscription_end,
  created_at,
  updated_at
) VALUES (
  '4ac8a6b8-69c0-448a-91cc-33f6e5c60b18',
  'cus_test_premium_user',
  'sub_test_premium_subscription',
  'premium',
  true,
  now() + interval '1 year',
  now(),
  now()
) ON CONFLICT (user_id) 
DO UPDATE SET 
  plan_type = 'premium',
  is_active = true,
  subscription_end = now() + interval '1 year',
  updated_at = now();