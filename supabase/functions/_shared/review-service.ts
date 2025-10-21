// Review fetching service with configuration support

import { config } from './config.ts';
import { saveProductReviews } from './database-service.ts';
import { FetchConfigService } from './fetch-config.ts';
import { ReviewFetcherFactory } from './review-fetchers.ts';
import type { FetchConfig, ProductSource, Review } from './types.ts';

export const ReviewService = {
  /**
   * Fetch and save reviews for a product based on current configuration
   */
  async fetchAndSaveReviews(
    productId: string,
    productName: string,
    productSource: ProductSource,
    sourceId?: string,
    signal?: AbortSignal,
    origin?: 'oxy' | 'serp'
  ): Promise<{ success: boolean; reviewCount: number; error?: string }> {
    try {
      const config = FetchConfigService.getConfig();
      const hasEnabledChannels = ReviewService.shouldFetchReviews(config)

      if (!hasEnabledChannels) {
        console.log('No review channels enabled, skipping review fetch');
        return { success: true, reviewCount: 0 };
      }

      console.log(`Fetching reviews for product: ${productName} (${productSource})`);

      // Create enabled review fetchers
      // const fetchers = ReviewFetcherFactory.createEnabledFetchers(config.review_channels);

      // Initialize reviews array
      const allReviews: Review[] = [];

      // Route to SerpAPI Reviews Results for Google products when origin is serp
      if (productSource === 'Google' && origin === 'serp') {
        const serpApiKey = config.serp.apiKey;
        if (serpApiKey && sourceId) {
          const serpReviews = await ReviewService.fetchGoogleSerpReviews(sourceId, signal);
          allReviews.push(...serpReviews);
        }
      }

      // Create enabled review fetchers (source/native, firecrawl, AI) as fallback/additional channels
      const fetchers = ReviewFetcherFactory.createEnabledFetchers(config.review_channels);

      // Fetch reviews from traditional sources if any fetchers are available
      if (fetchers.length > 0) {
        const fetchPromises = fetchers.map(async (fetcher) => {
          try {
            console.log(`Fetching reviews from ${fetcher.getSourceType()}`);
            const reviews = await fetcher.fetchReviews(
              sourceId || productId,
              productName,
              productSource,
              signal
            );
            // If Firecrawl, log structure for debugging
            if (fetcher.getSourceType() === 'firecrawl_external') {
              reviews.forEach((review, idx) => {
                const requiredFields = ['rating', 'title', 'review_text'];
                for (const field of requiredFields) {
                  if (typeof (review as any)[field] === 'undefined') {
                    console.warn(`Firecrawl review at index ${idx} missing required field: ${field}`, review);
                  }
                }
              });
            }
            return reviews;
          } catch (error) {
            console.error(`Error with ${fetcher.getSourceType()} fetcher:`, error);
            return [];
          }
        });

        const reviewBatches = await Promise.all(fetchPromises);
        reviewBatches.forEach((batch) => { allReviews.push(...batch); });
      }

      console.log(`Fetched ${allReviews.length} total reviews`);

      // Save reviews to database
      if (allReviews.length > 0) {
        await saveProductReviews(productId, allReviews);
        console.log(`Successfully saved ${allReviews.length} reviews for product ${productId}`);
      }

      return {
        success: true,
        reviewCount: allReviews.length
      };

    } catch (error) {
      console.error('Error in review service:', error);
      return {
        success: false,
        reviewCount: 0,
        error: error.message || 'Unknown error occurred'
      };
    }
  },

  // Use SerpAPI Reviews Results for Google product reviews
  async fetchGoogleSerpReviews(productId: string, signal?: AbortSignal): Promise<Review[]> {
    try {
      const serpApiKey = config.serp.apiKey;
      if (!serpApiKey) return [];
      const url = `https://serpapi.com/search.json?engine=google_product_reviews&product_id=${encodeURIComponent(productId)}&api_key=${encodeURIComponent(serpApiKey)}&gl=us&hl=en`;
      const res = await fetch(url, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      const arr = data?.reviews_results?.reviews || data?.reviews || [];
      if (!Array.isArray(arr)) return [];
      return arr.map((r: any): Review => ({
        rating: typeof r.rating === 'number' ? r.rating : parseInt(r.rating, 10) || 0,
        title: r.title || r.summary || '',
        review_text: r.text || r.content || r.snippet || '',
        reviewer_name: r.author || r.user || 'Anonymous',
        verified_purchase: Boolean(r.verified_purchase),
        review_date: r.date || r.time || new Date().toISOString(),
        source: 'Google',
      }));
    } catch (e) {
      console.error('Error fetching Google SerpAPI reviews:', e);
      return [];
    }
  },

  /**
   * Get review summary statistics
   */
  async getReviewStats(_productId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    try {
      // This would fetch from database and calculate stats
      // Implementation depends on your specific needs
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: {}
      };
    } catch (error) {
      console.error('Error getting review stats:', error);
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: {}
      };
    }
  },

  /**
   * Check if review fetching should be attempted for a product
   */
  shouldFetchReviews(config: FetchConfig): boolean {
    return config.review_channels.source_api ||
      config.review_channels.firecrawl_external ||
      config.review_channels.ai_reviews;
  },

  /**
   * Generate AI reviews for a product based on internet research
   */
  async generateAIReviews(productName: string, source: ProductSource): Promise<Review[]> {
    try {
      console.log(`Getting reviews using AI for ${productName} from ${source}`);

      const config = FetchConfigService.getConfig();
      const reviewCount = config.review_channels.ai_reviews_count || 5;

      // Import and use the AI service to generate realistic reviews
      const { generateAIReviews: generateAIReviewsFromService } = await import('./ai-service.ts');

      const aiReviews = await generateAIReviewsFromService(productName, reviewCount);

      // Convert AI service format to Review format
      const reviews: Review[] = aiReviews.map((aiReview, _index) => ({
        rating: aiReview.rating,
        title: aiReview.title,
        review_text: aiReview.text,
        reviewer_name: aiReview.author,
        verified_purchase: false,
        source: aiReview.source || 'Internet Research',
        review_date: aiReview.review_date ? new Date(aiReview.review_date).toISOString() : new Date().toISOString(),
        positive_feedback: aiReview.positive_feedback || Math.floor(Math.random() * 10) + 1,
        negative_feedback: aiReview.negative_feedback || Math.floor(Math.random() * 3)
      }));

      console.log(`Generated ${reviews.length} AI reviews for ${productName}`);
      return reviews;
    } catch (error) {
      console.error('Error generating AI reviews:', error);
      return [];
    }
  },
} as const;