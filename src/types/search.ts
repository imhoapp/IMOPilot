export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  image_urls?: string[];
  product_url: string;
  source: 'Amazon' | 'Walmart' | 'Home Depot' | 'Google';
  source_id: string | null;
  imo_score: number;
  pros: string[];
  cons: string[];
  created_at: string;
  reviews_summary?: string;
  site_rating?: number;
  reviews_count?: number;
  query?: string;
  // Like data to prevent individual API calls
  like_count?: number;
  liked_by_user?: boolean;
}

export interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
}