// Supabase database operations
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { config } from './config.ts';
import type { Product, Review, Video } from './types.ts';

const supabase = createClient(config.supabase.url, config.supabase.key);

export async function upsertProducts(products: Product[]): Promise<Product[]> {
  if (products.length === 0) return [];

  // Validate products before saving - filter out any with invalid or missing data
  const validProducts = products.filter(product => {
    const hasValidData = product.title &&
      product.source &&
      product.source_id &&
      typeof product.price === 'number' &&
      product.price > 0;

    if (!hasValidData) {
      console.warn('Invalid product data detected, skipping:', {
        title: product.title,
        source: product.source,
        source_id: product.source_id,
        price: product.price
      });
      return false;
    }

    return true;
  });

  if (validProducts.length === 0) {
    console.warn('No valid products to save after validation');
    return [];
  }

  // Remove duplicates based on source and source_id to prevent conflict errors
  const uniqueProducts = validProducts.reduce((acc, product) => {
    const key = `${product.source}-${product.source_id}`;
    if (!acc.has(key)) {
      acc.set(key, product);
    }
    return acc;
  }, new Map<string, Product>());

  const deduplicatedProducts = Array.from(uniqueProducts.values());

  // Strip transient/non-DB fields before upsert (e.g., origin)
  const sanitizedProducts = deduplicatedProducts.map((p) => {
    const { origin, ...rest } = p as any;
    return rest as Product;
  });

  const { data, error } = await supabase
    .from('products')
    .upsert(sanitizedProducts, {
      onConflict: 'source,source_id',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error('Error upserting products:', error);
    throw new Error(`Failed to save products: ${error.message}`);
  }

  return data || [];
}

export async function getProduct(productId: string): Promise<Product | null> {
  // Validate productId before making the query
  if (!productId || typeof productId !== 'string' || productId === 'undefined' || productId === 'null') {
    console.error('Invalid productId provided to getProduct:', productId);
    return null;
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    console.error('Invalid UUID format for productId:', productId);
    return null;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  return data;
}

export async function getProductBySourceId(
  source: string,
  sourceId: string
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('source', source)
    .eq('source_id', sourceId)
    .single();

  if (error) {
    console.error('Error fetching product by source ID:', error);
    return null;
  }

  return data;
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    throw new Error(`Failed to update product: ${error.message}`);
  }

  return data;
}

export async function saveProductReviews(
  productId: string,
  reviews: Review[]
): Promise<void> {
  if (reviews.length === 0) return;

  // Transform reviews to include product_id
  const reviewsWithProductId = reviews.map(review => ({
    ...review,
    product_id: productId,
    external_review_id: `${review.source}_${productId}_${Date.now()}_${Math.random()}`,
    reviewer_name: review.reviewer_name || null,
    verified_purchase: review.verified_purchase || false,
    review_date: review.review_date ? new Date(review.review_date).toISOString() : null,
    title: review.title || null,
    review_text: review.review_text,
    rating: review.rating,
    positive_feedback: 0,
    negative_feedback: 0,
  }));

  const { error } = await supabase
    .from('product_reviews')
    .upsert(reviewsWithProductId, {
      onConflict: 'external_review_id',
      ignoreDuplicates: true
    });

  if (error) {
    console.error('Error saving reviews:', error);
    throw new Error(`Failed to save reviews: ${error.message}`);
  }
}

export async function saveProductVideos(
  productId: string,
  videos: Video[]
): Promise<void> {
  if (videos.length === 0) return;

  // Transform videos to include product_id and ensure unique video_url
  const videosWithProductId = videos.map(video => ({
    ...video,
    product_id: productId,
  }));

  const { error } = await supabase
    .from('videos')
    .upsert(videosWithProductId, {
      onConflict: 'product_id,video_url',
      ignoreDuplicates: true
    });

  if (error) {
    console.error('Error saving videos:', error);
    throw new Error(`Failed to save videos: ${error.message}`);
  }

  console.log(`Successfully saved ${videos.length} videos for product ${productId}`);
}

// Check if product has sufficient videos based on current config
export async function hasSufficientVideos(productId: string, requiredCount: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('id')
      .eq('product_id', productId)
      .limit(requiredCount);

    if (error) {
      console.error('Error checking video count:', error);
      return false;
    }

    return (data && data.length >= requiredCount);
  } catch (error) {
    console.error('Error checking sufficient videos:', error);
    return false;
  }
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('review_date', { ascending: false });

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }

  return data?.map(review => ({
    rating: review.rating,
    title: review.title || '',
    review_text: review.review_text || '',
    source: review.source as any,
    reviewer_name: review.reviewer_name || undefined,
    verified_purchase: review.verified_purchase || false,
    review_date: review.review_date || undefined,
  })) || [];
}

export async function getProductVideos(productId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('product_id', productId)
    .order('views', { ascending: false });

  if (error) {
    console.error('Error fetching videos:', error);
    return [];
  }

  return data || [];
}

export async function searchExistingProducts(
  query: string,
  minPrice?: number,
  _daysOld?: number
): Promise<Product[]> {
  let queryBuilder = supabase
    .from('products')
    .select('*')
    .eq('query', query.toLowerCase());

  if (minPrice !== undefined) {
    queryBuilder = queryBuilder.gte('price', minPrice);
  }

  // Note: daysOld parameter is kept for compatibility but we now return ALL products
  // Freshness filtering is only used for determining whether to fetch new data

  const { data, error } = await queryBuilder
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching existing products:', error);
    return [];
  }

  return data || [];
}

// New function to get only fresh products for freshness checking
export async function getFreshProducts(
  query: string,
  minPrice?: number,
  daysOld: number = 7
): Promise<Product[]> {
  let queryBuilder = supabase
    .from('products')
    .select('*')
    .eq('query', query.toLowerCase());

  if (minPrice !== undefined) {
    queryBuilder = queryBuilder.gte('price', minPrice);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  queryBuilder = queryBuilder.gte('created_at', cutoffDate.toISOString());

  const { data, error } = await queryBuilder
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching fresh products:', error);
    return [];
  }

  return data || [];
}

export async function getProductsNeedingAnalysis(
  query: string,
  limit: number = 12,
  offset: number = 0
): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('query', query.toLowerCase())
    .eq('needs_ai_analysis', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching products needing analysis:', error);
    return [];
  }

  return data || [];
}

export async function updateProductsAnalysisStatus(
  productIds: string[],
  needsAnalysis: boolean
): Promise<void> {
  if (productIds.length === 0) return;

  const { error } = await supabase
    .from('products')
    .update({ needs_ai_analysis: needsAnalysis })
    .in('id', productIds);

  if (error) {
    console.error('Error updating products analysis status:', error);
    throw new Error(`Failed to update products analysis status: ${error.message}`);
  }
}

// Check if product has recent reviews (within specified days)
export async function hasRecentReviews(productId: string, daysOld: number = 7): Promise<boolean> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('product_id', productId)
      .gte('created_at', cutoffDate.toISOString())
      .limit(1);

    if (error) {
      console.error('Error checking recent reviews:', error);
      return false;
    }

    return (data && data.length > 0);
  } catch (error) {
    console.error('Error checking recent reviews:', error);
    return false;
  }
}