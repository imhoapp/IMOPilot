-- Create a storage bucket for debug logs
INSERT INTO storage.buckets (id, name, public) VALUES ('debug-logs', 'debug-logs', false);

-- Create storage policies for debug logs
-- Only authenticated users can view debug logs (you can make this more restrictive if needed)
CREATE POLICY "Debug logs are viewable by authenticated users" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'debug-logs' AND auth.role() = 'authenticated');

-- Allow uploads to debug logs bucket
CREATE POLICY "Allow debug log uploads from edge functions"
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'debug-logs');