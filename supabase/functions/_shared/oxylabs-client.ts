// Oxylabs Web Scraper API client
import { config } from './config.ts';
import type {
  AmazonProduct,
  GoogleShoppingProduct,
  OxylabsResponse,
  WalmartProduct,
} from './types.ts';

type GoogleShoppingSearchContent = {
  results?: {
    organic?: GoogleShoppingProduct[];
    paid?: any[];
  };
  organic?: GoogleShoppingProduct[]; // some payloads flatten it
};

type AmazonSearchContent = {
  results?: {
    organic?: AmazonProduct[];
    paid?: any[];
  };
  organic?: AmazonProduct[];
};

type WalmartSearchContent = {
  results?: WalmartSearchResult[];
};

export type WalmartSearchResult = {
  general?: WalmartProduct;
  price?: {
    price: number;
    currency: string
  };
  rating: {
    count: number;
    rating: number;
  }
}

interface OxylabsQuery {
  source: string;
  query?: string;
  url?: string;
  domain?: string;
  start_page?: number;
  pages?: number;
  locale?: string;
  geo_location?: string;
  user_agent_type?: string;
  parse?: boolean;
  [key: string]: any;
}

export class OxylabsClient {
  private auth: string;

  constructor() {
    this.auth = `Basic ${btoa(`${config.oxylabs.username}:${config.oxylabs.password}`)}`;
  }

