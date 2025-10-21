-- Create error logs table for backend monitoring
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  query_context TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can write to error logs
CREATE POLICY "Only service role can insert error logs" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (false);

-- Admin can view all error logs
CREATE POLICY "Admins can view error logs" 
ON public.error_logs 
FOR SELECT 
USING (false); -- Will be updated with proper admin check later

-- Create index for performance
CREATE INDEX idx_error_logs_function_created ON public.error_logs(function_name, created_at DESC);
CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);