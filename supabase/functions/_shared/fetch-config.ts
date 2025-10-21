// Dynamic fetch configuration system
export interface ProductSourceConfig {
  amazon_oxy: boolean;
  google_oxy: boolean;
  google_serp: boolean;
  google_serp_light: boolean;
  walmart_oxy: boolean;
  walmart_serp: boolean;
  homedepot_serp: boolean;
}

export interface ReviewChannelConfig {
  source_api: boolean;        // Amazon/Walmart native reviews
  amazon_reviews_api: boolean; // Amazon reviews API (currently disabled)
  firecrawl_external: boolean; // Reddit, external reviews
  external_review_limit: number;
  ai_reviews: boolean;        // AI-generated reviews from internet research
  ai_reviews_count: number;   // Number of AI reviews to generate
}

export interface VideoConfig {
  total_count: number;
  ai_video_enabled: boolean;
  ai_video_ranking_enabled: boolean;
  returned_video_count: number;
  ai_sources_for_videos: ('youtube' | 'tiktok')[];
}

export interface FilteringConfig {
  minPrice: number;
  maxPrice: number;
  defaultMaxResults: number;
  results_per_source: number;
  target_total_results: number;
}

export interface FetchConfig {
  product_sources: ProductSourceConfig;
  review_channels: ReviewChannelConfig;
  video_config: VideoConfig;
  filtering: FilteringConfig;
  // When true, use SerpAPI for Google product details + reviews. Default: false (use Oxylabs)
  google_details_use_serp?: boolean;
  freshness_days?: number;
  max_results_per_source?: number;
  free_user_product_limit?: number;
}

// Default configuration
export const DEFAULT_FETCH_CONFIG: FetchConfig = {
  product_sources: {
    amazon_oxy: true,
    google_oxy: false, // Enable Google Shopping
    google_serp: false,
    google_serp_light: true,
    walmart_oxy: false,
    walmart_serp: true,
    homedepot_serp: true,
  },
  review_channels: {
    source_api: true,
    amazon_reviews_api: false, // Disabled - API not working
    firecrawl_external: false,
    external_review_limit: 10,
    ai_reviews: true,
    ai_reviews_count: 10
  },
  video_config: {
    total_count: 10,
    ai_video_enabled: true,
    ai_video_ranking_enabled: true,
    returned_video_count: 3,
    ai_sources_for_videos: ['youtube', 'tiktok']
  },
  filtering: {
    minPrice: 250,
    maxPrice: 10000,
    defaultMaxResults: 25,
    results_per_source: 40, // Increase default
    target_total_results: 130, // Increase target: 40+40+25+25
  },
  freshness_days: 7,
  max_results_per_source: 40, // Increase default
  free_user_product_limit: 10,
  google_details_use_serp: true,
};

// Source type mapping
export type ProductSourceType = 'Amazon' | 'Google' | 'Walmart' | 'HomeDepot';

export const SOURCE_CONFIG_MAP: Record<keyof ProductSourceConfig, ProductSourceType> = {
  amazon_oxy: 'Amazon',
  google_oxy: 'Google',
  google_serp: 'Google',
  google_serp_light: 'Google',
  walmart_oxy: 'Walmart',
  walmart_serp: 'Walmart',
  homedepot_serp: 'HomeDepot',
};

// Configuration service
const fetchConfigState: { config: FetchConfig } = {
  config: DEFAULT_FETCH_CONFIG,
};

export const FetchConfigService = {
  getConfig(): FetchConfig {
    return { ...fetchConfigState.config };
  },

  updateConfig(updates: Partial<FetchConfig>): void {
    fetchConfigState.config = {
      ...fetchConfigState.config,
      ...updates,
      product_sources: {
        ...fetchConfigState.config.product_sources,
        ...updates.product_sources,
      },
      review_channels: {
        ...fetchConfigState.config.review_channels,
        ...updates.review_channels,
      },
      video_config: {
        ...fetchConfigState.config.video_config,
        ...updates.video_config,
      },
      filtering: {
        ...fetchConfigState.config.filtering,
        ...updates.filtering,
      },
      freshness_days: updates.freshness_days ?? fetchConfigState.config.freshness_days,
      max_results_per_source: updates.max_results_per_source ?? fetchConfigState.config.max_results_per_source,
      free_user_product_limit: updates.free_user_product_limit ?? fetchConfigState.config.free_user_product_limit,
    };
  },

  getEnabledSources(): ProductSourceType[] {
    const sources: ProductSourceType[] = [];
    const cfg = FetchConfigService.getConfig().product_sources;

    Object.entries(cfg).forEach(([key, enabled]) => {
      if (enabled) {
        sources.push(SOURCE_CONFIG_MAP[key as keyof ProductSourceConfig]);
      }
    });

    return sources;
  },

  hasAnySourceEnabled(): boolean {
    return FetchConfigService.getEnabledSources().length > 0;
  },

  getVideoSources(): string[] {
    const cfg = FetchConfigService.getConfig().video_config;
    return cfg.ai_sources_for_videos.map(source =>
      source.charAt(0).toUpperCase() + source.slice(1)
    );
  },

  validateConfig(cfg: Partial<FetchConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (cfg.product_sources) {
      const hasEnabledSource = Object.values(cfg.product_sources).some(enabled => enabled);
      if (!hasEnabledSource) {
        errors.push('At least one product source must be enabled');
      }
    }

    if (cfg.video_config?.total_count !== undefined) {
      if (cfg.video_config.total_count < 0 || cfg.video_config.total_count > 20) {
        errors.push('Video count must be between 0 and 20');
      }
    }

    if (cfg.video_config?.returned_video_count !== undefined) {
      if (cfg.video_config.returned_video_count < 0 || cfg.video_config.returned_video_count > 10) {
        errors.push('Returned video count must be between 0 and 10');
      }
    }

    if (cfg.video_config?.ai_sources_for_videos !== undefined) {
      const validSources = ['youtube', 'tiktok'];
      const invalidSources = cfg.video_config.ai_sources_for_videos.filter(
        source => !validSources.includes(source)
      );
      if (invalidSources.length > 0) {
        errors.push(`Invalid AI video sources: ${invalidSources.join(', ')}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  },
} as const;