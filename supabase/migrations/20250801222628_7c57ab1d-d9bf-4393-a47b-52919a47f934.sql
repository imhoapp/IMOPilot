-- Insert test search unlock for user mo@creme.digital
INSERT INTO public.search_unlocks (user_id, search_query, payment_amount, unlock_date)
VALUES (
  '4ac8a6b8-69c0-448a-91cc-33f6e5c60b18',
  'iphone 15',
  4.99,
  now()
)
ON CONFLICT (user_id, search_query) DO NOTHING;