import { config } from './config.ts';
import { FetchConfigService } from './fetch-config.ts';
import { oxylabsClient } from './oxylabs-client.ts';
import type { Review } from './types.ts';

// --- Amazon Details Fetcher ---
async function fetchAmazonDetails(product: any): Promise<{ productData: any; reviews: any[] } | null> {
  try {
    console.log('[AMAZON DETAILS] Fetching details for source_id:', product.source_id);
    const amazonData = await oxylabsClient.getAmazonProductDetails(product.source_id);
    console.log('[AMAZON DETAILS] Raw data received:', JSON.stringify(amazonData, null, 2));

    const productData = mapAmazonDataToProduct(amazonData);
    const reviews = extractAmazonReviews(amazonData, product.id);

    console.log('[AMAZON DETAILS] Mapped product data:', JSON.stringify(productData, null, 2));
    console.log('[AMAZON DETAILS] Extracted reviews count:', reviews.length);

    return { productData, reviews };
  } catch (error) {
    console.error('[AMAZON DETAILS] Error fetching Amazon details:', error);
    return null;
  }
}

function mapAmazonDataToProduct(amazonData: any): any {
  const mapped: any = {};
  if (amazonData.description) mapped.description = amazonData.description;
  if (amazonData.bullet_points) mapped.bullet_points = amazonData.bullet_points;
  if (amazonData.images && amazonData.images.length > 0) {
    mapped.image_urls = amazonData.images;
    mapped.image_url = amazonData.images[0];
  }
  if (amazonData.brand || amazonData.manufacturer) mapped.brand = amazonData.brand || amazonData.manufacturer;
  if (amazonData.review_ai_summary) mapped.reviews_summary = amazonData.review_ai_summary;
  if (amazonData.reviews_count) mapped.reviews_count = amazonData.reviews_count;
  return mapped;
}

function extractAmazonReviews(amazonData: any, productId: string): any[] {
  if (!amazonData.reviews || !Array.isArray(amazonData.reviews)) return [];
  return amazonData.reviews.map((review: any) => ({
    rating: review.rating || 0,
    title: review.title || '',
    review_text: review.content || '',
    reviewer_name: review.author || null,
    verified_purchase: review.is_verified || false,
    review_date: review.timestamp ? new Date(review.timestamp.replace('Reviewed in the United States ', '')).toISOString() : null,
    external_review_id: review.id || `amazon_${productId}_${Date.now()}_${Math.random()}`,
    source: 'Amazon',
  }));
}

// --- Walmart Details Fetcher (SerpApi) ---
async function fetchWalmartDetails(product: any): Promise<{ productData: any; reviews: any[] } | null> {
  try {
    const serpApiKey = config.serp.apiKey;
    if (!serpApiKey) throw new Error('SerpApi API key not configured.');
    const url = `https://serpapi.com/search.json?engine=walmart_product&product_id=${product.source_id}&api_key=${serpApiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SerpApi error: ${response.statusText}`);
    const data = await response.json();
    const productData = mapWalmartDataToProduct(data.product_result);
    const reviews = extractWalmartReviews(data.reviews_results, product.id);
    return { productData, reviews };
  } catch (error) {
    console.error('Error fetching Walmart details:', error);
    return null;
  }
}

function mapWalmartDataToProduct(walmartData: any): any {
  if (!walmartData) return {};
  const mapped: any = {};
  mapped.title = walmartData.title;
  mapped.description = walmartData.short_description_html || '';
  mapped.brand = walmartData.manufacturer || walmartData.seller_name || '';
  mapped.image_urls = walmartData.images || [];
  mapped.image_url = walmartData.images && walmartData.images.length > 0 ? walmartData.images[0] : '';
  mapped.price = walmartData.price_map?.price;
  mapped.site_rating = walmartData.rating;
  mapped.reviews_count = walmartData.reviews;
  mapped.product_url = walmartData.product_page_url;
  mapped.external_url = walmartData.product_page_url;
  return mapped;
}

function extractWalmartReviews(reviews_results: any, productId: string): Review[] {
  if (!reviews_results || !reviews_results.reviews) return [];
  const customerReviews = reviews_results.reviews.customer_reviews || [];
  return customerReviews.map((review: any, idx: number) => ({
    rating: review.rating || 0,
    title: review.title || '',
    text: review.text || '',
    source: 'Walmart',
    reviewer_name: review.user_nickname || null,
    verified_purchase: review.customer_type?.includes('VerifiedPurchaser') || false,
    review_date: review.review_submission_time || null,
    external_review_id: review.id || `walmart_${productId}_${Date.now()}_${idx}`,
  }));
}

