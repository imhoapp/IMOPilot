-- Create analytics events table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_timestamp ON public.analytics_events(timestamp);

-- Create policy for users to insert their own events
CREATE POLICY "users_can_insert_events" ON public.analytics_events
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create policy for users to view their own events  
CREATE POLICY "users_can_view_own_events" ON public.analytics_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for service role to insert any events
CREATE POLICY "service_role_can_insert_events" ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Create policy for service role to view all events
CREATE POLICY "service_role_can_view_all_events" ON public.analytics_events
  FOR SELECT
  USING (true);