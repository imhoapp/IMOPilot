import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from './config.ts';
import { FetchConfigService, type ProductSourceConfig } from './fetch-config.ts';
import type { OxylabsClient } from './oxylabs-client.ts';
import { normalizeProductData } from './product-adapter.ts';
import type { BaseProduct, ProductSource } from './types.ts';
import { extractPrice, retryOperation } from './utils.ts';

export interface SourceFetcher {
  fetchProducts(query: string, maxResults: number, signal?: AbortSignal): Promise<BaseProduct[]>;
  getSource(): ProductSource;
}

export class AmazonOxyFetcher implements SourceFetcher {
  constructor(private oxylabsClient: OxylabsClient) { }

  async fetchProducts(query: string, maxResults: number, signal?: AbortSignal): Promise<BaseProduct[]> {
    const combinedSignal = signal;
    try {
      const config = FetchConfigService.getConfig();
      const rawProducts = await this.oxylabsClient.searchAmazon(
        query,
        maxResults,
        config.filtering.minPrice,
        config.filtering.maxPrice,
        combinedSignal
      );

      // Filter products by price before normalization to reduce noise
      const filteredProducts = rawProducts.filter(product => {
        const price = extractPrice(product.price);
        return price >= config.filtering.minPrice && price <= config.filtering.maxPrice;
      });

      // Debug logging - save raw API response to JSON
      await this.saveDebugLog('amazon', query, {
        rawResponse: filteredProducts,
        normalizedCount: 0,
        timestamp: new Date().toISOString()
      });

      const normalizedProducts = filteredProducts
        .map((raw, index) => {
          try {
            const p = normalizeProductData(raw, 'Amazon', query);
            return { ...p, origin: 'oxy' } as BaseProduct;
          } catch (error) {
            console.error(`[AMAZON FETCHER] Failed to normalize product ${index}:`, error);
            return null;
          }
        })
        .filter((product): product is BaseProduct => product !== null);

      if (Deno.env.get('DEBUG_LOGS') === '1') console.log(`[AMAZON FETCHER] Processed ${rawProducts.length} raw -> ${filteredProducts.length} filtered -> ${normalizedProducts.length} normalized`);
      return normalizedProducts;
    } catch (error) {
      console.error('[AMAZON FETCHER] Error:', error);
      return [];
    }
  }

  getSource(): ProductSource {
    return 'Amazon';
  }

  async saveDebugLog(source: string, query: string, data: any): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${source}-${query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}-${timestamp}.json`;
      const jsonData = JSON.stringify(data, null, 2);

      const { error } = await supabase.storage
        .from('debug-logs')
        .upload(filename, new Blob([jsonData], { type: 'application/json' }));

      if (error) {
        console.error(`[DEBUG] Failed to save ${source} debug log to storage:`, error);
      } else {
        console.log(`[DEBUG] Saved ${source} API response to storage: ${filename}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Failed to save ${source} debug log:`, error);
    }
  }
}
export class GoogleOxyFetcher implements SourceFetcher {
  constructor(private oxylabsClient: OxylabsClient) { }

  async fetchProducts(query: string, maxResults: number, signal?: AbortSignal): Promise<BaseProduct[]> {
    const combinedSignal = signal;
    try {
      const config = FetchConfigService.getConfig();
      const rawProducts = await retryOperation(
        () => this.oxylabsClient.searchGoogleShopping(
          query,
          maxResults,
          config.filtering.minPrice,
          config.filtering.maxPrice,
          combinedSignal
        ),
        2,
        3000
      );

      // Filter products by price before normalization to reduce noise
      const filteredProducts = rawProducts.filter(product => {
        const price = extractPrice(product.price);
        return price >= config.filtering.minPrice && price <= config.filtering.maxPrice;
      });

      // Debug logging - save raw API response to JSON
      await this.saveDebugLog('google', query, {
        rawResponse: filteredProducts,
        normalizedCount: 0,
        timestamp: new Date().toISOString()
      });

      const normalizedProducts = filteredProducts
        .map(raw => {
          try {
            const p = normalizeProductData(raw, 'Google', query);
            return { ...p, origin: 'oxy' } as BaseProduct;
          } catch (error) {
            console.error(`[GOOGLE FETCHER] Failed to normalize product:`, error);
            return null;
          }
        })
        .filter((product): product is BaseProduct => product !== null);

      if (Deno.env.get('DEBUG_LOGS') === '1') console.log(`[GOOGLE FETCHER] Processed ${rawProducts.length} raw -> ${filteredProducts.length} filtered -> ${normalizedProducts.length} normalized`);
      return normalizedProducts;
    } catch (error) {
      console.error('[GOOGLE FETCHER] Error:', error);
      return [];
    }
  }

  getSource(): ProductSource {
    return 'Google';
  }

  async saveDebugLog(source: string, query: string, data: any): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${source}-${query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}-${timestamp}.json`;
      const jsonData = JSON.stringify(data, null, 2);

