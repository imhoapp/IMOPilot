import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateConfig } from '../_shared/config.ts';
import { createCorsHeaders } from '../_shared/utils.ts';
import { summarizeReviews } from '../_shared/ai-service.ts';
import { ReviewService } from '../_shared/review-service.ts';
import { FetchConfigService } from '../_shared/fetch-config.ts';
import {
  getProduct,
  getProductReviews,
  updateProduct
} from '../_shared/database-service.ts';

const corsHeaders = createCorsHeaders();

// Function to fetch product reviews independently
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

    if (!product || !product.id) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing reviews
    let existingReviews = await getProductReviews(product.id);

    // Fetch reviews if none exist and review channels are enabled
    if (existingReviews.length === 0) {
      const reviewResult = await ReviewService.fetchAndSaveReviews(
        product.id,
        product.title,
        product.source as any,
        product.source_id || undefined
      );
      if (reviewResult.success && reviewResult.reviewCount > 0) {
        existingReviews = await getProductReviews(product.id);
      }
    }

    // Generate review summary if needed and we have reviews
    let reviewsSummary = product.reviews_summary;
    if (!reviewsSummary && existingReviews.length > 0) {
      try {
        const reviewTexts = existingReviews.map(r => r.review_text).filter(Boolean);
        if (reviewTexts.length > 0) {
          console.log('Generating review summary...');
          reviewsSummary = await summarizeReviews(reviewTexts, product.title);

          // Update the product with the summary
          await updateProduct(product.id, { reviews_summary: reviewsSummary });
        }
      } catch (error) {
        console.error('Error generating review summary:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reviews: existingReviews,
        reviewsSummary: reviewsSummary,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fetch-product-reviews:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});