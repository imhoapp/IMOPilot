-- Create analytics tables for subscription funnel tracking
CREATE TABLE public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_subscription_events_user_type ON public.subscription_events(user_id, event_type);
CREATE INDEX idx_subscription_events_created_at ON public.subscription_events(created_at);
CREATE INDEX idx_subscription_events_type ON public.subscription_events(event_type);

-- Enable Row Level Security
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can insert subscription events" 
ON public.subscription_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can view subscription events" 
ON public.subscription_events 
FOR SELECT 
USING (true);

-- Update affiliate_clicks table to include subscription status
ALTER TABLE public.affiliate_clicks 
ADD COLUMN subscription_status TEXT DEFAULT 'free',
ADD COLUMN conversion_value NUMERIC DEFAULT 0,
ADD COLUMN session_id TEXT;

-- Create user_interactions table for locked content tracking
CREATE TABLE public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'content_view', 'unlock_prompt_shown', 'unlock_attempt', 'content_unlocked'
  content_type TEXT, -- 'category', 'product', 'search_results'
  content_id TEXT, -- category name, product id, etc.
  metadata JSONB,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_user_interactions_user_type ON public.user_interactions(user_id, interaction_type);
CREATE INDEX idx_user_interactions_content ON public.user_interactions(content_type, content_id);
CREATE INDEX idx_user_interactions_created_at ON public.user_interactions(created_at);

-- Enable Row Level Security
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own interactions" 
ON public.user_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert user interactions" 
ON public.user_interactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can view all user interactions" 
ON public.user_interactions 
FOR SELECT 
USING (true);