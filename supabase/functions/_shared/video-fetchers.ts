// Video fetching implementations based on configuration
import { config } from './config.ts';
import { Video } from './types.ts';
import { getTopReviewVideos } from './youtube-service.ts';
import { FetchConfigService, VideoConfig } from './fetch-config.ts';

export interface VideoFetcher {
  fetchVideos(productName: string, maxCount: number, signal?: AbortSignal): Promise<Video[]>;
  getSourceType(): 'youtube' | 'tiktok' | 'ai_curated';
  isEnabled(aiEnabled: boolean): boolean;
}

// YouTube video fetcher
export class YouTubeVideoFetcher implements VideoFetcher {
  async fetchVideos(productName: string, maxCount: number, signal?: AbortSignal): Promise<Video[]> {
    try {
      console.log(`Fetching YouTube videos for: ${productName}`);
      const videos = await getTopReviewVideos(productName, maxCount, signal);

      // Transform to ensure consistent format
      return videos.map(video => ({
        ...video,
        platform: 'YouTube' as const,
      }));
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      return [];
    }
  }

  getSourceType(): 'youtube' {
    return 'youtube';
  }

  isEnabled(_aiEnabled: boolean): boolean {
    return true; // YouTube is always available
  }
}

// TikTok video fetcher
export class TikTokVideoFetcher implements VideoFetcher {
  async fetchVideos(productName: string, maxCount: number, signal?: AbortSignal): Promise<Video[]> {
    try {
      console.log(`Fetching TikTok videos for: ${productName}`);

      // TikTok Research API endpoint (requires approval)
      const response = await fetch(config.tiktok.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.tiktok.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: {
            and: [
              { field_name: 'keyword', operation: 'IN', field_values: [productName, `${productName} review`] }
            ]
          },
          max_count: maxCount,
          start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
          end_date: new Date().toISOString().split('T')[0]
        }),
        signal
      });

      if (!response.ok) {
        console.error('TikTok API error:', response.status, await response.text());
        return [];
      }

      const data = await response.json();

      return (data.data?.videos || []).map((video: any) => ({
        id: video.id,
        title: video.video_description || `${productName} review`,
        description: video.video_description,
        video_url: `https://www.tiktok.com/@${video.username}/video/${video.id}`,
        thumbnail_url: video.cover_image_url,
        views: video.view_count || 0,
        likes: video.like_count || 0,
        platform: 'TikTok' as const,
      }));
    } catch (error) {
      console.error('Error fetching TikTok videos:', error);
      return [];
    }
  }

  getSourceType(): 'tiktok' {
    return 'tiktok';
  }

  isEnabled(aiEnabled: boolean): boolean {
    return aiEnabled; // Only enabled when AI is enabled
  }
}

