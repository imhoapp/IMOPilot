// AI Analysis module for product evaluation using OpenAI GPT-4

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

export interface AIAnalysisResult {
  pros: string[];
  cons: string[];
  imo_score: number;
}

export async function analyzeProductWithAI(productData: any): Promise<AIAnalysisResult> {
  const productInfo = {
    title: productData.title || '',
    description: productData.description || '',
    price: productData.price?.current_price || '',
    reviews: productData.reviews || [],
    rating: productData.rating || '',
    specifications: productData.specifications || []
  };

  const prompt = `Product: ${productInfo.title}
Price: $${productInfo.price}
Rating: ${productInfo.rating}/5

Provide ONLY this JSON:
{
  "pros": ["3 positive points"],
  "cons": ["3 negative points"], 
  "imo_score": 7
}

Score 1-10 based on price/value/quality.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: 'You are an expert product analyst. Respond only with valid JSON as requested.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    // Parse the JSON response
    const analysis = JSON.parse(aiResponse);
    
    return {
      pros: analysis.pros || [],
      cons: analysis.cons || [],
      imo_score: analysis.imo_score || 5
    };
  } catch (error) {
    console.error('Error analyzing product with AI:', error);
    return {
      pros: [],
      cons: [],
      imo_score: 5
    };
  }
}