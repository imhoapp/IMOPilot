import type { ProductSourceConfig, ReviewChannelConfig, VideoConfig } from "./fetch-config.ts";

// Shared types across all edge functions
export type ProductSource = 'Amazon' | 'Walmart' | 'HomeDepot' | 'Google';

// Import fetch config types

export interface FetchConfig {
  product_sources: ProductSourceConfig;
  review_channels: ReviewChannelConfig;
  video_config: VideoConfig;
}

export interface BaseProduct {
  title: string;
  description: string | null;
  price: number;
  image_url: string;
  image_urls: string[];
  product_url: string;
  external_url: string;
  source: ProductSource;
  source_id: string | null;
  site_rating: number | null;
  query?: string
  origin?: 'oxy' | 'serp';
}

export interface Product extends BaseProduct {
  id?: string;
  query: string;
  imo_score: number;
  pros: string[];
  cons: string[];
  reviews_summary: string | null;
  created_at?: Date | string;
  is_detailed_fetched?: boolean;
  needs_ai_analysis?: boolean;
}

export interface ProductDetails extends Product {
  detailed_description?: string;
  specifications?: Record<string, any>;
  availability?: string;
  shipping_info?: string;
  review_ai_summary?: string;
}

export interface SearchOptions {
  sortBy?: "price_low" | "price_high" | "imo_score" | "rating" | "newest" | "most_reviewed";
  priceRange?: [number, number];
  minImoScore?: number;
  minRating?: number;
  test?: boolean;
  maxResults?: number;
}

export interface Review {
  rating: number;
  title: string;
  review_text: string;
  reviewer_name?: string;
  verified_purchase?: boolean;
  review_date?: string;
  positive_feedback?: number;
  negative_feedback?: number;
  source?: string;
}

export interface Video {
  platform: 'YouTube';
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
}

export interface AIAnalysisResult {
  pros: string[];
  cons: string[];
  imo_score: number;
}

// API response interfaces for different sources
export interface OxylabsResponse {
  results: Array<{
    content: any;
    created_at: string;
    updated_at: string;
    page: number;
    url: string;
    job_id: string;
    status_code: number;
  }>;
}

export interface GoogleShoppingProduct {
  pos?: number;
  title?: string;
  link?: string;
  product_link?: string;
  product_id?: string;
  serpapi_product_api?: string;
  source?: string;
  price?: string | number | {
    value?: number;
    currency?: string;
    raw?: string;
  };
  extracted_price?: number;
  thumbnail?: string;
  image?: string; // Additional image field
  delivery?: string;
  description?: string; // Product description
  rating?: number;
  reviews?: number;
  extensions?: string[];
  // Proper Google Shopping API image structure
  images?: {
    full_size?: string[];
    thumbnails?: string[];
  } | string[]; // Support both new and legacy formats
  product_image?: string;
}

export interface AmazonProduct {
  pos?: number;
  title?: string;
  asin?: string;
  url?: string;
  url_image?: string;
  price?: number;
  rating?: number;
  reviews_count?: number;
  is_prime?: boolean;
  is_amazon_choice?: boolean;
}

export interface WalmartProduct {
  pos?: number;
  product_id?: string;
  title?: string;
  url?: string;
  image?: string;
}