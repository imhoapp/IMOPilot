import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateConfig } from '../_shared/config.ts';
import { createCorsHeaders } from '../_shared/utils.ts';
import { VideoService } from '../_shared/video-service.ts';
import { FetchConfigService } from '../_shared/fetch-config.ts';
import {
  getProduct,
  getProductVideos
} from '../_shared/database-service.ts';

const corsHeaders = createCorsHeaders();

// Function to fetch product videos independently
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    validateConfig();

    const { productId }: { productId: string } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product from database
    const product = await getProduct(productId);

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing videos
    let existingVideos = await getProductVideos(product.id);

    // Get current configuration
    const config = FetchConfigService.getConfig();

    // Fetch videos if none exist and video config allows it
    if (existingVideos.length === 0 && VideoService.shouldFetchVideos(config)) {
      console.log(`Fetching videos for product: ${product.title}`);
      const videoResult = await VideoService.fetchAndSaveVideos(
        product.id,
        product.title
      );
      if (videoResult.success && videoResult.videoCount > 0) {
        existingVideos = await getProductVideos(product.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        videos: existingVideos,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fetch-product-videos:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});