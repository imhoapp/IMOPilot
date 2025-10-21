// AI analysis service using OpenAI
import { config } from './config.ts';
import type { AIAnalysisResult, BaseProduct } from './types.ts';
import { fetchWithTimeout } from './utils.ts';

interface ChatCompletionRequest {
  model: string;
  messages: { role: 'system' | 'user'; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function analyzeProductWithAI(
  product: BaseProduct,
  signal?: AbortSignal
): Promise<AIAnalysisResult> {
  const system = 'You are an expert product analyst with extensive knowledge of customer reviews and market feedback. Respond ONLY with valid JSON matching the schema.';

  const prompt = `
Analyze this product using both the provided details and your knowledge of typical customer reviews and feedback for this product:

PRODUCT DETAILS:
Title: ${product.title}
Price: $${product.price}
Description: ${product.description || 'No description available'}
Rating: ${product.site_rating || 'No rating'}
Source: ${product.source}

Based on your knowledge of customer reviews and feedback patterns for "${product.title}" and similar products, analyze the value proposition, common user experiences, and typical pros/cons mentioned in reviews.

Consider the price point, features, quality indicators, and what customers typically say about this specific product or product category.

Return ONLY JSON:
{
  "pros": ["3 strong positive points about value, quality, or features based on typical customer feedback and product analysis"],
  "cons": ["3 critical drawbacks or concerns commonly mentioned in reviews and product analysis"],
  "imo_score": number from 1-10 (overall value considering price/quality/features/customer satisfaction patterns)
}
`;

  try {
    const body: ChatCompletionRequest = {
      model: config.ai.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 512
    };

    const response = await fetchWithTimeout<ChatCompletionResponse>(
      config.ai.endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.apiKey}`
        },
        body: JSON.stringify(body)
      },
      30000, // Increased timeout from 15s to 30s
      signal
    );

    const rawContent = response.choices[0].message.content.trim();

    try {
      const analysis = JSON.parse(rawContent) as AIAnalysisResult;

      // Validate the response structure
      if (!Array.isArray(analysis.pros) || !Array.isArray(analysis.cons) ||
        typeof analysis.imo_score !== 'number') {
        throw new Error('Invalid AI response structure');
      }

      // Ensure imo_score is within valid range and is an integer
      analysis.imo_score = Math.round(Math.max(1, Math.min(10, analysis.imo_score)));

      return analysis;
    } catch (error) {
      console.error('Failed to parse AI response:', rawContent, error);
      throw new Error('AI returned invalid JSON');
    }
  } catch (error) {
    console.error('AI analysis failed:', error);

    // Return fallback analysis
    return {
      pros: ['Product available from reputable source', 'Competitive pricing', 'Standard features'],
      cons: ['Limited product information', 'Unable to analyze detailed features', 'Review analysis unavailable'],
      imo_score: 5
    };
  }
}

export async function analyzeProductsBatch(
  products: BaseProduct[],
  signal?: AbortSignal
): Promise<AIAnalysisResult[]> {
  if (!products || products.length === 0) return [];


  const system = 'You are a senior product analyst. Return ONLY strict JSON (no prose, no markdown, no code fences). Output an array with length equal to the number of input products, in the exact same order. For each item: include exactly 3 concise "pros" and 3 concise "cons" focused on value, quality, and features; set "imo_score" as an integer 1-10 reflecting overall value considering price, quality, and typical user satisfaction. Do not include extra fields or nulls.';

  const productBlocks = products.map((p, i) => `#${i + 1}\nTitle: ${p.title}\nPrice: $${p.price}\nDescription: ${p.description || 'N/A'}\nRating: ${p.site_rating ?? 'N/A'}\nSource: ${p.source}`)
    .join('\n\n');

  const prompt = `Analyze the following ${products.length} products and produce high-quality, concise pros/cons and an IMO score for each.\n\n${productBlocks}\n\nInstructions:\n- Use only the details provided plus common review patterns for similar products (no fabricated specs or claims).\n- Pros and cons must be actionable and non-redundant; avoid restating the title.\n- Tailor assessments to price, rating, build quality signals, and source reputation.\n- Keep each bullet short (under 12 words).\n- "imo_score" must be an INTEGER 1-10 reflecting overall value (price/quality/features).\n\nSTRICT OUTPUT FORMAT:\nReturn ONLY a JSON array of length ${products.length}, in the SAME ORDER as input. No markdown, no code fences, no comments. Each item must match exactly:\n[\n  {\n    "pros": ["point 1", "point 2", "point 3"],\n    "cons": ["point 1", "point 2", "point 3"],\n    "imo_score": 7\n  }\n]`;

  try {
    const body: ChatCompletionRequest = {
      model: config.ai.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: Math.min(1500, products.length * 80) // Optimize token usage
    };

    const response = await fetchWithTimeout<ChatCompletionResponse>(
      config.ai.endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.apiKey}`
        },
        body: JSON.stringify(body)
      },
      25000, // Slightly reduced timeout for faster failure detection
      signal
    );

    let rawContent = response.choices[0].message.content.trim();

    // Extract JSON if wrapped in code fences
    const fenced = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenced) rawContent = fenced[1].trim();

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch (_e) {
      // Try to find JSON array within text
      const arrayMatch = rawContent.match(/(\[[\s\S]*\])/);
      if (!arrayMatch) throw new Error('No JSON array found in AI response');
      parsed = JSON.parse(arrayMatch[1]);
    }

    if (!Array.isArray(parsed)) throw new Error('AI response is not an array');

    let results: AIAnalysisResult[] = parsed.map((item: any) => ({
      pros: Array.isArray(item?.pros) ? item.pros.slice(0, 3) : [], // Limit to 3 pros
      cons: Array.isArray(item?.cons) ? item.cons.slice(0, 3) : [], // Limit to 3 cons
      imo_score: Math.round(Math.max(1, Math.min(10, Number(item?.imo_score) || 5))),
    }));

    // Normalize length to match input
    if (results.length !== products.length) {
      const fallback: AIAnalysisResult = {
        pros: ['Available from reputable source'],
        cons: ['Limited analysis available'],
        imo_score: 5,
      };
      if (results.length > products.length) results = results.slice(0, products.length);
      while (results.length < products.length) results.push({ ...fallback });
    }

    return results;
  } catch (error) {
    console.error('Batch AI analysis failed:', error);
    return products.map(() => ({
      pros: ['Product available from reputable source', 'Competitive pricing', 'Standard features'],
      cons: ['Limited product information', 'Unable to analyze detailed features', 'Review analysis unavailable'],
      imo_score: 5,
    }));
  }
}

export async function generateAIReviews(
  productName: string,
  reviewCount: number,
  signal?: AbortSignal
): Promise<Array<{
  rating: number;
  title: string;
  text: string;
  author: string;
  source: string;
  review_date: string;
  positive_feedback: number;
  negative_feedback: number;
}>> {
  const system = `You are an expert at researching and finding real customer reviews from across the internet. Your task is to identify and synthesize actual customer feedback from various sources like Amazon, Reddit, forums, review sites, and social media.

Important guidelines:
- Find and compile REAL customer reviews from the internet
- Focus on authentic user experiences and feedback
- Include reviews from multiple sources (Amazon, Reddit, forums, etc.)
- Preserve the original tone and authenticity of real reviews
- Ensure diverse perspectives and experiences
- Use realistic source attribution for each review`;

  const prompt = `Research and compile ${reviewCount} real customer reviews for "${productName}" from across the internet.

Search for actual customer feedback from:
- Amazon product reviews
- Reddit discussions and reviews
- Forum posts and discussions
- Social media mentions
- Professional review sites
- YouTube comments and reviews

Compile authentic reviews that reflect real user experiences. Each review should be based on actual customer feedback found online.

For each review, estimate realistic values based on typical review patterns:
- review_date: Estimate when the review was likely posted (within last 2 years)
- positive_feedback: Number of helpful votes (0-50, higher for detailed reviews)
- negative_feedback: Number of unhelpful votes (0-10, usually lower than positive)

Return ONLY valid JSON array:
[
  {
    "rating": number from 1-5 (based on the actual review sentiment),
    "title": "Brief review title",
    "text": "The actual review text or synthesized from real feedback",
    "author": "Realistic reviewer name",
    "source": "Source where this review was found (Amazon, Reddit, etc.)",
    "review_date": "YYYY-MM-DD format (estimated date within last 2 years)",
    "positive_feedback": number (0-50, estimated helpful votes),
    "negative_feedback": number (0-10, estimated unhelpful votes)
  }
]`;

  try {
    const body: ChatCompletionRequest = {
      model: config.ai.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    const response = await fetchWithTimeout<ChatCompletionResponse>(
      config.ai.endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.apiKey}`
        },
        body: JSON.stringify(body)
      },
      45000,
      signal
    );

    const rawContent = response.choices[0].message.content.trim();

    try {
      // Extract JSON from the response - handle cases where JSON is embedded in text
      let cleanContent = rawContent;

      // Look for JSON array wrapped in code blocks
      const jsonMatch = cleanContent.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        cleanContent = jsonMatch[1];
      } else if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      } else {
        // Try to find JSON array in the text
        const arrayMatch = cleanContent.match(/(\[[\s\S]*\])/);
        if (arrayMatch) {
          cleanContent = arrayMatch[1];
        }
      }