// AI-curated video fetcher (enhanced search with AI filtering)
export class AICuratedVideoFetcher implements VideoFetcher {
  async fetchVideos(productName: string, maxCount: number, signal?: AbortSignal): Promise<Video[]> {
    try {
      console.log(`Fetching AI-curated videos for: ${productName}`);

      // Use AI to generate optimal search queries
      const aiGeneratedQueries = await this.generateAIEnhancedQueries(productName);
      const allVideos: Video[] = [];

      for (const query of aiGeneratedQueries) {
        try {
          const videos = await getTopReviewVideos(query, Math.ceil(maxCount * 1.5 / aiGeneratedQueries.length), signal);
          allVideos.push(...videos);

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error fetching videos for query "${query}":`, error);
          continue;
        }
      }

      // Remove duplicates
      const uniqueVideos = this.deduplicateVideos(allVideos);

      // Check config for AI video ranking
      const config = FetchConfigService.getConfig();
      const aiRankingEnabled = config.video_config.ai_video_ranking_enabled !== false;
      if (!aiRankingEnabled) {
        // If disabled, just return unique videos (no AI ranking)
        return uniqueVideos.slice(0, maxCount).map(video => ({
          ...video,
          platform: 'YouTube' as const,
        }));
      }

      // Use AI to rank by relevance
      const aiRankedVideos = await this.rankVideosWithAI(uniqueVideos, productName, maxCount);

      return aiRankedVideos.slice(0, maxCount).map(video => ({
        ...video,
        platform: 'YouTube' as const,
      }));
    } catch (error) {
      console.error('Error with AI-curated video fetching:', error);
      return [];
    }
  }

  private async generateAIEnhancedQueries(productName: string): Promise<string[]> {
    try {
      const openAIApiKey = config.ai.apiKey;
      if (!openAIApiKey) {
        return this.generateFallbackQueries(productName);
      }

      const response = await fetch(config.ai.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ai.model,
          messages: [
            {
              role: 'system',
              content: 'You are a search query optimizer for finding the most relevant product review videos. Generate 3-5 diverse, specific search queries that would find the best review videos for the given product.'
            },
            {
              role: 'user',
              content: `Generate search queries to find the best review videos for: "${productName}". Include queries for honest reviews, comparisons, unboxings, pros/cons, and long-term usage. Return only the queries, one per line.`
            }
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const queries = data.choices[0].message.content.trim().split('\n').filter((q: string) => q.trim());
        return queries.length > 0 ? queries : this.generateFallbackQueries(productName);
      }
    } catch (error) {
      console.error('Error generating AI queries:', error);
    }

    return this.generateFallbackQueries(productName);
  }

  private generateFallbackQueries(productName: string): string[] {
    const baseQuery = productName.replace(/[^\w\s]/g, '').trim();
    return [
      `${baseQuery} review 2024`,
      `${baseQuery} unboxing honest review`,
      `${baseQuery} vs comparison`,
      `${baseQuery} pros and cons`,
      `is ${baseQuery} worth it`,
      `${baseQuery} long term review`,
    ];
  }

  private async rankVideosWithAI(videos: Video[], productName: string, maxCount: number): Promise<Video[]> {
    try {
      const openAIApiKey = config.ai.apiKey;
      if (!openAIApiKey || videos.length <= maxCount) {
        return this.rankVideosByQuality(videos, productName);
      }

      // Prepare video data for AI ranking
      const videoData = videos.slice(0, Math.min(20, videos.length)).map((video, index) => ({
        index,
        title: video.title,
        views: video.views,
        likes: video.likes,
        description: video.description?.substring(0, 200) || ''
      }));

      const response = await fetch(config.ai.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ai.model,
          messages: [
            {
              role: 'system',
              content: `You are a video relevance analyzer. Rank videos by relevance for product reviews. Consider title relevance, engagement metrics, and content quality indicators. Return only the indices in order of relevance (most relevant first), separated by commas.`
            },
            {
              role: 'user',
              content: `Product: "${productName}"\nRank these ${videoData.length} videos by relevance for product reviews (return top ${maxCount} indices):\n\n${videoData.map(v => `${v.index}: "${v.title}" (${v.views} views, ${v.likes} likes)`).join('\n')}`
            }
          ],
          max_tokens: 100,
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rankedIndices = data.choices[0].message.content.trim()
          .split(',')
          .map((idx: string) => parseInt(idx.trim()))
          .filter((idx: number) => !isNaN(idx) && idx >= 0 && idx < videos.length);

        if (rankedIndices.length > 0) {
          return rankedIndices.map(idx => videos[idx]).filter(Boolean);
        }
      }
    } catch (error) {
      console.error('Error ranking videos with AI:', error);
    }

    return this.rankVideosByQuality(videos, productName);
  }

  private deduplicateVideos(videos: Video[]): Video[] {
    const seen = new Set<string>();
    return videos.filter(video => {
      const key = video.video_url || video.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async rankVideosByQuality(videos: Video[], productName: string): Promise<Video[]> {
    // Simple ranking algorithm based on views, likes, and title relevance
    return videos.sort((a, b) => {
      const scoreA = this.calculateVideoScore(a, productName);
      const scoreB = this.calculateVideoScore(b, productName);
      return scoreB - scoreA;
    });
  }

  private calculateVideoScore(video: Video, productName: string): number {
    let score = 0;

    // Views score (normalized)
    const viewsScore = Math.log(video.views + 1) / Math.log(1000000); // Normalize to 0-1
    score += viewsScore * 0.3;

    // Likes score (normalized)
    const likesScore = Math.log(video.likes + 1) / Math.log(100000); // Normalize to 0-1
    score += likesScore * 0.3;

    // Title relevance score
    const titleWords = video.title.toLowerCase().split(/\s+/);
    const productWords = productName.toLowerCase().split(/\s+/);
    const relevanceScore = productWords.filter(word =>
      titleWords.some(titleWord => titleWord.includes(word) || word.includes(titleWord))
    ).length / productWords.length;
    score += relevanceScore * 0.4;

    return score;
  }

  getSourceType(): 'ai_curated' {
    return 'ai_curated';
  }

  isEnabled(aiEnabled: boolean): boolean {
    return aiEnabled; // Only enabled when AI is enabled
  }

  async rankAndSelectVideos(videos: Video[], productName: string, maxCount: number, signal?: AbortSignal): Promise<Video[]> {
    // Remove duplicates first
    const uniqueVideos = this.deduplicateVideos(videos);
    
    // Use AI to rank by relevance
    const rankedVideos = await this.rankVideosWithAI(uniqueVideos, productName, maxCount);
    
    return rankedVideos.slice(0, maxCount).map(video => ({
      ...video,
      platform: video.platform || 'YouTube' as const,
    }));
  }
}

// Video fetcher factory
export class VideoFetcherFactory {
  static createEnabledFetchers(videoConfig: VideoConfig): VideoFetcher[] {
    const fetchers: VideoFetcher[] = [];

    if (videoConfig.total_count <= 0) {
      return fetchers; // No videos requested
    }

    // Add fetchers based on enabled sources
    if (videoConfig.ai_sources_for_videos.includes('youtube')) {
      fetchers.push(new YouTubeVideoFetcher());
    }

    if (videoConfig.ai_sources_for_videos.includes('tiktok')) {
      fetchers.push(new TikTokVideoFetcher());
    }

    // Add AI-curated fetcher if AI video is enabled
    if (videoConfig.ai_video_enabled) {
      fetchers.push(new AICuratedVideoFetcher());
    }

    return fetchers.filter(fetcher => fetcher.isEnabled(videoConfig.ai_video_enabled));
  }

  static async fetchVideosWithConfig(
    productName: string,
    videoConfig: VideoConfig,
    signal?: AbortSignal
  ): Promise<Video[]> {
    if (videoConfig.total_count <= 0) {
      console.log('Video count is 0, skipping video fetch');
      return [];
    }

    // When AI video is enabled, use only AI (not YouTube)
    if (videoConfig.ai_video_enabled) {
      console.log('Using AI video fetching with sources:', videoConfig.ai_sources_for_videos);
      return await this.fetchVideosWithAI(productName, videoConfig, signal);
    }

    // When AI video is disabled, use YouTube
    // Check if AI ranking is enabled for YouTube videos
    if (videoConfig.ai_video_ranking_enabled) {
      console.log('Using YouTube with AI ranking');
      return await this.fetchVideosWithAIRanking(productName, videoConfig, signal);
    }

    // Fallback to standard YouTube fetching
    console.log('Using standard YouTube fetching');
    return await this.fetchVideosStandard(productName, videoConfig, signal);
  }

  private static async fetchVideosWithAIRanking(
    productName: string,
    videoConfig: VideoConfig,
    signal?: AbortSignal
  ): Promise<Video[]> {
    console.log('Using AI ranking for video selection');
    
    // Fetch more videos than needed from enabled sources
    const allVideos: Video[] = [];
    const fetchCount = Math.max(videoConfig.total_count * 2, 10); // Fetch 2x or at least 10
    
    for (const source of videoConfig.ai_sources_for_videos) {
      if (source === 'youtube') {
        const youtubeFetcher = new YouTubeVideoFetcher();
        const videos = await youtubeFetcher.fetchVideos(productName, fetchCount, signal);
        allVideos.push(...videos);
      } else if (source === 'tiktok') {
        const tiktokFetcher = new TikTokVideoFetcher();
        if (tiktokFetcher.isEnabled(true)) {
          const videos = await tiktokFetcher.fetchVideos(productName, fetchCount, signal);
          allVideos.push(...videos);
        }
      }
    }

    // Use AI to rank and select the best videos
    if (allVideos.length > 0) {
      const aiCuratedFetcher = new AICuratedVideoFetcher();
      return await aiCuratedFetcher.rankAndSelectVideos(
        allVideos, 
        productName, 
        videoConfig.returned_video_count,
        signal
      );
    }

    return allVideos.slice(0, videoConfig.returned_video_count);
  }

  private static async fetchVideosWithAI(
    productName: string,
    videoConfig: VideoConfig,
    signal?: AbortSignal
  ): Promise<Video[]> {
    console.log('Using AI-curated video fetching');
    const aiCuratedFetcher = new AICuratedVideoFetcher();
    return await aiCuratedFetcher.fetchVideos(productName, videoConfig.returned_video_count, signal);
  }

  private static async fetchVideosStandard(
    productName: string,
    videoConfig: VideoConfig,
    signal?: AbortSignal
  ): Promise<Video[]> {
    console.log('Using standard video fetching');
    const fetchers = this.createEnabledFetchers(videoConfig);
    
    if (fetchers.length === 0) {
      console.log('No video fetchers available');
      return [];
    }

    // Use the first available fetcher
    const fetcher = fetchers[0];
    return await fetcher.fetchVideos(productName, videoConfig.returned_video_count, signal);
  }
}