      const { error } = await supabase.storage
        .from('debug-logs')
        .upload(filename, new Blob([jsonData], { type: 'application/json' }));

      if (error) {
        console.error(`[DEBUG] Failed to save ${source} debug log to storage:`, error);
      } else {
        console.log(`[DEBUG] Saved ${source} API response to storage: ${filename}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Failed to save ${source} debug log:`, error);
    }
  }
}

export class WalmartOxyFetcher implements SourceFetcher {
  constructor(private oxylabsClient: OxylabsClient) { }

  async fetchProducts(query: string, maxResults: number, signal?: AbortSignal): Promise<BaseProduct[]> {
    const combinedSignal = signal;
    try {
      const rawProducts = await this.oxylabsClient.searchWalmart(
        query,
        maxResults,
        FetchConfigService.getConfig().filtering.minPrice,
        FetchConfigService.getConfig().filtering.maxPrice,
        combinedSignal
      );

      // Debug logging - save raw API response to JSON
      await this.saveDebugLog('walmart-oxy', query, {
        rawResponse: rawProducts.results || [],
        normalizedCount: 0, // Will be updated below
        timestamp: new Date().toISOString()
      });

      const normalizedProducts = rawProducts.results?.map(raw => normalizeProductData(raw, 'Walmart', query))
        .filter((product): product is BaseProduct => product !== null) ?? [];

      return normalizedProducts;
    } catch (error) {
      console.error('Walmart Oxy fetch error:', error);
      return [];
    }
  }

  getSource(): ProductSource {
    return 'Walmart';
  }

  async saveDebugLog(source: string, query: string, data: any): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${source}-${query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}-${timestamp}.json`;
      const jsonData = JSON.stringify(data, null, 2);

      const { error } = await supabase.storage
        .from('debug-logs')
        .upload(filename, new Blob([jsonData], { type: 'application/json' }));

      if (error) {
        console.error(`[DEBUG] Failed to save ${source} debug log to storage:`, error);
      } else {
        console.log(`[DEBUG] Saved ${source} API response to storage: ${filename}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Failed to save ${source} debug log:`, error);
    }
  }
}

export class WalmartSerpFetcher implements SourceFetcher {
  async fetchProducts(query: string, maxResults: number, signal?: AbortSignal): Promise<BaseProduct[]> {
    const results: BaseProduct[] = [];
    try {
      const serpApiKey = config.serp.apiKey;
      if (!serpApiKey) {
        console.error('SerpAPI key not found for Walmart fetch');
        return [];
      }

      // Optimize retry logic with shorter delays
      let retries = 0;
      const maxRetries = 2; // Reduce from 3 to 2

      while (retries <= maxRetries) {
        try {
          // Enhanced search parameters for better relevance
          const fetchConfig = FetchConfigService.getConfig();
          const minPrice = fetchConfig.filtering.minPrice;
          const maxPrice = fetchConfig.filtering.maxPrice;

          // Improve query for electronics searches
          let enhancedQuery = query;
          const electronicsKeywords = ['laptop', 'computer', 'phone', 'tablet', 'headphones', 'speaker', 'camera', 'monitor', 'tv', 'smartphone', 'electronics'];
          const isElectronics = electronicsKeywords.some(keyword =>
            query.toLowerCase().includes(keyword.toLowerCase())
          );

          if (isElectronics) {
            enhancedQuery = `${query} electronics`;
          }

          const url = `https://serpapi.com/search.json?engine=walmart&query=${encodeURIComponent(enhancedQuery)}&api_key=${serpApiKey}&page=1&min_price=${minPrice}&max_price=${maxPrice}&facet=price%3A${minPrice}-${maxPrice}&sort=best_match&ps=${maxResults}`;
          const response = await fetch(url, { signal });