      const reviews = JSON.parse(cleanContent);

      // Validate the response structure
      if (!Array.isArray(reviews)) {
        console.error('AI response is not an array:', cleanContent);
        throw new Error('Invalid AI response: expected array');
      }

      // Validate each review
      const validatedReviews = reviews.filter(review => {
        const isValid = typeof review.rating === 'number' &&
          typeof review.title === 'string' &&
          typeof review.text === 'string' &&
          typeof review.author === 'string' &&
          typeof review.source === 'string' &&
          typeof review.review_date === 'string' &&
          typeof review.positive_feedback === 'number' &&
          typeof review.negative_feedback === 'number' &&
          review.rating >= 1 && review.rating <= 5 &&
          review.positive_feedback >= 0 && review.positive_feedback <= 50 &&
          review.negative_feedback >= 0 && review.negative_feedback <= 10;

        if (!isValid) {
          console.warn('Invalid review object:', review);
        }
        return isValid;
      });

      if (validatedReviews.length === 0) {
        console.error('No valid reviews found in AI response:', cleanContent);
        throw new Error('No valid reviews generated by AI');
      }

      return validatedReviews.slice(0, reviewCount);
    } catch (parseError) {
      console.error('Failed to parse AI reviews response:', rawContent);
      console.error('Parse error:', parseError);
      throw new Error('AI returned invalid JSON for reviews');
    }
  } catch (error) {
    console.error('AI review generation failed:', error);

    // Return empty array in case of error
    return [];
  }
}

export async function summarizeReviews(
  reviews: string[],
  productName: string,
  signal?: AbortSignal
): Promise<string> {
  if (!reviews.length) return '';

  const system = 'You are an expert at summarizing product reviews. Create a concise, balanced summary highlighting the main positives and negatives mentioned by customers. Keep it under 200 words.';

  const prompt = `Summarize the following reviews for "${productName}" in <200 words, balanced pros/cons:

${reviews.map((review, i) => `Review ${i + 1}: ${review}`).join('\n\n')}`;

  try {
    const body: ChatCompletionRequest = {
      model: config.ai.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300
    };

    const response = await fetchWithTimeout<ChatCompletionResponse>(
      config.ai.endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.apiKey}`
        },
        body: JSON.stringify(body)
      },
      15000,
      signal
    );

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Review summarization failed:', error);
    return '';
  }
}