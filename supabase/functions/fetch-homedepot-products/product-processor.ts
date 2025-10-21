// Product processing module that combines all data sources

import { analyzeProductWithAI } from './ai-analysis.ts';
import { extractProductImages, extractPrice } from './image-utils.ts';
import { fetchProductDetails, fetchProductReviews } from './serpapi-client.ts';
import { summarizeReviews } from './review-summarizer.ts';
import type { ProcessedProduct, HomeDepotReview } from './database-operations.ts';

export async function processProducts(products: any[], query: string, testMode = false): Promise<ProcessedProduct[]> {
  const processedProducts: ProcessedProduct[] = [];
  
  // OPTIMIZATION: Process 1 product for test mode, 8 for production
  const maxProducts = testMode ? 1 : 8;
  const topProducts = products.slice(0, maxProducts);
  console.log(`Processing ${topProducts.length} products${testMode ? ' (TEST MODE)' : ''} (limited from ${products.length} for performance)`);
  
  // OPTIMIZATION: Process products in parallel batches of 3 (or 1 in test mode)
  const batchSize = testMode ? 1 : 3;
  for (let i = 0; i < topProducts.length; i += batchSize) {
    const batch = topProducts.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (item) => {
      try {
        return await processProduct(item, query);
      } catch (error) {
        console.error(`Error processing product ${item.title}:`, error);
        return null; // Return null for failed products
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Add successful results to processed products
    for (const result of batchResults) {
      if (result) {
        processedProducts.push(result);
      }
    }
  }

  console.log(`Total processed products: ${processedProducts.length}`);
  return processedProducts;
}

// OPTIMIZATION: Extract single product processing with timeout handling
async function processProduct(item: any, query: string): Promise<ProcessedProduct | null> {
  // Extract price from product data
  const price = extractPrice(item);
  
  if (price < 250) {
    return null; // Skip products under $250
  }

  // Use the product_id directly from SerpAPI response
  const productId = item.product_id;
  console.log(`Product ID: ${productId} for: ${item.title}`);

  // OPTIMIZATION: Set timeout for all API calls to prevent hanging
  const timeout = 25000; // 25 seconds timeout per product

  try {
    // Process all API calls in parallel with timeout
    const [aiAnalysis, productDetailsData, reviewsData] = await Promise.all([
      // AI analysis with timeout
      Promise.race([
        analyzeProductWithAI(item),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI analysis timeout')), timeout))
      ]).catch(error => {
        console.error('AI analysis failed:', error);
        return { pros: [], cons: [], imo_score: 5 }; // Fallback
      }),
      
      // Product details with timeout (only if we have productId)
      productId ? Promise.race([
        fetchProductDetails(productId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Product details timeout')), timeout))
      ]).catch(error => {
        console.error('Product details failed:', error);
        return null; // Fallback
      }) : Promise.resolve(null),
      
      // Reviews with timeout (only if we have productId)  
      productId ? Promise.race([
        fetchProductReviews(productId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Reviews timeout')), timeout))
      ]).catch(error => {
        console.error('Reviews fetch failed:', error);
        return null; // Fallback
      }) : Promise.resolve(null),
    ]);

    let reviewsSummary = null;
    let siteRating = null;
    let homeDepotReviews: HomeDepotReview[] = [];
    let productDescription = item.description || item.title || null;
    
    // Initialize image data with fallback to search results
    let { imageUrl, imageUrls } = extractProductImages(item);

    // Process product details if available and extract better images
    if (productDetailsData?.product_results) {
      const productResults = productDetailsData.product_results;
      console.log(`Product details found for ${productId}`);
      
      productDescription = productResults.description || productDescription;
      if (productResults.rating) {
        siteRating = Math.round(parseFloat(productResults.rating) * 100) / 100;
        console.log(`Site rating for ${productId}: ${siteRating}`);
      }
      
      // Extract images from product details API - this gives us higher quality images
      if (productResults.images && Array.isArray(productResults.images) && productResults.images.length > 0) {
        console.log(`Found ${productResults.images.length} image arrays from product details`);
        
        // The images field contains arrays of image URLs at different resolutions
        const allImageUrls: string[] = [];
        
        productResults.images.forEach((imageArray: any) => {
          if (Array.isArray(imageArray)) {
            allImageUrls.push(...imageArray);
          }
        });
        
        if (allImageUrls.length > 0) {
          // Remove duplicates and prefer higher resolution images
          const uniqueImages = [...new Set(allImageUrls)];
          
          // Filter for high quality images and take up to 6 images
          const highQualityImages = uniqueImages
            .filter(url => url.includes('_600.jpg') || url.includes('_1000.jpg') || url.includes('_400.jpg'))
            .slice(0, 6);
          
          if (highQualityImages.length > 0) {
            imageUrls = highQualityImages;
            // Use the highest quality image as primary
            imageUrl = uniqueImages.find(url => url.includes('_1000.jpg')) || 
                     uniqueImages.find(url => url.includes('_600.jpg')) || 
                     uniqueImages.find(url => url.includes('_400.jpg')) ||
                     uniqueImages[0];
            console.log(`Updated product images for ${productId}: found ${imageUrls.length} high-quality images`);
          }
        }
      }
    }

    // Process reviews if available
    if (reviewsData?.reviews && reviewsData.reviews.length > 0) {
      console.log(`Processing ${reviewsData.reviews.length} reviews for ${productId}`);
      
      // Extract and format Home Depot reviews for database storage (limit to 15 for performance)
      homeDepotReviews = reviewsData.reviews.slice(0, 15).map((review: any) => ({
        external_review_id: review.id || `${productId}-${Date.now()}-${Math.random()}`,
        reviewer_name: review.reviewer?.name || null,
        rating: review.rating || 0,
        title: review.title || null,
        review_text: review.text || null,
        verified_purchase: review.badges?.includes('verifiedPurchaser') || false,
        review_date: review.time || null,
        positive_feedback: review.total_positive_feedback || 0,
        negative_feedback: review.total_negative_feedback || 0
      }));

      // Format reviews for AI summarization (limit to 10 for performance)
      const formattedReviews = reviewsData.reviews.slice(0, 10).map((review: any) => ({
        rating: review.rating || 0,
        title: review.title || '',
        text: review.text || ''
      }));
      
      try {
        console.log(`Summarizing ${formattedReviews.length} reviews for ${productId}`);
        // OPTIMIZATION: Add timeout to review summarization
        reviewsSummary = await Promise.race([
          summarizeReviews(formattedReviews),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Review summarization timeout')), timeout))
        ]);
        console.log(`Reviews summary for ${productId}: Generated successfully`);
      } catch (error) {
        console.error(`Error summarizing reviews:`, error);
        reviewsSummary = `Based on ${reviewsData.reviews.length} customer reviews with average rating of ${reviewsData.overall_rating || 'N/A'}.`; // Fallback
      }
      
      // Also extract the overall rating from reviews data if not found in product details
      if (!siteRating && reviewsData.overall_rating) {
        siteRating = Math.round(parseFloat(reviewsData.overall_rating) * 100) / 100;
        console.log(`Using overall rating from reviews for ${productId}: ${siteRating}`);
      }
    }

    const product: ProcessedProduct = {
      title: item.title || 'Unknown Product',
      description: productDescription,
      price: price,
      image_url: imageUrl,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      product_url: item.link || null,
      external_url: item.link || null,
      query: query.toLowerCase(),
      source: 'Home Depot',
      imo_score: aiAnalysis.imo_score,
      pros: aiAnalysis.pros,
      cons: aiAnalysis.cons,
      reviews_summary: reviewsSummary,
      site_rating: siteRating,
      product_reviews: homeDepotReviews
    };

    console.log(`Successfully processed product: ${product.title} with ${homeDepotReviews.length} reviews`);
    return product;

  } catch (error) {
    console.error(`Error processing product ${item.title}:`, error);
    return null;
  }
}