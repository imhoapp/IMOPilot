// Review fetching implementations based on configuration
import { Review, ProductSource } from './types.ts';
import { config } from './config.ts';
import { oxylabsClient } from './oxylabs-client.ts';
import { FetchConfigService } from './fetch-config.ts';

export interface ReviewFetcher {
  fetchReviews(productId: string, productName: string, source: ProductSource, signal?: AbortSignal): Promise<Review[]>;
  getSourceType(): 'source_api' | 'firecrawl_external' | 'ai_reviews';
}

// Native API review fetcher (Amazon, Walmart native reviews)
export class SourceApiReviewFetcher implements ReviewFetcher {
  async fetchReviews(productId: string, productName: string, source: ProductSource, signal?: AbortSignal): Promise<Review[]> {
    const reviews: Review[] = [];
    const fetchConfig = FetchConfigService.getConfig();

    try {
      if (source === 'Amazon') {
        // Temporarily disable Amazon review API due to upstream issues
        console.log('Amazon review API temporarily disabled - skipping Amazon reviews');
      } else if (source === 'Walmart') {
        // Try Walmart SerpApi reviews first if enabled
        const serpApiKey = config.serp?.apiKey;
        if (fetchConfig.product_sources?.walmart_serp && serpApiKey) {
          const walmartSerpReviews = await this.fetchWalmartSerpReviews(productId, serpApiKey, signal);
          reviews.push(...walmartSerpReviews);
        } else {
          const walmartReviews = await this.fetchWalmartReviews(productId, signal);
          reviews.push(...walmartReviews);
        }
      } else if (source === 'HomeDepot') {
        const homeDepotReviews = await this.fetchHomeDepotReviews(productId, productName, signal);
        reviews.push(...homeDepotReviews);
      } else if (source === 'Google') {
        const googleReviews = await this.fetchGoogleReviews(productName, signal);
        reviews.push(...googleReviews);
      }

    } catch (error) {
      console.error(`Error fetching ${source} reviews:`, error);
    }

    return reviews;
  }

  private async fetchAmazonReviews(productId: string, signal?: AbortSignal): Promise<Review[]> {
    try {
      console.log(`Fetching Amazon reviews for ASIN: ${productId}`);

      const reviewsData = await oxylabsClient.getAmazonReviews(productId, 3, signal);
      console.log('Amazon reviews fetched successfully', reviewsData);

      return this.normalizeAmazonReviews(reviewsData?.reviews || []);
    } catch (error) {
      console.error('Error fetching Amazon reviews:', error);
      return [];
    }
  }

  private async fetchWalmartReviews(productId: string, signal?: AbortSignal): Promise<Review[]> {
    try {
      // Use Oxylabs to fetch Walmart product reviews
      const response = await fetch(config.oxylabs.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${config.oxylabs.username}:${config.oxylabs.password}`)}`,
        },
        body: JSON.stringify({
          source: 'walmart_reviews',
          domain: 'com',
          query: productId,
          start_page: 1,
          pages: 2, // Fetch first 2 pages of reviews
          parse: true
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`Walmart reviews API error: ${response.status}`);
      }

      const data = await response.json();
      return this.normalizeWalmartReviews(data.results?.[0]?.content?.reviews || []);
    } catch (error) {
      console.error('Error fetching Walmart reviews:', error);
      return [];
    }
  }

  private normalizeAmazonReviews(rawReviews: any[]): Review[] {
    return rawReviews.map(review => ({
      rating: review.rating || 0,
      title: review.title || '',
      review_text: review.content || '',
      reviewer_name: review.author || 'Anonymous',
      verified_purchase: review.is_verified === true,
      review_date: review.timestamp || new Date().toISOString(),
      source: 'Amazon',
    })).filter(review => review.review_text.length > 10); // Filter out very short reviews
  }

  private normalizeWalmartReviews(rawReviews: any[]): Review[] {
    return rawReviews.map(review => ({
      rating: review.rating || 0,
      title: review.title || '',
      review_text: review.content || review.text || '',
      reviewer_name: review.author || 'Anonymous',
      verified_purchase: review.verified_purchase === true,
      review_date: review.date || new Date().toISOString(),
      source: 'Walmart',
    })).filter(review => review.review_text.length > 10);
  }

