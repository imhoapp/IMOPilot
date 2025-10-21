import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config } = await import('../_shared/config.ts');
    const supabaseClient = createClient(
      config.supabase.url,
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log('[GET-APP-CONFIG] Function started');

    // Fetch app configuration from database
    const { data: configData, error: configError } = await supabaseClient
      .from('app_config')
      .select('config_key, config_value')
      .eq('config_key', 'app_settings')
      .single();

    if (configError) {
      console.error('[GET-APP-CONFIG] Error fetching config:', configError);
      throw configError;
    }

    if (!configData) {
      console.log('[GET-APP-CONFIG] No config found, returning defaults');
      // Return default configuration if none exists
      const defaultConfig = {
        showOnboarding: false,
        appName: "IMO",
        onboardingSteps: {
          welcome: true,
          pricing: true,
          plans: true
        }
      };

      return new Response(
        JSON.stringify(defaultConfig),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('[GET-APP-CONFIG] Config retrieved successfully:', configData.config_value);

    return new Response(
      JSON.stringify(configData.config_value),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[GET-APP-CONFIG] Error:', error);
    
    // Return default config in case of error to prevent app breaking
    const defaultConfig = {
      showOnboarding: false,
      appName: "IMO",
      onboardingSteps: {
        welcome: true,
        pricing: true,
        plans: true
      }
    };

    return new Response(
      JSON.stringify(defaultConfig),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with defaults instead of error to prevent app breaking
      }
    );
  }
});