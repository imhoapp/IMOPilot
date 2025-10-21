-- Create background analysis tasks table for tracking ongoing analysis
CREATE TABLE public.background_analysis_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL,
  page INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  products_analyzed INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index to prevent duplicate analysis tasks
CREATE UNIQUE INDEX idx_background_tasks_unique ON public.background_analysis_tasks (query_hash, page);

-- Create index for cleanup queries
CREATE INDEX idx_background_tasks_cleanup ON public.background_analysis_tasks (started_at, status);

-- Enable RLS
ALTER TABLE public.background_analysis_tasks ENABLE ROW LEVEL SECURITY;

-- Only service role can manage background tasks
CREATE POLICY "Service role can manage background tasks" 
ON public.background_analysis_tasks 
FOR ALL 
USING (false);

-- Function to cleanup old/stale tasks
CREATE OR REPLACE FUNCTION public.cleanup_stale_analysis_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- Remove tasks older than 1 hour or stale tasks (no heartbeat for 10 minutes)
  DELETE FROM background_analysis_tasks 
  WHERE status = 'running' 
    AND (
      started_at < NOW() - INTERVAL '1 hour' 
      OR heartbeat_at < NOW() - INTERVAL '10 minutes'
    );
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Remove completed tasks older than 24 hours
  DELETE FROM background_analysis_tasks 
  WHERE status IN ('completed', 'failed') 
    AND completed_at < NOW() - INTERVAL '24 hours';
  
  RETURN cleanup_count;
END;
$$;