  private async fetchGoogleReviews(productName: string, signal?: AbortSignal): Promise<Review[]> {
    try {
      const serpApiKey = config.serp.apiKey;
      if (!serpApiKey) {
        console.error('SerpAPI key not found for Google reviews');
        return [];
      }

      const response = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(productName + ' reviews')}&api_key=${serpApiKey}&num=20`, {
        signal
      });

      if (!response.ok) {
        console.error('Google reviews API error:', response.status);
        return [];
      }

      const data = await response.json();
      const reviews: Review[] = [];

      // Extract reviews from organic results
      (data.organic_results || []).forEach((result: any) => {
        if (result.snippet && this.isReviewContent(result.snippet)) {
          reviews.push({
            rating: this.extractRating(result.snippet),
            title: result.title || '',
            review_text: result.snippet,
            reviewer_name: result.title?.split(' - ')[0] || 'Anonymous',
            verified_purchase: false,
            review_date: new Date().toISOString(),
            source: 'Google',
          });
        }
      });

      return reviews.slice(0, 10); // Limit to top 10 Google results
    } catch (error) {
      console.error('Error fetching Google reviews:', error);
      return [];
    }
  }

  private async fetchHomeDepotReviews(productId: string, productName: string, signal?: AbortSignal): Promise<Review[]> {
    try {
      const serpApiKey = config.serp.apiKey;
      if (!serpApiKey) {
        console.error('SerpAPI key not found for Home Depot reviews');
        return [];
      }

      // Fetch reviews for the specific product
      const reviewsResponse = await fetch(`https://serpapi.com/search.json?engine=home_depot_product&product_id=${productId}&api_key=${serpApiKey}`, {
        signal
      });

      if (!reviewsResponse.ok) {
        console.error('Home Depot reviews API error:', reviewsResponse.status);
        return [];
      }

      const reviewsData = await reviewsResponse.json();

      return (reviewsData.reviews || []).map((review: any) => ({
        rating: review.rating || 3,
        title: review.title || '',
        review_text: review.review || review.text || '',
        reviewer_name: review.reviewer_name || 'Anonymous',
        verified_purchase: review.verified_purchase || false,
        review_date: review.date ? new Date(review.date).toISOString() : new Date().toISOString(),
        source: 'HomeDepot',
      })); // Limit to 15 reviews

    } catch (error) {
      console.error('Error fetching Home Depot reviews:', error);
      return [];
    }
  }

  private isReviewContent(text: string): boolean {
    const reviewIndicators = [
      'review', 'rating', 'stars', 'bought', 'purchased', 'recommend',
      'quality', 'price', 'value', 'pros', 'cons', 'good', 'bad', 'excellent', 'terrible'
    ];
    const lowerText = text.toLowerCase();
    return reviewIndicators.some(indicator => lowerText.includes(indicator)) && text.length > 50;
  }

  private extractRating(text: string): number {
    // Try to extract rating from text
    const ratingPatterns = [
      /(\d+)\/5/,
      /(\d+) out of 5/,
      /(\d+) stars/,
      /rated? (\d+)/i,
    ];

    for (const pattern of ratingPatterns) {
      const match = text.match(pattern);
      if (match) {
        const rating = parseInt(match[1]);
        if (rating >= 1 && rating <= 5) {
          return rating;
        }
      }
    }

    // Sentiment-based rating fallback
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'best'];
    const negativeWords = ['terrible', 'awful', 'hate', 'worst', 'bad', 'horrible'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 4;
    if (negativeCount > positiveCount) return 2;
    return 3; // Neutral
  }

  /**
   * Fetch Walmart reviews using SerpApi (walmart_product_reviews engine)
   */
  private async fetchWalmartSerpReviews(productId: string, serpApiKey: string, signal?: AbortSignal): Promise<Review[]> {
    try {
      const allReviews: Review[] = [];
      for (let page = 1; page <= 2; page++) {
        const url = `https://serpapi.com/search.json?engine=walmart_product_reviews&product_id=${productId}&api_key=${serpApiKey}&page=${page}`;
        const response = await fetch(url, { signal });
        if (!response.ok) {
          console.error(`SerpApi Walmart reviews error (page ${page}):`, response.statusText);
          break;
        }
        const data = await response.json();
        if (Array.isArray(data.reviews)) {
          allReviews.push(...data.reviews.map((review: any) => ({
            rating: typeof review.rating === 'number' ? review.rating : parseInt(review.rating) || 0,
            title: review.title || '',
            review_text: review.text || '',
            reviewer_name: review.user_nickname || 'Anonymous',
            verified_purchase: Array.isArray(review.customer_type) ? review.customer_type.includes('VerifiedPurchaser') : false,
            review_date: review.review_submission_time || new Date().toISOString(),
            source: 'Walmart',
          })));
        }
        // Stop if no more reviews
        if (!data.reviews || data.reviews.length === 0) break;
      }
      return allReviews;
    } catch (error) {
      console.error('Error fetching Walmart SerpApi reviews:', error);
      return [];
    }
  }

  getSourceType(): 'source_api' {
    return 'source_api';
  }
}

// External review fetcher using FireCrawl (Reddit, blogs, forums)
export class FirecrawlExternalReviewFetcher implements ReviewFetcher {
  async fetchReviews(productId: string, productName: string, source: ProductSource, signal?: AbortSignal): Promise<Review[]> {
    try {
      const searchQueries = this.generateSearchQueries(productName);
      const allReviews: Review[] = [];

      for (const query of searchQueries) {
        try {
          const reviews = await this.searchExternalReviews(query, productName, signal);
          allReviews.push(...reviews);

          // Add delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error searching for "${query}":`, error);
          continue;
        }
      }

      return allReviews.slice(0, FetchConfigService.getConfig().review_channels.external_review_limit); // Limit to 20 external reviews
    } catch (error) {
      console.error('Error fetching external reviews:', error);
      return [];
    }
  }

