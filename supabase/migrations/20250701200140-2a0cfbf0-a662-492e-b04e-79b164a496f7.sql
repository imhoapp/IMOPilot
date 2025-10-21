-- Create storage bucket for review videos
INSERT INTO storage.buckets (id, name, public) VALUES ('review-videos', 'review-videos', true);

-- Create policies for review videos bucket
CREATE POLICY "Anyone can view review videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'review-videos');

CREATE POLICY "Authenticated users can upload review videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'review-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own review videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'review-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own review videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'review-videos' AND auth.uid()::text = (storage.foldername(name))[1]);