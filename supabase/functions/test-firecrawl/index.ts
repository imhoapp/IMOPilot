import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_KEY not found in environment variables');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'FIRECRAWL_KEY not configured',
          details: 'Please ensure FIRECRAWL_KEY is set in Supabase Edge Function Secrets'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { query = 'Apple iPhone 15 Pro, 256GB, Blue Titanium - Unlocked' } = await req.json().catch(() => ({}));

    console.log('Testing FireCrawl with query:', query);
    console.log('FireCrawl API Key present:', !!firecrawlApiKey);

    // Test FireCrawl search functionality
    const response = await fetch('https://api.firecrawl.dev/v0/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        pageOptions: {
          includeHtml: false,
          includeRawHtml: false,
          onlyMainContent: true
        },
        limit: 3
      })
    });

    console.log('FireCrawl API Response Status:', response.status);
    console.log('FireCrawl API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FireCrawl API Error:', errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `FireCrawl API error: ${response.status}`,
          details: errorText,
          status: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('FireCrawl API Response Data:', JSON.stringify(data, null, 2));

    // Test review extraction logic
    const testReviews = extractTestReviews(data.data || []);

    return new Response(
      JSON.stringify({
        success: true,
        query: query,
        firecrawlResponse: data,
        extractedReviews: testReviews,
        totalResults: data.data?.length || 0,
        message: 'FireCrawl test completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in test-firecrawl function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        details: 'Unexpected error during FireCrawl test'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractTestReviews(searchResults: any[]): any[] {
  const reviews: any[] = [];

  for (const result of searchResults) {
    try {
      const content = result.content || '';
      const url = result.metadata?.url || '';

      console.log('Processing result from:', url);
      console.log('Content preview:', content.substring(0, 200));

      // Extract review-like content using simple patterns
      const reviewPatterns = [
        /(?:I bought|I purchased|I got|I have|I own)[\s\S]{20,300}(?:\.|!|\?)/gi,
        /(?:Great|Good|Bad|Terrible|Amazing|Awful|Love|Hate)[\s\S]{20,300}(?:\.|!|\?)/gi,
        /(?:Rating|Score|Stars?)[\s\S]{10,200}(?:\.|!|\?)/gi,
      ];

      for (const pattern of reviewPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches.slice(0, 2)) { // Max 2 reviews per page
            const cleanText = match.trim();
            if (cleanText.length > 30 && cleanText.length < 500) {
              reviews.push({
                rating: extractRating(cleanText),
                title: result.metadata?.title || 'Test Review',
                review_text: cleanText,
                reviewer_name: 'Test User',
                verified_purchase: false,
                review_date: new Date().toISOString(),
                source: 'FireCrawl',
                original_url: url
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting review from content:', error);
      continue;
    }
  }

  return reviews;
}

function extractRating(text: string): number {
  // Try to extract rating from text
  const ratingPatterns = [
    /(\d+)\/5/,
    /(\d+) out of 5/,
    /(\d+) stars/,
    /rated? (\d+)/i,
  ];

  for (const pattern of ratingPatterns) {
    const match = text.match(pattern);
    if (match) {
      const rating = parseInt(match[1]);
      if (rating >= 1 && rating <= 5) {
        return rating;
      }
    }
  }

  // Sentiment-based rating fallback
  const positiveWords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'best'];
  const negativeWords = ['terrible', 'awful', 'hate', 'worst', 'bad', 'horrible'];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

  if (positiveCount > negativeCount) return 4;
  if (negativeCount > positiveCount) return 2;
  return 3; // Neutral
}