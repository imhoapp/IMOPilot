import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createCorsHeaders } from '../_shared/utils.ts';

const corsHeaders = createCorsHeaders();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config } = await import('../_shared/config.ts');
    const supabase = createClient(
      config.supabase.url,
      config.supabase.key,
      { auth: { persistSession: false } }
    );

    console.log('Starting cleanup of invalid products...');

    // Find products with missing critical data
    const { data: invalidProducts, error: findError } = await supabase
      .from('products')
      .select('id, title, source, source_id, price')
      .or('title.is.null,source.is.null,source_id.is.null,price.is.null');

    if (findError) {
      console.error('Error finding invalid products:', findError);
      throw findError;
    }

    console.log(`Found ${invalidProducts?.length || 0} invalid products`);

    let cleanedCount = 0;
    if (invalidProducts && invalidProducts.length > 0) {
      // Delete invalid products
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .or('title.is.null,source.is.null,source_id.is.null,price.is.null');

      if (deleteError) {
        console.error('Error deleting invalid products:', deleteError);
        throw deleteError;
      }

      cleanedCount = invalidProducts.length;
    }

    // Also clean up any orphaned reviews and videos
    const { error: reviewCleanError } = await supabase
      .from('product_reviews')
      .delete()
      .not('product_id', 'in', `(SELECT id FROM products)`);

    const { error: videoCleanError } = await supabase
      .from('videos')
      .delete()
      .not('product_id', 'in', `(SELECT id FROM products)`);

    console.log(`Cleanup completed: removed ${cleanedCount} invalid products`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed successfully`,
        invalidProductsRemoved: cleanedCount,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error during cleanup:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});