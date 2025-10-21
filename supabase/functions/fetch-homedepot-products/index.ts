import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchProducts, fetchFilterOptions } from './serpapi-client.ts';
import { processProducts } from './product-processor.ts';
import { upsertProductsAndFetchVideos } from './database-operations.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!serpApiKey) {
      return new Response(
        JSON.stringify({ error: 'SerpApi API key not configured. Required: SERPAPI_API_KEY' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured. Required: OPENAI_API_KEY' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!youtubeApiKey) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured. Required: YOUTUBE_API_KEY' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { q, hd_sort, hd_filter_tokens, test } = await req.json();
    const testMode = test === true || test === 'true';

    if (!q) {
      return new Response(
        JSON.stringify({ error: 'Query parameter "q" is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching Home Depot products for query: ${q}`);

    // Fetch products and filter options
    const productData = await fetchProducts(q, hd_sort, hd_filter_tokens);
    const filterData = await fetchFilterOptions(q);

    console.log(`Found ${productData.products?.length || 0} products from SerpApi`);

    if (!productData.products || productData.products.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No products found', 
          products: [], 
          filters: filterData 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process products with AI analysis and additional data
    console.log(`Processing products with AI analysis${testMode ? ' (TEST MODE - 1 product only)' : ''}...`);
    const processedProducts = await processProducts(productData.products, q, testMode);
    console.log(`Processed ${processedProducts.length} products with AI analysis`);
    
    // Debug: Log sample processed product
    if (processedProducts.length > 0) {
      const sample = processedProducts[0];
      console.log(`Sample processed product - Title: ${sample.title}, Site Rating: ${sample.site_rating}, Reviews Summary: ${sample.reviews_summary ? 'Present' : 'Missing'}, Product Reviews: ${sample.product_reviews?.length || 0}`);
    }

    // Upsert products and fetch YouTube videos
    const { insertedProducts, errors } = await upsertProductsAndFetchVideos(processedProducts);
    console.log(`Successfully processed ${insertedProducts.length} products`);

    return new Response(
      JSON.stringify({
        message: `Successfully processed ${insertedProducts.length} products`,
        products: insertedProducts,
        filters: filterData,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-homedepot-products function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});