  private async makeRequestRaw(query: OxylabsQuery, signal?: AbortSignal): Promise<OxylabsResponse> {
    const res = await fetch(config.oxylabs.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.auth,
      },
      body: JSON.stringify({
        ...query,
        parse: true,
      }),
      signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Oxylabs HTTP ${res.status}: ${res.statusText} - ${text}`);
    }

    return await res.json() as OxylabsResponse;
  }

  private async makeRequestContent<T = any>(
    query: OxylabsQuery,
    signal?: AbortSignal
  ): Promise<T> {
    const response = await this.makeRequestRaw(query, signal);

    if (!response.results || response.results.length === 0) {
      throw new Error('No results returned from Oxylabs API');
    }

    const content = response.results[0]?.content;
    if (!content) throw new Error('No `content` returned from Oxylabs API');

    return content as T;
  }
  // Google Shopping search
  async searchGoogleShopping(
    query: string,
    maxResults: number = 100,
    minPrice?: number,
    maxPrice?: number,
    signal?: AbortSignal
  ): Promise<GoogleShoppingProduct[]> {
    const oxylabsQuery: OxylabsQuery = {
      source: 'google_shopping_search',
      query: query,
      parse: true,
      domain: 'com',
      pages: Math.ceil(maxResults / 25),
      locale: 'en-us',
      geo_location: 'United States',
      context: [
        { key: "currency", value: "USD" },
        { key: "sort_by", value: (minPrice ?? maxPrice) ? "pd" : "r" }, // use price sorting if price filters present
        { key: "min_price", value: minPrice ?? 250 },
        { key: "max_price", value: maxPrice ?? 10000 },
        { key: "results_language", value: "en" }
      ].filter(item => item.value !== undefined && item.value !== null),
    };

    if (Deno.env.get('DEBUG_LOGS') === '1') console.log('[OXYLABS] Google Shopping query:', JSON.stringify(oxylabsQuery, null, 2));

    const content = await this.makeRequestContent<GoogleShoppingSearchContent>(
      oxylabsQuery,
      signal
    );

    if (Deno.env.get('DEBUG_LOGS') === '1') console.log('[OXYLABS] Google Shopping raw content keys:', Object.keys(content || {}));

    const organic =
      content?.results?.organic ??
      (content as any)?.organic ??
      [];

    if (Deno.env.get('DEBUG_LOGS') === '1') {
      console.log('[OXYLABS] Google Shopping organic results count:', organic.length);
      console.log('[OXYLABS] First Google product sample:', JSON.stringify(organic[0], null, 2));
    }

    return organic.slice(0, maxResults);
  }

  // Google Shopping product details
  async getGoogleProductDetails(
    productId: string,
    signal?: AbortSignal
  ): Promise<any> {
    const oxylabsQuery: OxylabsQuery = {
      source: 'google_shopping_product',
      query: productId,
      domain: 'com',
      locale: 'en-us',
      geo_location: 'United States',
      parse: true,
    };

    return this.makeRequestContent(oxylabsQuery, signal);
  }

  // Amazon search
  async searchAmazon(
    query: string,
    maxResults: number = 100,
    minPrice?: number,
    maxPrice?: number,
    signal?: AbortSignal
  ): Promise<AmazonProduct[]> {
    const refinements: string[] = [];
    if (minPrice && maxPrice) {
      refinements.push(`p_36:${Math.floor(minPrice * 100)}-${Math.floor(maxPrice * 100)}`);
    } else if (minPrice) {
      refinements.push(`p_36:${Math.floor(minPrice * 100)}-`);
    } else if (maxPrice) {
      refinements.push(`p_36:-${Math.floor(maxPrice * 100)}`);
    }

    const oxylabsQuery: OxylabsQuery = {
      source: 'amazon_search',
      query: query,
      domain: 'com',
      pages: Math.ceil(maxResults / 16),
      parse: true,
      context: [
        { key: "currency", value: "USD" },
      ],
      ...(refinements.length > 0 && { refinements }),
      sort_by: "relevance" // Use relevance for better search accuracy
    };

    if (Deno.env.get('DEBUG_LOGS') === '1') console.log('[OXYLABS] Amazon search query:', JSON.stringify(oxylabsQuery, null, 2));

    const content = await this.makeRequestContent<AmazonSearchContent>(oxylabsQuery, signal);

    if (Deno.env.get('DEBUG_LOGS') === '1') console.log('[OXYLABS] Amazon raw content keys:', Object.keys(content || {}));

    const organic =
      content?.results?.organic ??
      (content as any)?.organic ??
      [];

    if (Deno.env.get('DEBUG_LOGS') === '1') {
      console.log('[OXYLABS] Amazon organic results count:', organic.length);
      console.log('[OXYLABS] First Amazon product sample:', JSON.stringify(organic[0], null, 2));
    }

    return organic.slice(0, maxResults);
  }

  // Amazon product details
  async getAmazonProductDetails(
    asin: string,
    signal?: AbortSignal
  ): Promise<any> {
    const oxylabsQuery: OxylabsQuery = {
      source: 'amazon_product',
      query: asin,
      domain: 'com',
      parse: true,
    };

    return this.makeRequestContent(oxylabsQuery, signal);
  }

  // Amazon reviews
  async getAmazonReviews(
    asin: string,
    pages: number = 3,
    signal?: AbortSignal
  ): Promise<any> {
    const oxylabsQuery: OxylabsQuery = {
      source: 'amazon_reviews',
      query: asin,
      domain: 'com',
      start_page: 1,
      pages: pages,
      parse: true,
    };

    return this.makeRequestContent(oxylabsQuery, signal);
  }

  // Walmart search
  async searchWalmart(
    query: string,
    _maxResults: number = 100,
    minPrice?: number,
    maxPrice?: number,
    signal?: AbortSignal
  ): Promise<WalmartSearchContent> {
    const oxylabsQuery: OxylabsQuery = {
      source: 'walmart_search',
      query: query,
      domain: 'com',
      parse: true,
      sort_by: 'best_match',
      ...(minPrice ? { min_price: minPrice } : {}),
      ...(maxPrice ? { max_price: maxPrice } : {}),
    };


    const content = await this.makeRequestContent<WalmartSearchContent>(oxylabsQuery, signal);


    return content;
  }

  // Walmart product details
  async getWalmartProductDetails(
    productId: string,
    signal?: AbortSignal
  ): Promise<any> {
    const oxylabsQuery: OxylabsQuery = {
      source: 'walmart_product',
      query: productId,
      domain: 'com',
      locale: 'en-us',
      geo_location: 'United States',
    };

    return this.makeRequestContent(oxylabsQuery, signal);
  }
}

export const oxylabsClient = new OxylabsClient();