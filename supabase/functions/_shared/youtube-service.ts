// YouTube video search and statistics service
import { config } from './config.ts';
import { fetchWithTimeout } from './utils.ts';
import { Video } from './types.ts';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: { 
      medium?: { url: string }; 
      default?: { url: string };
      high?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeStatsResponse {
  items: Array<{
    id: string;
    statistics: {
      viewCount?: string;
      likeCount?: string;
    };
  }>;
}

export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 6,
  signal?: AbortSignal
): Promise<YouTubeSearchItem[]> {
  if (!config.youtube.apiKey) {
    console.warn('YouTube API key not configured');
    return [];
  }

  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: String(maxResults),
    q: `${query} review`,
    order: 'relevance',
    key: config.youtube.apiKey,
  });

  const url = `${config.youtube.baseUrl}/search?${searchParams}`;

  try {
    const response = await fetchWithTimeout<YouTubeSearchResponse>(
      url,
      {},
      10000,
      signal
    );

    return response.items || [];
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

export async function getVideoStatistics(
  videoIds: string[],
  signal?: AbortSignal
): Promise<Record<string, { views: number; likes: number }>> {
  if (!config.youtube.apiKey || videoIds.length === 0) {
    return {};
  }

  const searchParams = new URLSearchParams({
    part: 'statistics',
    id: videoIds.join(','),
    key: config.youtube.apiKey,
  });

  const url = `${config.youtube.baseUrl}/videos?${searchParams}`;

  try {
    const response = await fetchWithTimeout<YouTubeStatsResponse>(
      url,
      {},
      10000,
      signal
    );

    const stats: Record<string, { views: number; likes: number }> = {};
    
    response.items?.forEach((video) => {
      stats[video.id] = {
        views: parseInt(video.statistics.viewCount || '0', 10),
        likes: parseInt(video.statistics.likeCount || '0', 10),
      };
    });

    return stats;
  } catch (error) {
    console.error('YouTube stats error:', error);
    return {};
  }
}

export async function getTopReviewVideos(
  productName: string,
  maxVideos: number = 3,
  signal?: AbortSignal
): Promise<Video[]> {
  const searchResults = await searchYouTubeVideos(productName, 10, signal);
  const topVideos = searchResults.slice(0, maxVideos);

  if (topVideos.length === 0) return [];

  const videoIds = topVideos.map(video => video.id.videoId);
  const stats = await getVideoStatistics(videoIds, signal);

  return topVideos.map((video): Video => {
    const videoId = video.id.videoId;
    const videoStats = stats[videoId] || { views: 0, likes: 0 };

    return {
      platform: 'YouTube',
      title: video.snippet.title,
      description: video.snippet.description,
      video_url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail_url: 
        video.snippet.thumbnails.high?.url ||
        video.snippet.thumbnails.medium?.url || 
        video.snippet.thumbnails.default?.url || 
        '',
      views: videoStats.views,
      likes: videoStats.likes,
    };
  });
}