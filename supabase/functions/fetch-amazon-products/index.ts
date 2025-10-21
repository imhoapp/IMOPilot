import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { config } from '../_shared/config.ts';
const supabaseUrl = config.supabase.url;
const supabaseServiceKey = config.supabase.key;
const amazonAccessKey = Deno.env.get('AMAZON_ACCESS_KEY_ID');
const amazonSecretKey = Deno.env.get('AMAZON_SECRET_ACCESS_KEY');
const amazonAssociateTag = Deno.env.get('AMAZON_ASSOCIATE_TAG');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!amazonAccessKey || !amazonSecretKey || !amazonAssociateTag) {
      return new Response(
        JSON.stringify({ error: 'Amazon API credentials not configured. Required: ACCESS_KEY_ID, SECRET_ACCESS_KEY, ASSOCIATE_TAG' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { category, keyword, maxResults = 10 } = await req.json();

    if (!category && !keyword) {
      return new Response(
        JSON.stringify({ error: 'Either category or keyword must be provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Fetching Amazon products for: ${category || keyword}`);

    // Amazon Product Advertising API 5.0 requires AWS Signature Version 4
    const searchTerm = category || keyword;
    const host = 'webservices.amazon.com';
    const region = 'us-east-1';
    const service = 'ProductAdvertisingAPI';
    const endpoint = `https://${host}/paapi5/searchitems`;

    // Create the request payload for Amazon PA-API
    const requestBody = {
      Keywords: searchTerm,
      Resources: [
        "Images.Primary.Large",
        "ItemInfo.Title",
        "ItemInfo.Features",
        "Offers.Listings.Price"
      ],
      SearchIndex: "All",
      ItemCount: maxResults,
      PartnerTag: amazonAssociateTag,
      PartnerType: "Associates",
      Marketplace: "www.amazon.com"
    };

    // Generate AWS Signature V4
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = timestamp.substring(0, 8);

    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${timestamp}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems\n`;
    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
    const payloadHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(requestBody)))
      .then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));

    const canonicalRequest = `POST\n/paapi5/searchitems\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${date}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest))
      .then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''))}`;

    // Create signing key
    const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
      const kDate = await crypto.subtle.importKey('raw', new TextEncoder().encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        .then(k => crypto.subtle.sign('HMAC', k, new TextEncoder().encode(dateStamp)));
      const kRegion = await crypto.subtle.importKey('raw', new Uint8Array(kDate), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        .then(k => crypto.subtle.sign('HMAC', k, new TextEncoder().encode(regionName)));
      const kService = await crypto.subtle.importKey('raw', new Uint8Array(kRegion), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        .then(k => crypto.subtle.sign('HMAC', k, new TextEncoder().encode(serviceName)));
      const kSigning = await crypto.subtle.importKey('raw', new Uint8Array(kService), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        .then(k => crypto.subtle.sign('HMAC', k, new TextEncoder().encode('aws4_request')));
      return new Uint8Array(kSigning);
    };

    const signingKey = await getSignatureKey(amazonSecretKey, date, region, service);
    const signature = await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then(k => crypto.subtle.sign('HMAC', k, new TextEncoder().encode(stringToSign)))
      .then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));

    const authorizationHeader = `${algorithm} Credential=${amazonAccessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Make request to Amazon PA-API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-Amz-Date': timestamp,
        'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
        'Authorization': authorizationHeader
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('Amazon API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Amazon API error body:', errorText);
      return new Response(
        JSON.stringify({ error: `Amazon API error: ${response.statusText}`, details: errorText }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.SearchResult?.Items?.length || 0} products from Amazon API`);

    if (!data.SearchResult?.Items || data.SearchResult.Items.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No products found', products: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process and filter products over $250
    const processedProducts = data.SearchResult.Items
      .map((item: any) => {
        // Extract price from Amazon PA-API response
        let price = 0;
        if (item.Offers?.Listings?.[0]?.Price?.DisplayAmount) {
          const priceStr = item.Offers.Listings[0].Price.DisplayAmount.replace(/[^0-9.]/g, '');
          price = parseFloat(priceStr);
        }

        // Extract description from features
        let description = null;
        if (item.ItemInfo?.Features?.DisplayValues) {
          description = item.ItemInfo.Features.DisplayValues.slice(0, 3).join('. ');
        }

        return {
          title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
          description: description,
          price: price,
          image_url: item.Images?.Primary?.Large?.URL || null,
          external_url: item.DetailPageURL || null,
          source: 'Amazon',
          imo_score: null,
          pros: null,
          cons: null
        };
      })
      .filter((product: any) => product.price >= 250); // Filter for products over $250

    console.log(`Filtered to ${processedProducts.length} products over $250`);

    if (processedProducts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No products found over $250', products: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert or update products in the database
    const insertedProducts = [];
    const errors = [];

    for (const product of processedProducts) {
      try {
        // Check if product already exists by title and source
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('title', product.title)
          .eq('source', product.source)
          .single();

        if (existingProduct) {
          // Update existing product
          const { data, error } = await supabase
            .from('products')
            .update(product)
            .eq('id', existingProduct.id)
            .select()
            .single();

          if (error) {
            console.error('Error updating product:', error);
            errors.push({ product: product.title, error: error.message });
          } else {
            insertedProducts.push(data);
          }
        } else {
          // Insert new product
          const { data, error } = await supabase
            .from('products')
            .insert(product)
            .select()
            .single();

          if (error) {
            console.error('Error inserting product:', error);
            errors.push({ product: product.title, error: error.message });
          } else {
            insertedProducts.push(data);
          }
        }
      } catch (error) {
        console.error('Error processing product:', error);
        errors.push({ product: product.title, error: error.message });
      }
    }

    console.log(`Successfully processed ${insertedProducts.length} products`);

    return new Response(
      JSON.stringify({
        message: `Successfully processed ${insertedProducts.length} products`,
        products: insertedProducts,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-homedepot-products function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});