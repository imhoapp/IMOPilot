// YouTube API module for fetching product review videos

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
import { config } from '../_shared/config.ts';
const supabaseUrl = config.supabase.url;
const supabaseServiceKey = config.supabase.key;

export interface YouTubeVideo {
  platform: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  video_id?: string;
}

interface ProductContext {
  title: string;
  brand?: string;
  category?: string;
  tags?: string[];
}

// Timeout wrapper for API calls
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('YouTube API timeout')), timeoutMs)
    )
  ]);
}

// Extract brand and product type from title
function extractProductContext(productTitle: string): ProductContext {
  const title = productTitle.toLowerCase();
  
  // Common brand patterns
  const brandPatterns = [
    /^(maytag|frigidaire|ge|whirlpool|samsung|lg|bosch|kitchenaid|electrolux|kenmore|amana)/i,
    /\b(dyson|shark|bissell|hoover|eureka|black\+?decker|dewalt|milwaukee|makita|ryobi)/i,
    /\b(craftsman|husqvarna|troy-bilt|ariens|toro|echo|stihl|honda|briggs)/i
  ];
  
  let brand = '';
  for (const pattern of brandPatterns) {
    const match = productTitle.match(pattern);
    if (match) {
      brand = match[1];
      break;
    }
  }
  
  // Extract category hints
  const categoryKeywords = {
    appliance: ['dishwasher', 'refrigerator', 'washer', 'dryer', 'oven', 'microwave', 'range'],
    vacuum: ['vacuum', 'cleaner', 'cordless', 'stick', 'canister'],
    tool: ['drill', 'saw', 'hammer', 'wrench', 'screwdriver', 'impact'],
    outdoor: ['mower', 'trimmer', 'blower', 'chainsaw', 'edger', 'cultivator']
  };
  
  let category = '';
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => title.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  return { title: productTitle, brand, category };
}

// Generate multiple search queries with different strategies
function generateSearchQueries(context: ProductContext): string[] {
  const queries: string[] = [];
  const { title, brand, category } = context;
  
  // Clean title by removing common filler words
  const cleanTitle = title
    .replace(/\b(set|pack|piece|pieces|with|and|or|the|a|an|in|of|for|built-in|front|control)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Strategy 1: Brand + core product + review
  if (brand) {
    const coreProduct = cleanTitle.split(' ').slice(0, 3).join(' ');
    queries.push(`${brand} ${coreProduct} review site:youtube.com`);
  }
  
  // Strategy 2: Full clean title + review
  queries.push(`${cleanTitle} review site:youtube.com`);
  
  // Strategy 3: Category-specific search if available
  if (category && brand) {
    queries.push(`${brand} ${category} review site:youtube.com`);
  }
  
  // Strategy 4: Fallback without site restriction for broader results
  const mainKeywords = cleanTitle.split(' ').slice(0, 2).join(' ');
  queries.push(`${mainKeywords} review`);
  
  return queries.slice(0, 2); // Limit to 2 queries to avoid API quota issues
}

// Normalize video URL by removing tracking parameters
function normalizeVideoUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Keep only essential YouTube parameters
    const allowedParams = ['v', 't'];
    const newParams = new URLSearchParams();
    
    allowedParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        newParams.set(param, urlObj.searchParams.get(param)!);
      }
    });
    
    return `${urlObj.origin}${urlObj.pathname}?${newParams.toString()}`;
  } catch {
    return url;
  }
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

// Check if video is relevant to the product
function isRelevantVideo(video: any, context: ProductContext): boolean {
  const title = video.snippet.title.toLowerCase();
  const description = (video.snippet.description || '').toLowerCase();
  const productTitle = context.title.toLowerCase();
  
  // Extract key product terms
  const productTerms = productTitle
    .replace(/\b(set|pack|piece|pieces|with|and|or|the|a|an|in|of|for)\b/gi, '')
    .split(' ')
    .filter(term => term.length > 2)
    .slice(0, 3);
  
  // Check if at least one product term appears in video title or description
  const hasProductMatch = productTerms.some(term => 
    title.includes(term) || description.includes(term)
  );
  
  // Exclude generic or unrelated content
  const excludeKeywords = [
    'compilation', 'funny', 'prank', 'reaction', 'unboxing only',
    'live stream', 'music', 'song', 'dance', 'game', 'movie'
  ];
  
  const hasExcludedContent = excludeKeywords.some(keyword => 
    title.includes(keyword) || description.includes(keyword)
  );
  
  // Prefer videos with review-related keywords
  const reviewKeywords = ['review', 'test', 'unbox', 'demo', 'comparison', 'pros', 'cons'];
  const hasReviewContent = reviewKeywords.some(keyword => 
    title.includes(keyword) || description.includes(keyword)
  );
  
  return hasProductMatch && !hasExcludedContent && hasReviewContent;
}

