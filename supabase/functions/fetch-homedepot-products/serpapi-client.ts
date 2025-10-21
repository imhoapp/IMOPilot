// SerpAPI client module for Home Depot product searches

const serpApiKey = Deno.env.get('SERPAPI_API_KEY');

export interface SerpApiProductsResponse {
  products: any[];
  filters: any;
}

export interface SerpApiProductDetailsResponse {
  product_results: {
    description?: string;
    rating?: string;
  };
}

export interface SerpApiReviewsResponse {
  reviews: Array<{
    rating: number;
    title: string;
    text: string;
  }>;
}

export async function fetchProducts(q: string, hd_sort?: string, hd_filter_tokens?: string): Promise<SerpApiProductsResponse> {
  const productParams = new URLSearchParams({
    engine: 'home_depot',
    q: q,
    lowerbound: '250',
    api_key: serpApiKey!
  });

  if (hd_sort) {
    productParams.append('hd_sort', hd_sort);
  }

  if (hd_filter_tokens) {
    productParams.append('hd_filter_tokens', hd_filter_tokens);
  }

  const response = await fetch(`https://serpapi.com/search?${productParams.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SerpApi error: ${response.statusText}, details: ${errorText}`);
  }

  return await response.json();
}

export async function fetchFilterOptions(q: string): Promise<any> {
  const filterParams = new URLSearchParams({
    engine: 'home_depot',
    q: q,
    api_key: serpApiKey!
  });

  const response = await fetch(`https://serpapi.com/search?${filterParams.toString()}`);
  
  if (response.ok) {
    const data = await response.json();
    return data.filters || {};
  } else {
    console.warn('Failed to fetch filter options:', response.statusText);
    return {};
  }
}

export async function fetchProductDetails(productId: string): Promise<SerpApiProductDetailsResponse | null> {
  try {
    console.log(`=== FETCHING PRODUCT DETAILS FOR ${productId} ===`);
    const productDetailsParams = new URLSearchParams({
      engine: 'home_depot_product',
      product_id: productId,
      api_key: serpApiKey!
    });

    const url = `https://serpapi.com/search?${productDetailsParams.toString()}`;
    console.log(`Product details URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`Product details response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Product details raw response:`, JSON.stringify(data, null, 2));
      return data;
    } else {
      const errorText = await response.text();
      console.error(`Product details API error: ${response.status} - ${errorText}`);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching product details for ${productId}:`, error);
    return null;
  }
}

export async function fetchProductReviews(productId: string): Promise<SerpApiReviewsResponse | null> {
  try {
    console.log(`=== FETCHING PRODUCT REVIEWS FOR ${productId} ===`);
    const reviewsParams = new URLSearchParams({
      engine: 'home_depot_product_reviews',
      product_id: productId,
      api_key: serpApiKey!
    });

    const url = `https://serpapi.com/search?${reviewsParams.toString()}`;
    console.log(`Product reviews URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`Product reviews response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Product reviews raw response:`, JSON.stringify(data, null, 2));
      return data;
    } else {
      const errorText = await response.text();
      console.error(`Product reviews API error: ${response.status} - ${errorText}`);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching reviews for ${productId}:`, error);
    return null;
  }
}