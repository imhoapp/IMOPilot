import { supabase } from '@/integrations/supabase/client';

// App configuration that can be controlled via backend
interface AppConfig {
  showOnboarding: boolean;
  appName: string;
  onboardingSteps: {
    welcome: boolean;
    pricing: boolean;
    plans: boolean;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  showOnboarding: false, // Default is false as requested
  appName: "IMO",
  onboardingSteps: {
    welcome: true,
    pricing: true,
    plans: true,
  },
};

// Fetch configuration from backend
export async function getAppConfig(): Promise<AppConfig> {
  try {
    // Call the Supabase edge function to get app configuration
    const response = await fetch('https://ifwcgzdznxphmmcsuufq.supabase.co/functions/v1/get-app-config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch app config, using defaults');
      return defaultConfig;
    }

    const config = await response.json();
    return config;
  } catch (error) {
    console.error('Error fetching app config:', error);
    return defaultConfig;
  }
}

export { type AppConfig, defaultConfig };