// --- Home Depot Details Fetcher (SerpApi, US only) ---
async function fetchHomeDepotDetails(product: any): Promise<{ productData: any; reviews: any[] } | null> {
  try {
    const serpApiKey = config.serp.apiKey;
    if (!serpApiKey) throw new Error('SerpApi API key not configured.');
    if (!product.source_id) throw new Error('Product source_id (product_id) is required for Home Depot details.');
    // Only US product_ids are supported
    const params: Record<string, string> = {
      engine: 'home_depot_product',
      product_id: product.source_id,
      api_key: serpApiKey,
    };
    if (product.delivery_zip) params.delivery_zip = product.delivery_zip;
    if (product.store_id) params.store_id = product.store_id;
    const url = `https://serpapi.com/search.json?${Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SerpApi error: ${response.statusText}`);
    const data = await response.json();
    const details = data.product_results;
    if (!details) return { productData: null, reviews: [] };
    // Map images (flatten arrays)
    let image_urls: string[] = [];
    let image_url = '';
    if (Array.isArray(details.images) && details.images.length > 0) {
      image_urls = details.images.flat();
      image_url = image_urls[image_urls.length - 1] || image_urls[0] || '';
    }
    // Map product fields
    const productData: any = {
      title: details.title || '',
      description: details.description || '',
      price: typeof details.price === 'number' ? details.price : undefined,
      image_url,
      image_urls,
      product_url: details.link || '',
      external_url: details.link || '',
      source: 'HomeDepot',
      source_id: details.product_id || '',
      site_rating: details.rating ? parseFloat(details.rating) : null,
      brand: typeof details.brand === 'object' ? details.brand.name : details.brand,
      // reviews_count: details.reviews ? parseInt(details.reviews) : undefined,
      bullet_points: details.bullets,
      // highlights: details.highlights,
    };
    return { productData, reviews: [] };
  } catch (error) {
    console.error('Error fetching Home Depot details:', error);
    return null;
  }
}

// --- Google Shopping Details Fetcher ---
async function fetchGoogleDetails(product: any): Promise<{ productData: any; reviews: any[] } | null> {
  try {
    if (FetchConfigService.getConfig().google_details_use_serp) {
      const serpApiKey = config.serp.apiKey;
      if (!serpApiKey) throw new Error('SerpApi API key not configured.');
      if (!product.source_id) throw new Error('Product source_id (product_id) is required for Google details.');

      const detailsUrl = `https://serpapi.com/search.json?engine=google_product&product_id=${encodeURIComponent(product.source_id)}&api_key=${encodeURIComponent(serpApiKey)}&gl=us&hl=en`;
      const detailsRes = await fetch(detailsUrl);
      if (!detailsRes.ok) throw new Error(`SerpApi google_product error: ${detailsRes.status}`);
      const detailsJson = await detailsRes.json();
      const productData = mapGoogleProductApiToProduct(detailsJson.product || detailsJson.product_result || detailsJson.product_results || detailsJson);

      let reviews: any[] = [];
      const pid = product.source_id || productData?.product_id;
      if (pid) {
        const reviewsUrl = `https://serpapi.com/search.json?engine=google_product_reviews&product_id=${encodeURIComponent(pid)}&api_key=${encodeURIComponent(serpApiKey)}&gl=us&hl=en`;
        const reviewsRes = await fetch(reviewsUrl);
        if (reviewsRes.ok) {
          const reviewsJson = await reviewsRes.json();
          reviews = extractGoogleProductReviews(reviewsJson, product.id);
        }
      }

      return { productData, reviews };
    }

    const googleData = await oxylabsClient.getGoogleProductDetails(product.source_id);
    const productData = mapGoogleDataToProduct(googleData);
    const reviews = extractGoogleReviews(googleData, product.id);
    return { productData, reviews };
  } catch (error) {
    console.error('Error fetching Google details:', error);
    return null;
  }
}

