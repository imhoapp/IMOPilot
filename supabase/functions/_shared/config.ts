// Shared configuration
export const config = {
  // Logging configuration
  logging: {
    json: (Deno.env.get('JSON_LOGS') || '0') === '1',
  },
  // Oxylabs configuration (for Google, Amazon, Walmart)
  oxylabs: {
    username: Deno.env.get('OXY_USERNAME') || '',
    password: Deno.env.get('OXY_PASSWORD') || '',
    endpoint: 'https://realtime.oxylabs.io/v1/queries',
  },

  // AI configuration
  ai: {
    apiKey: Deno.env.get('OPENAI_API_KEY') || '',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },

  // YouTube configuration
  youtube: {
    apiKey: Deno.env.get('YOUTUBE_API_KEY') || '',
    baseUrl: 'https://www.googleapis.com/youtube/v3',
  },

  tiktok: {
    url: 'https://open.tiktokapis.com/v2/research/video/query/',
    token: Deno.env.get('TIKTOK_ACCESS_TOKEN') || ''
  },
  // Stripe configuration
  stripe: {
    secretKey: Deno.env.get('STRIPE_SECRET_KEY') || '',
  },

  // Supabase configuration
  supabase: {
    url: Deno.env.get('SUPABASE_URL') || '',
    key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
  },

  // Firecrawl configuration
  firecrawl: {
    apiKey: Deno.env.get('FIRECRAWL_KEY') || '',
    baseUrl: 'https://api.firecrawl.dev',
  },

  // Serp API
  serp: {
    apiKey: Deno.env.get('SERPAPI_API_KEY') || "",

  },

};

export const validateConfig = () => {
  const required = [
    'OXY_USERNAME',
    'OXY_PASSWORD',
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'FIRECRAWL_KEY',
    'SERPAPI_API_KEY',
    'STRIPE_SECRET_KEY'
  ];

  const missing = required.filter(key => !Deno.env.get(key));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
};