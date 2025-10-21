// Shared utility functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from './config.ts';
import { FetchConfigService } from './fetch-config.ts';
import type { Product } from './types.ts';
// Error logging utility
export async function logError(
  functionName: string,
  errorType: string,
  errorMessage: string,
  errorDetails?: any,
  queryContext?: string,
  userId?: string
) {
  try {
    const supabaseUrl = config.supabase.url;
    const supabaseServiceKey = config.supabase.key;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('error_logs').insert({
      function_name: functionName,
      error_type: errorType,
      error_message: errorMessage,
      error_details: errorDetails ? JSON.stringify(errorDetails) : null,
      query_context: queryContext,
      user_id: userId
    });
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
  }
}

export function logInfo(message: string, details?: Record<string, unknown>) {
  if (config.logging?.json) {
    const payload = { level: 'info', message, ...(details ? { details } : {}), timestamp: new Date().toISOString() };
    console.log(JSON.stringify(payload));
  } else {
    if (details) {
      console.log(message, details);
    } else {
      console.log(message);
    }
  }
}

export function logWarn(message: string, details?: Record<string, unknown>) {
  if (config.logging?.json) {
    const payload = { level: 'warn', message, ...(details ? { details } : {}), timestamp: new Date().toISOString() };
    console.warn(JSON.stringify(payload));
  } else {
    if (details) {
      console.warn(message, details);
    } else {
      console.warn(message);
    }
  }
}

export function logDebug(message: string, details?: Record<string, unknown>) {
  if (config.logging?.json) {
    const payload = { level: 'debug', message, ...(details ? { details } : {}), timestamp: new Date().toISOString() };
    console.log(JSON.stringify(payload));
  } else {
    if (details) {
      console.log(message, details);
    } else {
      console.log(message);
    }
  }
}

export async function fetchWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 90000,
  signal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Combine signals if provided
  const combinedSignal = signal ?
    AbortSignal.any([signal, controller.signal]) :
    controller.signal;

  try {
    const response = await fetch(input, {
      ...init,
      signal: combinedSignal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    return await response.json() as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout or aborted');
    }
    throw error;
  }
}

export function extractPrice(rawPrice: any): number {
  if (!rawPrice) return 0;
  if (typeof rawPrice === "number") return rawPrice;

  // Handle price objects
  if (typeof rawPrice === "object") {
    if (rawPrice.value !== undefined) return Number(rawPrice.value) || 0;
    if (rawPrice.current !== undefined) return Number(rawPrice.current) || 0;
    if (rawPrice.price !== undefined) return Number(rawPrice.price) || 0;
    if (rawPrice.raw !== undefined) {
      const digits = String(rawPrice.raw).replace(/[^0-9.]/g, "");
      return parseFloat(digits) || 0;
    }
  }

  // Handle string prices
  const digits = String(rawPrice).replace(/[^0-9.]/g, "");
  return parseFloat(digits) || 0;
}

export function normalizeImageUrls(images: any): string[] {
  if (!images) return [];

  if (typeof images === 'string') return [images];
  if (Array.isArray(images)) return images.filter(Boolean);

  // Handle object with image properties
  if (typeof images === 'object') {
    const urls: string[] = [];
    if (typeof images.main_image === 'string') urls.push(images.main_image);
    if (typeof images.thumbnail === 'string') urls.push(images.thumbnail);
    if (typeof images.image === 'string') urls.push(images.image);
    if (Array.isArray(images.additional_images)) {
      urls.push(...images.additional_images.filter((img: unknown): img is string => typeof img === 'string'));
    }
    return urls.filter(Boolean);
  }

  return [];
}

export function sanitizeText(text: any): string {
  if (!text) return '';
  return String(text)
    .replace(/\n\s*\n/g, '\n') // Remove excessive newlines
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function generateSourceId(source: string, originalId: any): string {
  if (!originalId) return '';

  switch (source.toLowerCase()) {
    case 'amazon':
      return String(originalId); // ASIN
    case 'walmart':
      return String(originalId); // Walmart product ID
    case 'google':
      return String(originalId); // Google product ID
    case 'homedepot':
      return String(originalId); // Home Depot product ID
    default:
      return String(originalId);
  }
}

export function isValidProduct(product: any): boolean {
  const config = FetchConfigService.getConfig();
  const minPrice = config.filtering.minPrice;

  const isValid = !!(
    product?.title &&
    product?.price !== undefined &&
    product?.price >= minPrice &&
    (product?.image_url || product?.image_urls?.length > 0)
  );

  // Log when products are filtered out due to price
  if (product?.price !== undefined && product?.price < minPrice) {
    console.log(`Product filtered out due to price: ${product.title} - $${product.price} (min: $${minPrice})`);
  }

  return isValid;
}

export function createUniqueProductUrl(source: string, sourceId: string, originalUrl?: string): string {
  if (originalUrl) return originalUrl;

  switch (source.toLowerCase()) {
    case 'amazon':
      return `https://amazon.com/dp/${sourceId}`;
    case 'walmart':
      return `https://walmart.com/ip/${sourceId}`;
    case 'google':
      return `https://shopping.google.com/product/${sourceId}`;
    case 'homedepot':
      return `https://homedepot.com/p/${sourceId}`;
    default:
      return originalUrl || '';
  }
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 2000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying, with exponential backoff
      await delay(delayMs * 2 ** attempt);
    }
  }

  throw lastError!;
}

export function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

/**
 * Filters products by freshness (created_at within freshnessDays)
 */
export function filterProductsByFreshness(products: Product[], freshnessDays: number): Product[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - freshnessDays);
  return products.filter(p => {
    if (!p.created_at) return false;
    const created = new Date(p.created_at);
    return created >= cutoff;
  });
}