// Video fetching service with configuration support
import { Video, FetchConfig } from './types.ts';
import { FetchConfigService } from './fetch-config.ts';
import { VideoFetcherFactory } from './video-fetchers.ts';
import { saveProductVideos, getProductVideos } from './database-service.ts';

export class VideoService {
  /**
   * Fetch and save videos for a product based on current configuration
   */
  static async fetchAndSaveVideos(
    productId: string,
    productName: string,
    signal?: AbortSignal
  ): Promise<{ success: boolean; videoCount: number; error?: string }> {
    try {
      const config = FetchConfigService.getConfig();
      
      // Check if video fetching is enabled
      if (config.video_config.total_count <= 0) {
        console.log('Video count is 0, skipping video fetch');
        return { success: true, videoCount: 0 };
      }

      // Check if we already have videos
      const existingVideos = await getProductVideos(productId);
      if (existingVideos.length >= config.video_config.total_count) {
        console.log(`Product ${productId} already has sufficient videos (${existingVideos.length}), skipping fetch`);
        return { success: true, videoCount: existingVideos.length };
      }

      console.log(`Fetching videos for product: ${productName}`);
      console.log(`Video config:`, config.video_config);
      
      // Fetch videos using configuration
      const videos = await VideoFetcherFactory.fetchVideosWithConfig(
        productName,
        config.video_config,
        signal
      );

      console.log(`Fetched ${videos.length} videos`);

      // Save videos to database
      if (videos.length > 0) {
        await saveProductVideos(productId, videos);
        console.log(`Successfully saved ${videos.length} videos for product ${productId}`);
      }

      return { 
        success: true, 
        videoCount: videos.length 
      };

    } catch (error) {
      console.error('Error in video service:', error);
      return { 
        success: false, 
        videoCount: 0, 
        error: error.message || 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get video statistics and metadata
   */
  static async getVideoStats(productId: string): Promise<{
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    platforms: string[];
  }> {
    try {
      const videos = await getProductVideos(productId);
      
      const stats = videos.reduce((acc, video) => {
        acc.totalViews += video.views || 0;
        acc.totalLikes += video.likes || 0;
        if (video.platform && !acc.platforms.includes(video.platform)) {
          acc.platforms.push(video.platform);
        }
        return acc;
      }, {
        totalVideos: videos.length,
        totalViews: 0,
        totalLikes: 0,
        platforms: [] as string[]
      });

      return stats;
    } catch (error) {
      console.error('Error getting video stats:', error);
      return {
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        platforms: []
      };
    }
  }

  /**
   * Check if video fetching should be attempted for a product
   */
  static shouldFetchVideos(config: FetchConfig): boolean {
    return config.video_config.total_count > 0 && config.video_config.ai_sources_for_videos.length > 0;
  }

  /**
   * Update video configuration and refetch if needed
   */
  static async updateConfigAndRefetch(
    productId: string,
    productName: string,
    newConfig: Partial<FetchConfig['video_config']>,
    signal?: AbortSignal
  ): Promise<{ success: boolean; videoCount: number; error?: string }> {
    try {
      // Update configuration
      FetchConfigService.updateConfig({
        video_config: {
          ...FetchConfigService.getConfig().video_config,
          ...newConfig
        }
      });

      // Get current videos
      const existingVideos = await getProductVideos(productId);
      const newTotalCount = FetchConfigService.getConfig().video_config.total_count;

      // If we need more videos, fetch them
      if (existingVideos.length < newTotalCount) {
        return await this.fetchAndSaveVideos(productId, productName, signal);
      }

      return {
        success: true,
        videoCount: existingVideos.length
      };
    } catch (error) {
      console.error('Error updating config and refetching videos:', error);
      return {
        success: false,
        videoCount: 0,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get recommended video search queries based on product name
   */
  static generateVideoSearchQueries(productName: string, aiEnabled: boolean): string[] {
    const baseQuery = productName.replace(/[^\w\s]/g, '').trim();
    const basicQueries = [
      `${baseQuery} review`,
      `${baseQuery} unboxing`,
      `${baseQuery} demo`,
    ];

    if (aiEnabled) {
      return [
        ...basicQueries,
        `${baseQuery} honest review 2024`,
        `${baseQuery} vs comparison`,
        `${baseQuery} pros and cons`,
        `is ${baseQuery} worth it`,
        `${baseQuery} long term review`,
        `${baseQuery} buying guide`,
      ];
    }

    return basicQueries;
  }
}