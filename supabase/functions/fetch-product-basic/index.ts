import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateConfig } from '../_shared/config.ts';
import { createCorsHeaders } from '../_shared/utils.ts';
import {
  getProduct,
  getProductBySourceId,
  saveProductReviews,
  updateProduct
} from '../_shared/database-service.ts';
import { fetchDetailedProductInfo } from '../_shared/detailed-product-fetcher.ts';

const corsHeaders = createCorsHeaders();

// Lightweight function to fetch basic product information quickly
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    validateConfig();

    const { productId, source, sourceId }: {
      productId?: string;
      source?: string;
      sourceId?: string;
    } = await req.json();

    if (!productId && !(source && sourceId)) {
      return new Response(
        JSON.stringify({ error: 'Either productId or (source + sourceId) required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product from database
    let product = productId ?
      await getProduct(productId) :
      await getProductBySourceId(source!, sourceId!);

    if (!product || !product.id) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch detailed product information if not already fetched (but don't fetch reviews/videos)
    if (!product.is_detailed_fetched && product.source_id) {
      try {
        const detailedResult = await fetchDetailedProductInfo(product);
        if (detailedResult && detailedResult.productData) {
          await updateProduct(product.id, {
            ...detailedResult.productData,
            is_detailed_fetched: true
          });

          if (detailedResult.reviews && detailedResult.reviews.length > 0) {
            await saveProductReviews(product.id, detailedResult.reviews);
          }

          product = { ...product, ...detailedResult.productData, is_detailed_fetched: true };

        }
      } catch (error) {
        console.error('Error fetching detailed product info:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        product: product,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fetch-product-basic:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});