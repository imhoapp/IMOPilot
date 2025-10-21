// Database operations module for products and videos

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { fetchYouTubeVideos } from './youtube-api.ts';

import { config } from '../_shared/config.ts';
const supabaseUrl = config.supabase.url;
const supabaseServiceKey = config.supabase.key;

export interface ProcessedProduct {
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  product_url: string | null;
  external_url: string | null;
  query: string;
  source: string;
  imo_score: number;
  pros: string[];
  cons: string[];
  reviews_summary: string | null;
  site_rating: number | null;
  product_reviews?: HomeDepotReview[];
}

export interface HomeDepotReview {
  external_review_id: string;
  reviewer_name: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  verified_purchase: boolean;
  review_date: string | null;
  positive_feedback: number;
  negative_feedback: number;
}

export interface DatabaseError {
  product: string;
  error: string;
}

export async function upsertProductsAndFetchVideos(
  products: ProcessedProduct[]
): Promise<{ insertedProducts: any[]; errors: DatabaseError[] }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const errors: DatabaseError[] = [];

  // Remove product_reviews from products before upserting
  const productsForDatabase = products.map(({ product_reviews, ...product }) => product);

  // Upsert products in the database
  const { data: upsertedProducts, error: upsertError } = await supabase
    .from('products')
    .upsert(productsForDatabase, { onConflict: 'product_url' })
    .select();

  if (upsertError) {
    throw new Error(`Database error: ${upsertError.message}`);
  }

  const insertedProducts = upsertedProducts || [];

  // Process each product for reviews and videos
  for (let i = 0; i < insertedProducts.length; i++) {
    const product = insertedProducts[i];
    const originalProduct = products[i];
    
    try {
      // Save product reviews if available
      if (originalProduct.product_reviews && originalProduct.product_reviews.length > 0) {
        console.log(`Saving ${originalProduct.product_reviews.length} product reviews for: ${product.title}`);
        
        const reviewsToInsert = originalProduct.product_reviews.map(review => ({
          product_id: product.id,
          external_review_id: review.external_review_id,
          reviewer_name: review.reviewer_name,
          rating: review.rating,
          title: review.title,
          review_text: review.review_text,
          verified_purchase: review.verified_purchase,
          review_date: review.review_date ? new Date(review.review_date).toISOString() : null,
          positive_feedback: review.positive_feedback,
          negative_feedback: review.negative_feedback
        }));

        // Delete existing product reviews for this product
        await supabase
          .from('product_reviews')
          .delete()
          .eq('product_id', product.id);

        // Insert new reviews
        const { error: reviewsError } = await supabase
          .from('product_reviews')
          .insert(reviewsToInsert);

        if (reviewsError) {
          console.error('Error inserting product reviews:', reviewsError);
          errors.push({ product: product.title, error: `Reviews error: ${reviewsError.message}` });
        } else {
          console.log(`Inserted ${reviewsToInsert.length} product reviews for ${product.title}`);
        }
      }

      // Fetch YouTube videos for this product with timeout protection
      try {
        const youtubeVideos = await fetchYouTubeVideos(product.title, product.id);
        console.log(`Found ${youtubeVideos.length} curated YouTube videos for product: ${product.title}`);
        
        if (youtubeVideos.length > 0) {
          // First, delete existing videos for this product to avoid duplicates
          await supabase
            .from('videos')
            .delete()
            .eq('product_id', product.id);
          
          const { error: videosError } = await supabase
            .from('videos')
            .insert(youtubeVideos.map(video => ({
              ...video,
              product_id: product.id
            })));
            
          if (videosError) {
            console.error(`Error inserting videos for product ${product.title}:`, videosError);
            errors.push({ product: product.title, error: `Videos error: ${videosError.message}` });
          } else {
            console.log(`Successfully saved ${youtubeVideos.length} curated videos for product: ${product.title}`);
          }
        }
      } catch (error) {
        console.error(`Error fetching/saving YouTube videos for product ${product.title}:`, error);
        errors.push({ product: product.title, error: `YouTube fetch error: ${error.message}` });
        // Continue processing other products even if YouTube fails
      }
      
    } catch (error) {
      console.error('Error processing product data:', error);
      errors.push({ product: product.title, error: error.message });
    }
  }

  return { insertedProducts, errors };
}