  private generateSearchQueries(productName: string): string[] {
    const cleanName = productName.replace(/[^\w\s]/g, '').trim();
    return [
      `${cleanName} review reddit`,
      `${cleanName} pros cons reddit`,
      `${cleanName} experience review`,
      `is ${cleanName} worth it reddit`,
      `${cleanName} review forum`,
      `${cleanName} review blog`,
      `${cleanName} user opinions`,
      `${cleanName} complaints forum`,
      `${cleanName} testimonials blog`,
    ];
  }

  private async searchExternalReviews(query: string, productName: string, signal?: AbortSignal): Promise<Review[]> {
    try {
      const response = await fetch(`${config.firecrawl.baseUrl}/v0/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.firecrawl.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          pageOptions: {
            includeHtml: false,
            includeRawHtml: false,
            onlyMainContent: true
          },
          limit: FetchConfigService.getConfig().review_channels.external_review_limit
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`FireCrawl API error: ${response.status}`);
      }

      const data = await response.json();
      return this.extractReviewsFromContent(data.data || [], productName);
    } catch (error) {
      console.error('Error with FireCrawl search:', error);
      return [];
    }
  }

  private extractReviewsFromContent(searchResults: any[], _productName: string): Review[] {
    const reviews: Review[] = [];
    for (const result of searchResults) {
      try {
        const content = result.content || '';
        const _url = result.metadata?.url || '';
        // Extract review-like content using simple patterns
        const reviewPatterns = [
          /(?:I bought|I purchased|I got|I have|I own)[\s\S]{20,300}(?:\.|!|\?)/gi,
          /(?:Great|Good|Bad|Terrible|Amazing|Awful|Love|Hate)[\s\S]{20,300}(?:\.|!|\?)/gi,
          /(?:Rating|Score|Stars?)[\s\S]{10,200}(?:\.|!|\?)/gi,
        ];
        for (const pattern of reviewPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            for (const match of matches.slice(0, 2)) { // Max 2 reviews per page
              const cleanText = match.trim();
              if (cleanText.length > 30 && cleanText.length < 500) {
                reviews.push({
                  rating: this.extractRating(cleanText),
                  title: result.metadata?.title || 'External Review',
                  review_text: cleanText,
                  reviewer_name: 'External User',
                  verified_purchase: false,
                  review_date: new Date().toISOString(),
                  source: 'FireCrawl',
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error extracting review from content:', error);
        continue;
      }
    }
    return reviews;
  }

  private extractRating(text: string): number {
    // Try to extract rating from text
    const ratingPatterns = [
      /(\d+)\/5/,
      /(\d+) out of 5/,
      /(\d+) stars/,
      /rated? (\d+)/i,
    ];

    for (const pattern of ratingPatterns) {
      const match = text.match(pattern);
      if (match) {
        const rating = parseInt(match[1]);
        if (rating >= 1 && rating <= 5) {
          return rating;
        }
      }
    }

    // Sentiment-based rating fallback
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'best'];
    const negativeWords = ['terrible', 'awful', 'hate', 'worst', 'bad', 'horrible'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 4;
    if (negativeCount > positiveCount) return 2;
    return 3; // Neutral
  }

  private determineSource(url: string): ProductSource {
    if (url.includes('reddit.com')) return 'Reddit' as any;
    if (url.includes('amazon.com')) return 'Amazon';
    if (url.includes('walmart.com')) return 'Walmart';
    return 'External' as any;
  }

  getSourceType(): 'firecrawl_external' {
    return 'firecrawl_external';
  }
}

// AI-generated review fetcher
export class AIReviewFetcher implements ReviewFetcher {
  async fetchReviews(productId: string, productName: string, source: ProductSource, signal?: AbortSignal): Promise<Review[]> {
    try {
      console.log(`Generating AI reviews for product: ${productName}`);

      // Import the review service to use generateAIReviews
      const { ReviewService } = await import('./review-service.ts');
      const reviews = await ReviewService.generateAIReviews(productName, source);

      console.log(`Generated ${reviews.length} AI reviews for ${productName}`);
      return reviews;
    } catch (error) {
      console.error('Error generating AI reviews:', error);
      return [];
    }
  }

  getSourceType(): 'ai_reviews' {
    return 'ai_reviews';
  }
}

// Review fetcher factory
export class ReviewFetcherFactory {
  static createEnabledFetchers(reviewChannels: { source_api: boolean; firecrawl_external: boolean; ai_reviews: boolean }): ReviewFetcher[] {
    const fetchers: ReviewFetcher[] = [];

    if (reviewChannels.source_api) {
      fetchers.push(new SourceApiReviewFetcher());
    }

    if (reviewChannels.firecrawl_external) {
      fetchers.push(new FirecrawlExternalReviewFetcher());
    }

    if (reviewChannels.ai_reviews) {
      fetchers.push(new AIReviewFetcher());
    }

    return fetchers;
  }
}