// Check for existing videos in database to prevent duplicates
async function getExistingVideoIds(productId: string): Promise<Set<string>> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from('videos')
    .select('video_url')
    .eq('product_id', productId);
  
  if (error) {
    console.warn('Error fetching existing videos:', error);
    return new Set();
  }
  
  const existingIds = new Set<string>();
  data?.forEach(video => {
    const videoId = extractVideoId(video.video_url);
    if (videoId) existingIds.add(videoId);
  });
  
  return existingIds;
}

export async function fetchYouTubeVideos(productTitle: string, productId?: string): Promise<YouTubeVideo[]> {
  if (!youtubeApiKey) {
    console.warn('YouTube API key not configured - skipping video fetch');
    return [];
  }
  
  try {
    console.log(`Fetching YouTube videos for: ${productTitle}`);
    
    // Extract product context for better targeting
    const context = extractProductContext(productTitle);
    console.log(`Product context - Brand: ${context.brand}, Category: ${context.category}`);
    
    // Get existing video IDs to prevent duplicates
    const existingVideoIds = productId ? await getExistingVideoIds(productId) : new Set<string>();
    console.log(`Found ${existingVideoIds.size} existing videos for this product`);
    
    // Generate multiple search strategies
    const searchQueries = generateSearchQueries(context);
    console.log(`Generated ${searchQueries.length} search queries`);
    
    const allVideos: any[] = [];
    const seenVideoIds = new Set<string>();
    
    // Execute searches with different strategies
    for (const searchQuery of searchQueries) {
      try {
        console.log(`Searching with query: ${searchQuery}`);
        
        const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=5&order=relevance&key=${youtubeApiKey}`;
        
        const response = await withTimeout(fetch(youtubeUrl), 10000);
        
        if (!response.ok) {
          console.error(`YouTube API error for query "${searchQuery}":`, response.status);
          continue;
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          // Filter and deduplicate videos
          const filteredVideos = data.items.filter((item: any) => {
            const videoId = item.id.videoId;
            
            // Skip if duplicate or already exists in database
            if (seenVideoIds.has(videoId) || existingVideoIds.has(videoId)) {
              console.log(`Skipping duplicate video: ${item.snippet.title}`);
              return false;
            }
            
            // Check relevance
            if (!isRelevantVideo(item, context)) {
              console.log(`Skipping irrelevant video: ${item.snippet.title}`);
              return false;
            }
            
            seenVideoIds.add(videoId);
            return true;
          });
          
          allVideos.push(...filteredVideos);
          console.log(`Found ${filteredVideos.length} relevant videos from query "${searchQuery}"`);
        }
      } catch (error) {
        console.error(`Error with search query "${searchQuery}":`, error);
        continue;
      }
    }
    
    if (allVideos.length === 0) {
      console.log(`No relevant YouTube videos found for: ${productTitle}`);
      return [];
    }
    
    // Limit to top 5 videos to avoid overwhelming the database
    const topVideos = allVideos.slice(0, 5);
    
    // Get detailed video statistics
    const videoIds = topVideos.map((item: any) => item.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${youtubeApiKey}`;
    
    const statsResponse = await withTimeout(fetch(statsUrl), 10000);
    if (!statsResponse.ok) {
      console.error('YouTube Stats API error:', statsResponse.status);
      return [];
    }
    
    const statsData = await statsResponse.json();
    
    // Process and sort videos by engagement score
    const processedVideos = statsData.items
      .map((video: any) => {
        const views = parseInt(video.statistics.viewCount || '0');
        const likes = parseInt(video.statistics.likeCount || '0');
        
        // Calculate engagement score (likes per 1000 views)
        const engagementScore = views > 0 ? (likes / views) * 1000 : 0;
        
        const normalizedUrl = normalizeVideoUrl(`https://www.youtube.com/watch?v=${video.id}`);
        
        return {
          platform: 'YouTube',
          title: video.snippet.title,
          description: video.snippet.description || '',
          video_url: normalizedUrl,
          thumbnail_url: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
          views,
          likes,
          video_id: video.id,
          engagementScore
        };
      })
      .sort((a: any, b: any) => {
        // Sort by engagement score first, then by views
        if (b.engagementScore !== a.engagementScore) {
          return b.engagementScore - a.engagementScore;
        }
        return b.views - a.views;
      })
      .slice(0, 3); // Final limit to top 3 videos
    
    console.log(`Returning ${processedVideos.length} curated videos for: ${productTitle}`);
    
    // Log skipped videos for debugging
    const skippedCount = allVideos.length - processedVideos.length;
    if (skippedCount > 0) {
      console.log(`Filtered out ${skippedCount} videos (duplicates: ${existingVideoIds.size}, low relevance, low engagement)`);
    }
    
    return processedVideos.map(({ engagementScore, ...video }) => video);
    
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    if (error.message === 'YouTube API timeout') {
      console.warn(`YouTube API timed out for product: ${productTitle}`);
    } else if (error.message?.includes('403')) {
      console.error('YouTube API quota exceeded or access denied');
    } else {
      console.error(`YouTube API error: ${error.message}`);
    }
    return [];
  }
}