function mapGoogleDataToProduct(googleData: any): any {
  if (!googleData) return {};

  const mapped: any = {};

  // Basic product info
  if (googleData.title) mapped.title = googleData.title;
  if (googleData.description) mapped.description = googleData.description;
  if (googleData.highlights && Array.isArray(googleData.highlights)) {
    mapped.bullet_points = googleData.highlights;
  }

  // Enhanced image handling - collect all possible images
  const allImages: string[] = [];

  // From images object
  if (googleData.images) {
    if (googleData.images.full_size && Array.isArray(googleData.images.full_size)) {
      allImages.push(...googleData.images.full_size);
    }
    if (googleData.images.thumbnails && Array.isArray(googleData.images.thumbnails)) {
      allImages.push(...googleData.images.thumbnails);
    }
  }

  // From variants (additional product images)
  if (googleData.variants && Array.isArray(googleData.variants)) {
    googleData.variants.forEach((variant: any) => {
      if (variant.images) {
        if (Array.isArray(variant.images.full_size)) {
          allImages.push(...variant.images.full_size);
        }
        if (Array.isArray(variant.images.thumbnails)) {
          allImages.push(...variant.images.thumbnails);
        }
      }
    });
  }

  // Remove duplicates and filter valid URLs (exclude base64 images)
  const uniqueImages = [...new Set(allImages)].filter(url => {
    if (!url || typeof url !== 'string') return false;
    // Filter out base64 encoded images and ensure it's a valid HTTP URL
    return url.startsWith('http') && !url.startsWith('data:') && !url.match(/^[A-Za-z0-9+/]+=*$/);
  });

  if (uniqueImages.length > 0) {
    mapped.image_urls = uniqueImages;
    // Use the first full-size image as primary, fallback to first image
    mapped.image_url = googleData.images?.full_size?.[0] || uniqueImages[0];
  }

  // Pricing information
  if (googleData.pricing) {
    if (googleData.pricing.price) mapped.price = googleData.pricing.price;
    if (googleData.pricing.currency) mapped.currency = googleData.pricing.currency;
  }

  // Reviews and ratings
  if (googleData.reviews) {
    if (googleData.reviews.rating) mapped.site_rating = googleData.reviews.rating;
    if (googleData.reviews.reviews_count) mapped.reviews_count = googleData.reviews.reviews_count;
  }

  // Product specifications
  if (googleData.specifications && Array.isArray(googleData.specifications)) {
    mapped.specifications = googleData.specifications;
  }

  // Product URL
  if (googleData.url) {
    mapped.product_url = googleData.url;
    mapped.external_url = googleData.url;
  }

  // Additional product details keywords
  if (googleData.product_details_keywords && Array.isArray(googleData.product_details_keywords)) {
    mapped.product_keywords = googleData.product_details_keywords;
  }

  // Related items for cross-selling
  if (googleData.related_items && Array.isArray(googleData.related_items)) {
    mapped.related_items = googleData.related_items;
  }

  return mapped;
}

function extractGoogleReviews(googleData: any, productId: string): any[] {
  if (!googleData.reviews || !googleData.reviews.reviews_data || !Array.isArray(googleData.reviews.reviews_data)) {
    return [];
  }

  return googleData.reviews.reviews_data.map((review: any, idx: number) => ({
    rating: review.rating || 0,
    title: review.title || '',
    review_text: review.text || review.snippet || '',
    reviewer_name: review.user?.name || review.author || null,
    verified_purchase: review.verified_purchase || false,
    review_date: review.date || null,
    external_review_id: review.id || `google_${productId}_${Date.now()}_${idx}`,
    source: 'Google',
    helpful_votes: review.helpful_votes || 0,
  }));
}

// SerpApi google_product mapping
function mapGoogleProductApiToProduct(details: any): any {
  if (!details) return {};
  const mapped: any = {};
  mapped.title = details.title || '';
  mapped.description = details.description || details.product_description || '';
  const images: string[] = [];
  if (Array.isArray(details.images)) images.push(...details.images);
  if (details.images?.full_size) images.push(...details.images.full_size);
  if (details.images?.thumbnails) images.push(...details.images.thumbnails);
  mapped.image_urls = Array.from(new Set(images.filter((u: string) => typeof u === 'string' && u.startsWith('http'))));
  mapped.image_url = mapped.image_urls[0] || '';
  const priceNum = typeof details.price === 'number' ? details.price : (typeof details.extracted_price === 'number' ? details.extracted_price : undefined);
  if (typeof priceNum === 'number') mapped.price = priceNum;
  mapped.product_url = details.link || details.product_link || '';
  mapped.external_url = mapped.product_url;
  mapped.source = 'Google';
  mapped.source_id = details.product_id || details.id || null;
  mapped.site_rating = typeof details.rating === 'number' ? details.rating : (typeof details.average_rating === 'number' ? details.average_rating : null);
  mapped.brand = details.brand || undefined;
  return mapped;
}

// SerpApi reviews mapping (google_product_reviews engine)
function extractGoogleProductReviews(reviewsJson: any, productId: string): any[] {
  const reviewsArr = reviewsJson?.reviews_results?.reviews || reviewsJson?.reviews || [];
  if (!Array.isArray(reviewsArr)) return [];
  return reviewsArr.map((review: any, idx: number) => ({
    rating: typeof review.rating === 'number' ? review.rating : 0,
    title: review.title || review.summary || '',
    text: review.text || review.content || review.snippet || '',
    source: 'Google',
    reviewer_name: review.author || review.user || null,
    verified_purchase: Boolean(review.verified_purchase),
    review_date: review.date || review.time || null,
    external_review_id: review.review_id || review.id || `google_${productId}_${Date.now()}_${idx}`,
  }));
}

// --- Main dispatcher ---
export async function fetchDetailedProductInfo(product: any): Promise<{ productData: any; reviews: any[] } | null> {
  switch (product.source?.toLowerCase()) {
    case 'amazon':
      return await fetchAmazonDetails(product);
    case 'walmart':
      return await fetchWalmartDetails(product);
    case 'homedepot':
      return await fetchHomeDepotDetails(product);
    case 'google':
      return await fetchGoogleDetails(product);
    default:
      console.log(`Detailed fetching not implemented for source: ${product.source}`);
      return { productData: null, reviews: [] };
  }
}