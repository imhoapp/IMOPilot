import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateConfig } from '../_shared/config.ts';
import { createCorsHeaders } from '../_shared/utils.ts';
import { summarizeReviews } from '../_shared/ai-service.ts';
import { ReviewService } from '../_shared/review-service.ts';
import { VideoService } from '../_shared/video-service.ts';
import { FetchConfigService } from '../_shared/fetch-config.ts';
import {
  getProduct,
  getProductBySourceId,
  saveProductReviews,
  getProductReviews,
  getProductVideos,
  updateProduct
} from '../_shared/database-service.ts';
import { ProductDetails } from '../_shared/types.ts';
import { fetchDetailedProductInfo } from '../_shared/detailed-product-fetcher.ts';

const corsHeaders = createCorsHeaders();

// Main function to fetch detailed product information
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

    // Fetch detailed product information if not already fetched
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

    // Defensive: check product again after possible update
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found after update' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing reviews and videos
    let [existingReviews, existingVideos] = await Promise.all([
      getProductReviews(product.id),
      getProductVideos(product.id)
    ]);

    // Get current configuration
    const config = FetchConfigService.getConfig();

    // Fetch reviews if none exist and review channels are enabled
    if (existingReviews.length === 0 && ReviewService.shouldFetchReviews(config)) {
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

    // Fetch videos if none exist and video config allows it
    if (existingVideos.length === 0 && VideoService.shouldFetchVideos(config)) {
      const videoResult = await VideoService.fetchAndSaveVideos(
        product.id,
        product.title
      );
      if (videoResult.success && videoResult.videoCount > 0) {
        existingVideos = await getProductVideos(product.id);
      }
    }

    // Generate review summary if needed and we have reviews
    if (!product.reviews_summary && existingReviews.length > 0) {
      try {
        const reviewTexts = existingReviews.map(r => r.review_text).filter(Boolean);
        if (reviewTexts.length > 0) {
          const summary = await summarizeReviews(reviewTexts, product.title);
          product.reviews_summary = summary;
        }
      } catch (error) {
        console.error('Error generating review summary:', error);
      }
    }

    const productDetails: ProductDetails = {
      ...product,
    };

    return new Response(
      JSON.stringify({
        success: true,
        product: productDetails,
        reviews: existingReviews,
        videos: existingVideos.length > 0 ? existingVideos : await getProductVideos(product.id),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fetch-product-details:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});