          if (response.status === 429) {
            if (retries < maxRetries) {
              const waitTime = 1000 + (retries * 500); // Shorter, linear backoff
              console.log(`Walmart SerpApi rate limited. Retrying in ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              retries++;
              continue;
            }
          }

          if (!response.ok) {
            throw new Error(`Walmart search API error: ${response.status}`);
          }

          const data = await response.json();
          const items = data.organic_results || [];

          // Enhanced filtering for better relevance
          const filteredItems = items.filter((item: any) => {
            const price = item.primary_offer?.offer_price ?? 0;
            const title = (item.title || '').toLowerCase();
            const priceInRange = price >= minPrice && price <= maxPrice;

            // For electronics, ensure it's actually an electronic device
            if (isElectronics) {
              const hasElectronicsInTitle = electronicsKeywords.some(keyword =>
                title.includes(keyword.toLowerCase())
              );
              return priceInRange && hasElectronicsInTitle;
            }

            return priceInRange;
          });

          for (const item of filteredItems.slice(0, maxResults)) {
            results.push({
              title: item.title || 'Unknown Product',
              description: item.description,
              source_id: item.us_item_id || item.product_id || '',
              source: 'Walmart' as ProductSource,
              price: item.primary_offer?.offer_price ?? 0,
              image_url: item.thumbnail || '',
              site_rating: item.rating ?? null,
              product_url: item.product_page_url,
              external_url: item.product_page_url,
              image_urls: [],
              origin: 'serp'
            });
          }

          // Debug logging - save raw API response to JSON
          await this.saveDebugLog('walmart-serp', query, {
            rawResponse: filteredItems,
            normalizedCount: results.length,
            timestamp: new Date().toISOString()
          });

          break; // Success, exit retry loop

        } catch (fetchError) {
          if (retries === maxRetries) {
            throw fetchError;
          }
          retries++;
          const waitTime = 1000 + (retries * 500); // Shorter delays
          console.log(`Walmart error, retrying in ${waitTime}ms...`, fetchError);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } catch (error) {
      console.error('Error fetching Walmart products:', error);
      return [];
    }
    return results;
  }

  getSource(): ProductSource {
    return 'Walmart';
  }

  async saveDebugLog(source: string, query: string, data: any): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${source}-${query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}-${timestamp}.json`;
      const jsonData = JSON.stringify(data, null, 2);

      const { error } = await supabase.storage
        .from('debug-logs')
        .upload(filename, new Blob([jsonData], { type: 'application/json' }));

      if (error) {
        console.error(`[DEBUG] Failed to save ${source} debug log to storage:`, error);
      } else {
        console.log(`[DEBUG] Saved ${source} API response to storage: ${filename}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Failed to save ${source} debug log:`, error);
    }
  }
}


export class GoogleSerpFetcher implements SourceFetcher {
  async fetchProducts(query: string, maxResults: number, signal?: AbortSignal): Promise<BaseProduct[]> {
    const results: BaseProduct[] = [];
    try {
      const serpApiKey = config.serp.apiKey;
      if (!serpApiKey) {
        console.error('SerpAPI key not found for Google Shopping fetch');
        return [];
      }

      const fetchConfig = FetchConfigService.getConfig();
      const minPrice = fetchConfig.filtering.minPrice;
      const maxPrice = fetchConfig.filtering.maxPrice;

      const params: Record<string, string> = {
        engine: 'google_shopping',
        q: query,
        api_key: serpApiKey,
        gl: 'us',
        hl: 'en',
        num: String(Math.min(Math.max(maxResults, 10), 100)),
      };

      const url = `https://serpapi.com/search.json?${Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`;
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Google Shopping SerpApi error: ${response.status}`);

      const data = await response.json();
      const items: any[] = data.shopping_results || data.inline_shopping_results || [];

      const filtered = items.filter((item: any) => {
        const price = typeof item.extracted_price === 'number' ? item.extracted_price : extractPrice(item.price);
        if (typeof price !== 'number' || Number.isNaN(price)) return false;
        return price >= minPrice && price <= maxPrice;
      });

      for (const item of filtered.slice(0, maxResults)) {
        const price = typeof item.extracted_price === 'number' ? item.extracted_price : extractPrice(item.price);
        const imageCandidates: string[] = [];
        if (typeof item.thumbnail === 'string') imageCandidates.push(item.thumbnail);
        if (Array.isArray(item.thumbnails)) imageCandidates.push(...item.thumbnails);
        if (typeof item.product_image === 'string') imageCandidates.push(item.product_image);

        const image_url = imageCandidates.find((u) => typeof u === 'string' && u.startsWith('http')) || '';

        results.push({
          title: item.title || 'Unknown Product',
          description: item.snippet || item.description || null,
          price: typeof price === 'number' ? price : 0,
          image_url,
          image_urls: imageCandidates.filter((u) => typeof u === 'string' && u.startsWith('http')),
          product_url: item.product_link || item.link || '',
          external_url: item.product_link || item.link || '',
          source: 'Google',
          source_id: item.product_id || null,
          site_rating: typeof item.rating === 'number' ? item.rating : null,
          query,
          origin: 'serp'
        });
      }

      await this.saveDebugLog('google-serp', query, {
        rawResponse: filtered,
        normalizedCount: results.length,
        timestamp: new Date().toISOString()
      });

      return results;
    } catch (error) {
      console.error('Error fetching Google Shopping products (SerpAPI):', error);
      return [];
    }
  }

  getSource(): ProductSource {
    return 'Google';
  }

  async saveDebugLog(source: string, query: string, data: any): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${source}-${query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}-${timestamp}.json`;
      const jsonData = JSON.stringify(data, null, 2);

      const { error } = await supabase.storage
        .from('debug-logs')
        .upload(filename, new Blob([jsonData], { type: 'application/json' }));

      if (error) {
        console.error(`[DEBUG] Failed to save ${source} debug log to storage:`, error);
      } else {
        console.log(`[DEBUG] Saved ${source} API response to storage: ${filename}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Failed to save ${source} debug log:`, error);
    }
  }
}

export class GoogleSerpLightFetcher implements SourceFetcher {
  async fetchProducts(query: string, maxResults: number, signal?: AbortSignal): Promise<BaseProduct[]> {
    const results: BaseProduct[] = [];
    try {
      const serpApiKey = config.serp.apiKey;
      if (!serpApiKey) {
        console.error('SerpAPI key not found for Google Shopping Light fetch');
        return [];
      }

      const fetchConfig = FetchConfigService.getConfig();
      const minPrice = fetchConfig.filtering.minPrice;
      const maxPrice = fetchConfig.filtering.maxPrice;

      const params: Record<string, string> = {
        engine: 'google_shopping_light',
        q: query,
        api_key: serpApiKey,
        gl: 'us',
        hl: 'en',
        num: String(Math.min(Math.max(maxResults, 10), 100)),
      };

      const url = `https://serpapi.com/search.json?${Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`;
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Google Shopping Light SerpApi error: ${response.status}`);

      const data = await response.json();
      const inline: any[] = data.inline_shopping_results || [];
      const shopping: any[] = data.shopping_results || [];
      const items = inline.length > 0 ? inline : shopping;

      const filtered = items.filter((item: any) => {
        const price = typeof item.extracted_price === 'number' ? item.extracted_price : extractPrice(item.price);
        if (typeof price !== 'number' || Number.isNaN(price)) return false;
        return price >= minPrice && price <= maxPrice;
      });

      for (const item of filtered.slice(0, maxResults)) {
        const price = typeof item.extracted_price === 'number' ? item.extracted_price : extractPrice(item.price);
        const imageCandidates: string[] = [];
        if (typeof item.thumbnail === 'string') imageCandidates.push(item.thumbnail);
        if (Array.isArray(item.thumbnails)) imageCandidates.push(...item.thumbnails);
        const image_url = imageCandidates.find((u) => typeof u === 'string' && u.startsWith('http')) || '';

        results.push({
          title: item.title || 'Unknown Product',
          description: item.snippet || item.description || null,
          price: typeof price === 'number' ? price : 0,
          image_url,
          image_urls: imageCandidates.filter((u) => typeof u === 'string' && u.startsWith('http')),
          product_url: item.product_link || item.link || '',
          external_url: item.product_link || item.link || '',
          source: 'Google',
          source_id: item.product_id || null,
          site_rating: typeof item.rating === 'number' ? item.rating : null,
          query,
          origin: 'serp'
        });
      }

      await this.saveDebugLog('google-serp-light', query, {
        rawResponse: filtered,
        normalizedCount: results.length,
        timestamp: new Date().toISOString()
      });

      return results;
    } catch (error) {
      console.error('Error fetching Google Shopping Light products (SerpAPI):', error);
      return [];
    }
  }

  getSource(): ProductSource {
    return 'Google';
  }

  async saveDebugLog(source: string, query: string, data: any): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${source}-${query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}-${timestamp}.json`;
      const jsonData = JSON.stringify(data, null, 2);

      const { error } = await supabase.storage
        .from('debug-logs')
        .upload(filename, new Blob([jsonData], { type: 'application/json' }));

      if (error) {
        console.error(`[DEBUG] Failed to save ${source} debug log to storage:`, error);
      } else {
        console.log(`[DEBUG] Saved ${source} API response to storage: ${filename}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Failed to save ${source} debug log:`, error);
    }
  }
}


/**
 * Fetches Home Depot products using SerpApi.
 * @param query - The search query string.
 * @param maxResults - Maximum number of results to return.
 * @param signal - Optional AbortSignal.
 * @param options - Optional advanced Home Depot/SerpApi parameters: country, hd_sort, hd_filter_tokens, delivery_zip, store_id, nao, ps, etc.
 *   Example: { country: 'ca', hd_sort: 'price_low_to_high', store_id: '2414', nao: 24, ps: 48 }
 */
export class HomeDepotSerpFetcher implements SourceFetcher {
  async fetchProducts(
    query: string,
    maxResults: number,
    signal?: AbortSignal,
    options: {
      country?: 'us' | 'ca',
      hd_sort?: string,
      hd_filter_tokens?: string,
      delivery_zip?: string,
      store_id?: string,
      nao?: number,
      ps?: number,
      [key: string]: any
    } = {}
  ): Promise<BaseProduct[]> {
    const results: BaseProduct[] = [];
    try {
      const serpApiKey = config.serp.apiKey;
      if (!serpApiKey) {
        console.error('SerpAPI key not found for HomeDepot fetch');
        return [];
      }

      // Enhanced query building for better electronics accuracy
      let enhancedQuery = query;
      const electronicsKeywords = ['laptop', 'computer', 'phone', 'tablet', 'headphones', 'speaker', 'camera', 'monitor', 'tv', 'smartphone'];
      const homeImprovementKeywords = ['drill', 'saw', 'hammer', 'tool', 'paint', 'lumber', 'hardware', 'appliance'];

      const isElectronics = electronicsKeywords.some(keyword =>
        query.toLowerCase().includes(keyword.toLowerCase())
      );
      const isHomeImprovement = homeImprovementKeywords.some(keyword =>
        query.toLowerCase().includes(keyword.toLowerCase())
      );

      // If searching for electronics, be more specific to avoid tools/hardware
      if (isElectronics && !isHomeImprovement) {
        enhancedQuery = `${query} electronics consumer technology`;
      }

      // Build params with enhanced search accuracy
      const params: Record<string, string> = {
        engine: 'home_depot',
        q: enhancedQuery,
        api_key: serpApiKey,
      };

      // Country (default US)
      params.country = options.country || 'us';

      // US-specific parameters with better filtering
      if (params.country === 'us') {
        if (options.hd_sort) params.hd_sort = options.hd_sort;
        if (options.hd_filter_tokens) params.hd_filter_tokens = options.hd_filter_tokens;
        if (options.delivery_zip) params.delivery_zip = options.delivery_zip;
        if (options.store_id) params.store_id = options.store_id;
        if (options.nao !== undefined) params.nao = String(options.nao);
        params.ps = String(options.ps ?? Math.min(maxResults * 2, 48)); // Get more results to filter better

        // Apply price range from config.filtering with better sorting for relevance
        const fetchConfig = FetchConfigService.getConfig();
        const minPrice = fetchConfig.filtering.minPrice;
        const maxPrice = fetchConfig.filtering.maxPrice;
        if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) params.lowerbound = String(minPrice);
        if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) params.upperbound = String(maxPrice);
        Number.isNaN
        // Enhanced sorting for relevance
        if (!options.hd_sort) {
          params.hd_sort = isElectronics ? 'top_sellers' : 'best_match';
        }

        // Add category filters for electronics
        if (isElectronics && !options.hd_filter_tokens) {
          // Filter for electronics/technology categories
          params.hd_filter_tokens = 'category:Electronics';
        }

      } else if (params.country === 'ca') {
        // Canada-specific parameters
        if (options.store) params.store = options.store;
        if (options.sort) params.sort = options.sort;
        if (options.filter) params.filter = options.filter;
        if (options.minmax) params.minmax = options.minmax;
        if (options.pagesize) params.pagesize = String(options.pagesize);

        // Apply price range from config.filtering as minmax in CAD
        const fetchConfig = FetchConfigService.getConfig();
        const minPrice = fetchConfig.filtering.minPrice;
        const maxPrice = fetchConfig.filtering.maxPrice;
        if (typeof minPrice === 'number' && typeof maxPrice === 'number' && !Number.isNaN(minPrice) && !Number.isNaN(maxPrice)) {
          params.minmax = `price:[${minPrice} TO ${maxPrice}]`;
        } else if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) {
          params.minmax = `price:[${minPrice} TO *]`;
        } else if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) {
          params.minmax = `price:[0 TO ${maxPrice}]`;
        }
      }

      const url = `https://serpapi.com/search.json?${Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`;
      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new Error(`Home Depot search API error: ${response.status}`);
      }

      const data = await response.json();
      const items = data.products || [];

      // Enhanced filtering for better relevance and electronics accuracy
      const fetchConfig = FetchConfigService.getConfig();
      const minPrice = fetchConfig.filtering.minPrice;
      const maxPrice = fetchConfig.filtering.maxPrice;

      const filteredItems = items.filter((item: any) => {
        const price = typeof item.price === 'number' ? item.price : 0;
        const title = (item.title || '').toLowerCase();
        const priceInRange = price >= minPrice && price <= maxPrice;

        // Enhanced relevance filtering for electronics
        if (isElectronics && !isHomeImprovement) {
          // For electronics searches, ensure it's actually electronics
          const hasElectronicsInTitle = electronicsKeywords.some(keyword =>
            title.includes(keyword.toLowerCase())
          );
          // Exclude obvious tools/hardware
          const hasToolsInTitle = ['drill', 'saw', 'hammer', 'wrench', 'screwdriver', 'tool set'].some(tool =>
            title.includes(tool.toLowerCase())
          );
          return priceInRange && hasElectronicsInTitle && !hasToolsInTitle;
        }

        return priceInRange;
      });

      for (const item of filteredItems.slice(0, maxResults)) {
        // Extract all image URLs from thumbnails (flatten if needed)
        let image_urls: string[] = [];
        let image_url = '';
        if (Array.isArray(item.thumbnails)) {
          if (Array.isArray(item.thumbnails[0])) {
            image_urls = item.thumbnails[0];
          } else {
            image_urls = item.thumbnails;
          }
          // Pick the largest image (last in array)
          image_url = image_urls[image_urls.length - 1] || image_urls[0] || '';
        }

        results.push({
          title: item.title || 'Unknown Product',
          description: null, // Home Depot API does not provide description
          price: typeof item.price === 'number' ? item.price : 0,
          image_url,
          image_urls,
          product_url: item.link || '',
          external_url: item.link || '',
          source: 'HomeDepot',
          query,
          source_id: item.product_id || '',
          site_rating: typeof item.rating === 'number' ? item.rating : null,
          // Additional fields
          brand: item.brand || undefined,
        } as any);
      }

      // Debug logging - save raw API response to JSON
      await this.saveDebugLog('homedepot', query, {
        rawResponse: filteredItems,
        normalizedCount: results.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching HomeDepot products:', error);
    }
    return results;
  }

  getSource(): ProductSource {
    return 'HomeDepot';
  }

  async saveDebugLog(source: string, query: string, data: any): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${source}-${query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}-${timestamp}.json`;
      const jsonData = JSON.stringify(data, null, 2);

      const { error } = await supabase.storage
        .from('debug-logs')
        .upload(filename, new Blob([jsonData], { type: 'application/json' }));

      if (error) {
        console.error(`[DEBUG] Failed to save ${source} debug log to storage:`, error);
      } else {
        console.log(`[DEBUG] Saved ${source} API response to storage: ${filename}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Failed to save ${source} debug log:`, error);
    }
  }
}


// Categories that Home Depot doesn't typically sell - exclude HD for these searches
const homeDepotExclusionCategories = [
  'perfume', 'cologne', 'fragrance', 'beauty', 'cosmetics', 'makeup',
  'headphones', 'earbuds', 'smartphone', 'phone', 'tablet', 'laptop', 'computer',
  'gaming', 'console', 'video game', 'electronics', 'tv', 'television',
  'camera', 'photography', 'audio', 'speaker', 'soundbar', 'receiver',
  'clothing', 'apparel', 'shoes', 'fashion', 'jewelry', 'watch', 'clothes',
  'shirt', 'pants', 'dress', 'jacket', 'coat', 'sweater', 'hoodie', 'jeans',
  'shorts', 'skirt', 'blouse', 'suit', 'tie', 'belt', 'hat', 'cap',
  'boots', 'sneakers', 'sandals', 'heels', 'slippers', 'socks', 'underwear',
  'bra', 'swimwear', 'pajamas', 'activewear', 'sportswear', 'uniform',
  'food', 'snacks', 'groceries', 'vitamins', 'supplements',
  'books', 'toys', 'games', 'sports equipment', 'fitness',
  'automotive parts', 'car accessories', 'motorcycle'
];

function shouldExcludeHomeDepot(query: string): boolean {
  const lowercaseQuery = query.toLowerCase();
  return homeDepotExclusionCategories.some(category =>
    lowercaseQuery.includes(category.toLowerCase())
  );
}

export function createFetcher(sourceKey: string, oxylabsClient: OxylabsClient): SourceFetcher | null {
  switch (sourceKey) {
    case 'amazon_oxy':
      return new AmazonOxyFetcher(oxylabsClient);
    case 'google_oxy':
      return new GoogleOxyFetcher(oxylabsClient);
    case 'walmart_oxy':
      return new WalmartOxyFetcher(oxylabsClient);
    case 'walmart_serp':
      return new WalmartSerpFetcher();
    case 'homedepot_serp':
      return new HomeDepotSerpFetcher();
    case 'google_serp':
      return new GoogleSerpFetcher();
    case 'google_serp_light':
      return new GoogleSerpLightFetcher();
    default:
      console.warn(`Unknown source key: ${sourceKey}`);
      return null;
  }
}

export function createEnabledFetchers(enabledSources: ProductSourceConfig, oxylabsClient: OxylabsClient, query?: string): SourceFetcher[] {
  const fetchers: SourceFetcher[] = [];

  Object.entries(enabledSources).forEach(([sourceKey, enabled]) => {
    if (enabled) {
      // Skip Home Depot for categories they don't sell
      if (sourceKey === 'homedepot_serp' && query && shouldExcludeHomeDepot(query)) {
        console.log(`[FETCHER FACTORY] Excluding Home Depot for query: "${query}" - not in their product category`);
        return;
      }

      const fetcher = createFetcher(sourceKey, oxylabsClient);
      if (fetcher) {
        fetchers.push(fetcher);
      }
    }
  });

  return fetchers;
}