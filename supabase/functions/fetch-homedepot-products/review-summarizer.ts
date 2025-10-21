// Review summarization module using OpenAI

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

export async function summarizeReviews(reviews: Array<{ rating: number; title: string; text: string }>): Promise<string | null> {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  try {
    // Prepare reviews for AI summarization
    const reviewsText = reviews.slice(0, 10).map(review => 
      `Rating: ${review.rating}/5, Title: ${review.title}, Review: ${review.text}`
    ).join('\n\n');

    // Get AI summary of reviews
    console.log(`Creating AI summary for ${reviews.length} reviews`);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at summarizing product reviews. Create a concise, balanced summary highlighting the main positives and negatives mentioned by customers. Keep it under 200 words.' 
          },
          { 
            role: 'user', 
            content: `Summarize these Home Depot product reviews:\n\n${reviewsText}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content.trim();
    }
    
    return null;
  } catch (error) {
    console.error('Error summarizing reviews:', error);
    return null;
  }
}