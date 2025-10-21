-- Create app_config table for storing application configuration
CREATE TABLE public.app_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policy for reading config (public access for app functionality)
CREATE POLICY "App config is readable by everyone" 
ON public.app_config 
FOR SELECT 
USING (true);

-- Create policy for admin updates (only authenticated users can modify)
CREATE POLICY "App config is updatable by authenticated users" 
ON public.app_config 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.app_config (config_key, config_value, description) VALUES 
('app_settings', '{
  "showOnboarding": false,
  "appName": "IMO",
  "onboardingSteps": {
    "welcome": true,
    "pricing": true,
    "plans": true
  }
}', 'Main application configuration settings'),
('feature_flags', '{
  "enableAdvancedSearch": true,
  "enableVideoReviews": true,
  "enableCategoryUnlocks": true
}', 'Feature flags for enabling/disabling app features');