// Product data normalization and adaptation
import { WalmartSearchResult } from './oxylabs-client.ts';
import {
  BaseProduct,
  GoogleShoppingProduct,
  AmazonProduct,
  ProductSource
} from './types.ts';
import {
  extractPrice,
  normalizeImageUrls,
  sanitizeText,
  generateSourceId,
  createUniqueProductUrl,
  isValidProduct
} from './utils.ts';
import { FetchConfigService } from './fetch-config.ts';

export function normalizeGoogleProduct(
  raw: GoogleShoppingProduct,
  query: string
): BaseProduct | null {
  if (!raw.title || !raw.price) return null;

  const price = extractPrice(raw.price);
  const minPrice = FetchConfigService.getConfig().filtering.minPrice;
  if (price < minPrice) {
    return null;
  }

  // Extract images from proper Google Shopping API structure
  const possibleImages = [];
  
  // Add full-size images first (highest quality)
  if (raw.images?.full_size?.length) {
    possibleImages.push(...raw.images.full_size);
  }
  
  // Add thumbnail images as fallback
  if (raw.images?.thumbnails?.length) {
    possibleImages.push(...raw.images.thumbnails);
  }
  
  // Fallback to legacy image fields if new structure not available
  if (possibleImages.length === 0) {
    [
      raw.thumbnail,
      raw.image,
      raw.product_image,
      ...(raw.images || [])
    ].filter(Boolean).forEach(img => possibleImages.push(img));
  }
  
  // Prefer real URLs; fallback to data URIs if none
  let validImages = possibleImages.filter(img => {
    if (!img || typeof img !== 'string') return false;
    // Keep only non-base64/non-data URLs first
    return !img.startsWith('data:') && !img.match(/^[A-Za-z0-9+/]+=*$/);
  });
  // If none found, accept data/base64 images as a fallback to avoid dropping products
  if (validImages.length === 0) {
    validImages = possibleImages.filter(img => typeof img === 'string');
  }
  
  const imageUrls = normalizeImageUrls(validImages);
  const sourceId = generateSourceId('Google', raw.product_id || raw.serpapi_product_api);

  // Extract description properly - use description field or highlights as fallback
  const description = sanitizeText(raw.description || (raw.highlights && Array.isArray(raw.highlights) ? raw.highlights.join('. ') : '') || '');

  const product: BaseProduct = {
    title: sanitizeText(raw.title),
    description,
    price,
    image_url: imageUrls[0] || '',
    image_urls: imageUrls,
    product_url: createUniqueProductUrl('Google', sourceId, raw.product_link || raw.link),
    external_url: raw.product_link || raw.link || '',
    source: 'Google' as ProductSource,
    source_id: sourceId,
    site_rating: raw.rating || null,
    query
  };

  return isValidProduct(product) ? product : null;
}

export function normalizeAmazonProduct(
  raw: AmazonProduct,
  query: string
): BaseProduct | null {
  if (!raw.title || (!raw.price && raw.price !== 0)) {
    return null;
  }

  const price = extractPrice(raw.price);
  const minPrice = FetchConfigService.getConfig().filtering.minPrice;
  if (price < minPrice) {
    return null;
  }

  // Handle multiple possible image sources
  const possibleImages = [
    raw.url_image,
    raw.image,
    raw.thumbnail,
    ...(raw.images || [])
  ].filter(Boolean);
  
  const imageUrls = normalizeImageUrls(possibleImages);
  const sourceId = generateSourceId('Amazon', raw.asin);

  const product: BaseProduct = {
    title: sanitizeText(raw.title),
    description: sanitizeText(raw.description || ''), // Include description if available
    price,
    image_url: imageUrls[0] || '',
    image_urls: imageUrls,
    product_url: createUniqueProductUrl('Amazon', sourceId, raw.url),
    external_url: raw.url || '',
    source: 'Amazon' as ProductSource,
    source_id: sourceId,
    site_rating: raw.rating || null,
    query
  };

  return isValidProduct(product) ? product : null;
}

export function normalizeWalmartProduct(
  raw: WalmartSearchResult,
  query: string
): BaseProduct | null {
  if (!raw.general?.title || !raw.price) return null;

  const price = extractPrice(raw.price);
  const minPrice = FetchConfigService.getConfig().filtering.minPrice;
  if (price < minPrice) {
    return null;
  }

  const imageUrls = normalizeImageUrls([raw.general.image]);
  const sourceId = generateSourceId('Walmart', raw.general.product_id);

  const product: BaseProduct = {
    title: sanitizeText(raw.general.title),
    description: '',
    price,
    image_url: imageUrls[0] || '',
    image_urls: imageUrls,
    product_url: createUniqueProductUrl('Walmart', sourceId, raw.general.url),
    external_url: raw.general.url || '',
    source: 'Walmart' as ProductSource,
    source_id: sourceId,
    site_rating: raw.rating.rating || null,
    query
  };

  return isValidProduct(product) ? product : null;
}

// Generic normalizer that routes to specific adapters
export function normalizeProductData(
  raw: GoogleShoppingProduct | AmazonProduct | WalmartSearchResult,
  source: ProductSource,
  query: string
): BaseProduct | null {
  switch (source) {
    case 'Google':
      return normalizeGoogleProduct(raw as GoogleShoppingProduct, query);
    case 'Amazon':
      return normalizeAmazonProduct(raw as AmazonProduct, query);
    case 'Walmart':
      return normalizeWalmartProduct(raw as WalmartSearchResult, query);
    default:
      console.warn(`Unknown product source: ${source}`);
      return null;
  }
}