import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { analyzeProductsBatch } from '../_shared/ai-service.ts';
import { validateConfig } from '../_shared/config.ts';
import { searchExistingProducts, upsertProducts } from '../_shared/database-service.ts';
import { FetchConfigService } from '../_shared/fetch-config.ts';
import { oxylabsClient } from '../_shared/oxylabs-client.ts';
import { createEnabledFetchers } from '../_shared/source-fetchers.ts';
import type {
  Product,
  SearchOptions
} from '../_shared/types.ts';
import { chunkArray, createCorsHeaders, delay, logError, logInfo, logWarn } from '../_shared/utils.ts';

// Background analysis task management
const generateQueryHash = (query: string): string => {
  // Simple hash function for query - could use crypto.subtle.digest for production
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

const checkOrCreateBackgroundTask = async (
  supabase: any,
  queryHash: string,
  page: number
): Promise<{ status: 'running' | 'completed' | 'not_found', taskId?: string }> => {
  try {
    // Check if task exists
    const { data: existingTask, error } = await supabase
      .from('background_analysis_tasks')
      .select('*')
      .eq('query_hash', queryHash)
      .eq('page', page)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking background task:', error);
      return { status: 'not_found' };
    }

    if (existingTask) {
      // Check if task is stale (older than 10 minutes)
      const taskAge = Date.now() - new Date(existingTask.heartbeat_at).getTime();
      if (taskAge > 10 * 60 * 1000) {
        // Remove stale task
        await supabase
          .from('background_analysis_tasks')
          .delete()
          .eq('id', existingTask.id);
        return { status: 'not_found' };
      }

      return {
        status: existingTask.status as 'running' | 'completed',
        taskId: existingTask.id
      };
    }

    return { status: 'not_found' };
  } catch (error) {
    console.error('Error in checkOrCreateBackgroundTask:', error);
    return { status: 'not_found' };
  }
};

const createBackgroundTask = async (
  supabase: any,
  queryHash: string,
  page: number
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('background_analysis_tasks')
      .insert({
        query_hash: queryHash,
        page: page,
        status: 'running'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating background task:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in createBackgroundTask:', error);
    return null;
  }
};

const updateTaskProgress = async (
  supabase: any,
  taskId: string,
  updates: {
    status?: 'running' | 'completed' | 'failed',
    products_analyzed?: number,
    total_products?: number
  }
) => {
  try {
    const updateData: any = {
      heartbeat_at: new Date().toISOString(),
      ...updates
    };

    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    await supabase
      .from('background_analysis_tasks')
      .update(updateData)
      .eq('id', taskId);
  } catch (error) {
    console.error('Error updating task progress:', error);
  }
};

// Performance monitoring utilities
const logStep = (step: string, details?: any) => {
  const prefix = '[FETCH-PRODUCTS]';
  if (details) {
    logInfo(`${prefix} ${step}`, details);
  } else {
    logInfo(`${prefix} ${step}`);
  }
};

const logTiming = (operation: string, startTime: number, _additionalInfo?: any) => {
  const duration = Date.now() - startTime;
  // const info = additionalInfo ? ` - ${JSON.stringify(additionalInfo)}` : '';
  // console.log(`[TIMING] ${operation}: ${duration}ms${info}`);

  // Log slow operations
  if (duration > 10000) {
    logWarn(`[SLOW OPERATION] ${operation} took ${duration}ms - exceeds 10s threshold`);
  }

  return duration;
};

const corsHeaders = createCorsHeaders();

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Start timing
  const startTime = Date.now();
  // Timing summary for response
  const timingSummary: any = {
    externalFetch: {},
    ai: { batches: [] as number[], totalMs: 0 },
    db: {},
    cacheLookupMs: 0,
    pageMergeMs: 0,
    allExternalMs: 0,
    totalMs: 0,
  };

  // Validate environment configuration
  validateConfig();

  const {
    query,
    sortBy = 'imo_score',
    priceRange = [250, 10000],
    minImoScore = 0,
    minRating = 0,
    maxResults = 12, // Fixed to 12 for consistent page size
    page = 1,
    test = false,
    forceRefresh = false,
    searchOnly = false
  }: {
    query: string;
    sortBy?: SearchOptions['sortBy'];
    priceRange?: [number, number];
    minImoScore?: number;
    minRating?: number;
    maxResults?: number;
    page?: number;
    test?: boolean;
    forceRefresh?: boolean;
    searchOnly?: boolean;
  } = await req.json();

  try {
    logStep("Function started", { query, maxResults, page });

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check user access and subscription status
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;
    let hasActiveSubscription = false;
    let hasSearchUnlock = false;

    if (authHeader) {
      try {
        const { config } = await import('../_shared/config.ts');
        const supabaseService = createClient(
          config.supabase.url,
          config.supabase.key,
          { auth: { persistSession: false } }
        );

        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseService.auth.getUser(token);

        if (!userError && userData.user) {
          userId = userData.user.id;
          userEmail = userData.user.email;
          logStep("User authenticated", { userId, email: userEmail });

          // Check for active subscription via Stripe
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey && userEmail) {
            const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
            const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

            if (customers.data.length > 0) {
              const customerId = customers.data[0].id;
              const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: "active",
                limit: 1,
              });
              hasActiveSubscription = subscriptions.data.length > 0;
              logStep("Subscription status checked", { hasActiveSubscription });
            }

            // Check for search unlock if not premium
            if (!hasActiveSubscription) {
              const { data: unlockData } = await supabaseService
                .from("search_unlocks")
                .select("id")
                .eq("user_id", userId)
                .eq("search_query", normalizedQuery)
                .single();

              hasSearchUnlock = !!unlockData;
              logStep("Search unlock checked", { hasSearchUnlock, query: normalizedQuery });
            }
          }
        }
      } catch (error) {
        logStep("Auth check failed", { error: error.message });
        // Continue as guest user
      }
    }

    const currentConfig = FetchConfigService.getConfig();
    const freeUserLimit = currentConfig.free_user_product_limit || 3;
    const freshnessDays = currentConfig.freshness_days || 7;

    // Force page size to be 12 regardless of frontend request
    const forcedMaxResults = 12;
    // logStep("Page size enforced", { requestedMaxResults: maxResults, enforcedMaxResults: forcedMaxResults });

    // Determine actual max results based on user access
    let actualMaxResults = forcedMaxResults;
    if (!hasActiveSubscription && !hasSearchUnlock) {
      actualMaxResults = Math.min(forcedMaxResults, freeUserLimit);
      logStep("Free user limit applied", { actualMaxResults, freeUserLimit });
    }

    // Check if any sources are enabled
    if (!FetchConfigService.hasAnySourceEnabled()) {
      return new Response(
        JSON.stringify({
          error: 'No product sources are enabled',
          message: 'Please enable at least one product source in the configuration'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // STEP 1: Check for exact query matches and use priority search
    if (hasActiveSubscription && !forceRefresh) {
      const startTime = Date.now();

      try {
        const { config } = await import('../_shared/config.ts');
        const supabaseService = createClient(
          config.supabase.url,
          config.supabase.key,
          { auth: { persistSession: false } }
        );

        // First check if we have exact query matches
        const { data: hasExactMatches, error: exactMatchError } = await supabaseService
          .rpc('has_exact_query_matches', {
            search_query: normalizedQuery,
            min_price: priceRange[0],
            max_price: priceRange[1],
            min_imo_score: minImoScore,
            min_rating: minRating
          });

        if (exactMatchError) throw exactMatchError;

        // Use priority search if we have exact matches, otherwise use paginated search
        const searchFunction = hasExactMatches ? 'search_products_priority' : 'search_products_paginated';

        const { data: paginatedResults, error } = await supabaseService
          .rpc(searchFunction, {
            search_query: normalizedQuery,
            page_num: page,
            page_size: actualMaxResults,
            sort_by: sortBy,
            min_price: priceRange[0],
            max_price: priceRange[1],
            min_imo_score: minImoScore,
            min_rating: minRating
          });

        if (error) throw error;

        if (paginatedResults && paginatedResults.length > 0) {
          // If we have exact matches, return the results immediately
          if (hasExactMatches) {
            const totalCount = paginatedResults[0]?.total_count || 0;
            const dbProducts = paginatedResults.map(p => ({
              id: p.id,
              title: p.title,
              description: p.description || '',
              price: Number(p.price),
              image_url: p.image_url || '',
              image_urls: p.image_urls || [],
              product_url: p.product_url || '',
              source: p.source || 'Unknown',
              source_id: p.source_id || '',
              imo_score: p.imo_score || 0,
              pros: p.pros || [],
              cons: p.cons || [],
              created_at: p.created_at,
              reviews_summary: p.reviews_summary,
              site_rating: p.site_rating ? Number(p.site_rating) : undefined,
              query: p.query
            }));

            // Check if any products need analysis
            const needsAnalysis = dbProducts.filter(product =>
              !product.imo_score ||
              !product.pros ||
              product.pros.length === 0 ||
              !product.cons ||
              product.cons.length === 0
            );

            // Analyze products that need it
            if (needsAnalysis.length > 0) {
              try {
                console.log(`[BACKEND-FILTERING] Analyzing ${needsAnalysis.length} products that need analysis`);
                const { analyzeProductsBatch } = await import('../_shared/ai-service.ts');
                const analyses = await analyzeProductsBatch(needsAnalysis);

                // Update products with analysis results
                needsAnalysis.forEach((product, index) => {
                  const analysis = analyses[index];
                  if (analysis) {
                    product.imo_score = Math.round(analysis.imo_score);
                    product.pros = analysis.pros;
                    product.cons = analysis.cons;
                  }
                });

                // Save analyzed products back to database
                if (analyses.length > 0) {
                  const { upsertProducts } = await import('../_shared/database-service.ts');
                  await upsertProducts(needsAnalysis, normalizedQuery);
                  console.log(`[BACKEND-FILTERING] Saved ${analyses.length} analyzed products to database`);
                }
              } catch (error) {
                console.error('[BACKEND-FILTERING] Analysis failed:', error);
                // Continue without analysis - products will still be returned
              }
            }

            // Get likes data for all products
            if (dbProducts.length > 0) {
              const productIds = dbProducts.map(p => p.id);
              const { data: likesData } = await supabaseService
                .rpc('get_likes_for_products', {
                  product_ids: productIds,
                  user_id: userId || null
                });

              // Merge likes data into products
              if (likesData) {
                dbProducts.forEach(product => {
                  const likeInfo = likesData.find(l => l.product_id === product.id);
                  if (likeInfo) {
                    (product as any).like_count = likeInfo.like_count;
                    (product as any).liked_by_user = likeInfo.liked_by_user;
                  }
                });
              }
            }

            const endTime = Date.now();
            timingSummary.db.backendSearch = endTime - startTime;
            timingSummary.totalMs = endTime - startTime;

            // Log timing summary (not returned to client)
            logInfo('[TIMING_SUMMARY] backendSearch', { totalMs: timingSummary.totalMs, timings: timingSummary });

            return new Response(JSON.stringify({
              success: true,
              products: dbProducts,
              totalCount,
              count: dbProducts.length,
              currentPage: page,
              totalPages: Math.ceil(totalCount / actualMaxResults),
              hasNextPage: page < Math.ceil(totalCount / actualMaxResults),
              hasPrevPage: page > 1,
              isFromCache: true,
              message: `Found ${totalCount} products from database with backend filtering`
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          } else {
            // No exact matches but paginated search found results - still fetch from external sources
            logStep("No exact query matches but paginated search found results, will still fetch from external sources", {
              query: normalizedQuery,
              paginatedResultsCount: paginatedResults.length
            });
          }
        } else if (!hasExactMatches) {
          // No exact query matches and no results from paginated search - fetch from external sources
          logStep("No exact query matches and no paginated results, will fetch from external sources", { query: normalizedQuery });
        }
      } catch (error) {
        console.error('Backend filtering failed, falling back to regular flow:', error);
      }
    }

    // STEP 2: Check for exact query matches first (for all users)
    let products: Product[] = [];
    let isFromCache = false;
    let isStaleData = false;
    let hasExactQueryMatches = false;

    try {
      const { config } = await import('../_shared/config.ts');
      const supabaseService = createClient(
        config.supabase.url,
        config.supabase.key,
        { auth: { persistSession: false } }
      );

      // Check if we have exact query matches
      const { data: exactMatches, error: exactMatchError } = await supabaseService
        .rpc('has_exact_query_matches', {
          search_query: normalizedQuery,
          min_price: priceRange[0],
          max_price: priceRange[1],
          min_imo_score: minImoScore,
          min_rating: minRating
        });

      if (!exactMatchError && exactMatches) {
        hasExactQueryMatches = true;
        logStep("Found exact query matches", { query: normalizedQuery });
      }
    } catch (error) {
      logStep("Error checking exact matches", { error: error.message });
    }

    // Fetch all products for the query and price range (no freshness filter)
    const allProducts = await searchExistingProducts(
      normalizedQuery,
      priceRange[0]
      // Remove the daysOld parameter to get ALL products
    );

    // Also get fresh products to determine if we need to fetch new data
    const { getFreshProducts } = await import('../_shared/database-service.ts');
    const freshProducts = await getFreshProducts(
      normalizedQuery,
      priceRange[0],
      freshnessDays
    );

    logStep("Cache check results", {
      allCachedProducts: allProducts.length,
      freshCachedProducts: freshProducts.length,
      hasExactQueryMatches,
      freshnessDays
    });

    if (allProducts.length > 0) {
      products = allProducts;
      isFromCache = true;
      // Mark as stale if we have products but no fresh ones
      isStaleData = freshProducts.length === 0;
    }

    // STEP 2.5: Check if this page is being analyzed in background
    if (isFromCache && !forceRefresh) {
      try {
        const { config } = await import('../_shared/config.ts');
        const supabaseService = createClient(
          config.supabase.url,
          config.supabase.key,
          { auth: { persistSession: false } }
        );

        const queryHash = generateQueryHash(normalizedQuery);
        const taskStatus = await checkOrCreateBackgroundTask(supabaseService, queryHash, page);

        if (taskStatus.status === 'running') {
          // This page is being analyzed, wait up to 8 seconds for completion
          const maxWaitTime = 8000;
          const pollInterval = 1000;
          let waitedTime = 0;

          while (waitedTime < maxWaitTime) {
            await delay(pollInterval);
            waitedTime += pollInterval;

            const updatedStatus = await checkOrCreateBackgroundTask(supabaseService, queryHash, page);
            if (updatedStatus.status === 'completed') {
              // Refetch products to get the analyzed ones
              const updatedProducts = await searchExistingProducts(normalizedQuery, priceRange[0]);
              if (updatedProducts.length > allProducts.length) {
                products = updatedProducts;
                logStep("Got updated products after background analysis", { count: updatedProducts.length });
              }
              break;
            } else if (updatedStatus.status === 'not_found') {
              break; // Task disappeared, continue normally
            }
          }

          if (waitedTime >= maxWaitTime) {
            // Still running after timeout, return 202 with current data
            const totalCountRaw = products.length;
            const isLimitedUser = !hasActiveSubscription && !hasSearchUnlock;
            const totalPages = Math.max(1, Math.ceil(totalCountRaw / actualMaxResults));
            const currentPageSafe = Math.max(1, Math.min(page, totalPages));

            let paginatedProducts = [] as Product[];
            if (isLimitedUser) {
              // Limited users: ignore page/sort/filter; always return first N
              paginatedProducts = products.slice(0, freeUserLimit);
            } else {
              const startIndex = (currentPageSafe - 1) * actualMaxResults;
              const endIndex = startIndex + actualMaxResults;
              paginatedProducts = products
                .filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
                .slice(startIndex, endIndex);
            }

            return new Response(
              JSON.stringify({
                success: true,
                status: 'pending',
                query: normalizedQuery,
                count: paginatedProducts.length,
                totalCount: totalCountRaw, // Always return real total count
                totalPages: isLimitedUser ? 1 : totalPages, // Limited users see 1 page
                currentPage: isLimitedUser ? 1 : currentPageSafe, // Limited users always on page 1
                hasNextPage: isLimitedUser ? false : currentPageSafe < totalPages, // Limited users can't go to next page
                hasPrevPage: false, // Never show prev page for first page or limited users
                products: paginatedProducts,
                isFromCache: true,
                message: "Analyzing products in background, please wait...",
                retryAfterMs: 3000,
              }),
              {
                status: 202, // HTTP 202 Accepted
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }
      } catch (e) {
        console.error('Background task check failed:', e);
        // Continue with normal flow
      }
    }

    // STEP 2: Determine if we need to fetch fresh data
    // Fetch fresh data if:
    // 1. We have no exact query matches (priority: fetch from sources)
    // 2. We have no fresh products (fallback for exact matches)
    // 3. Force refresh is requested
    const shouldFetchFresh = (!hasExactQueryMatches || freshProducts.length === 0 || forceRefresh);

    logStep("Fetch decision", {
      shouldFetchFresh,
      hasExactQueryMatches,
      allProductsLength: allProducts.length,
      freshProductsLength: freshProducts.length,
      forceRefresh,
      isStaleData,
      isFromCache,
      reason: !hasExactQueryMatches ? 'No exact query matches - fetching from sources' :
        freshProducts.length === 0 ? 'No fresh products - fetching from sources' :
          forceRefresh ? 'Force refresh requested' : 'Using cached data'
    });

    if (shouldFetchFresh) {
      // STEP 3: Fetch fresh data from sources
      const fetchers = createEnabledFetchers(
        currentConfig.product_sources,
        oxylabsClient,
        normalizedQuery
      );

      if (fetchers.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No valid fetchers available',
            message: 'All configured product sources failed to initialize'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Fetch from all enabled sources in parallel with timing and optimized limits
      const perSourceLimits = {
        'Amazon': 60, // Restore to 60 as requested
        'Google': 60, // Restore to 60 as requested
        'Walmart': 25, // Restore to 25 as requested
        'HomeDepot': 25 // Restore to 25 as requested
      };

      const fetchPromises = fetchers.map(fetcher => {
        const sourceType = fetcher.getSource();
        const sourceLimit = perSourceLimits[sourceType] || 25;
        const fetchStartTime = Date.now();

        return fetcher.fetchProducts(normalizedQuery, sourceLimit)
          .then(results => {
            const dur = logTiming(`${sourceType} fetch`, fetchStartTime, { count: results.length });
            timingSummary.externalFetch[sourceType] = dur;

            // Log performance metrics for optimization
            if (dur > 15000) {
              logWarn(`[SLOW SOURCE] ${sourceType} took ${dur}ms - consider optimization`);
            }

            return results;
          })
          .catch(error => {
            const fetchDuration = Date.now() - fetchStartTime;
            timingSummary.externalFetch[sourceType] = fetchDuration;
            console.error(`${fetcher.getSource()} fetch error (${fetchDuration}ms):`, error);
            logError(
              'fetch-products',
              'api_fetch_error',
              `${fetcher.getSource()} fetch failed: ${error.message}`,
              {
                source: fetcher.getSource(),
                query: normalizedQuery,
                error: error.toString(),
                duration: fetchDuration
              },
              normalizedQuery
            );
            return [];
          });
      });

      const fetchAllStartTime = Date.now();
      const allResults = await Promise.all(fetchPromises);
      const allExternalMs = logTiming('All external API fetches', fetchAllStartTime, {
        totalProducts: allResults.flat().length,
        sources: fetchers.map(f => f.getSource())
      });
      timingSummary.allExternalMs = allExternalMs;

      // Flatten results efficiently
      let rawProducts = [];
      for (const results of allResults) {
        rawProducts.push(...results);
      }

      // Filter products efficiently
      rawProducts = rawProducts.filter(product =>
        product.price >= priceRange[0] &&
        product.price <= priceRange[1]
      );

      // Clear intermediate arrays to free memory
      allResults.length = 0;

      logStep("Raw fetch results", {
        amazon: allResults[0]?.length || 0,
        google: allResults[1]?.length || 0,
        walmart: allResults[2]?.length || 0,
        homedepot: allResults[3]?.length || 0,
        total: allResults.flat().length
      });

      logStep("After price filtering", {
        beforeFilter: allResults.flat().length,
        afterFilter: rawProducts.length,
        priceRange
      });

      if (test) {
        rawProducts = rawProducts.slice(0, 2);
      }

      // Build lookup from cached DB products using unique identifiers
      const cacheStartTime = Date.now();
      const cachedMap = new Map<string, Product>();
      const getUniqueKey = (p: any) => {
        // Try source + source_id first (most reliable)
        if (p?.source && p?.source_id) {
          return `${p.source}:${p.source_id}`;
        }
        // Fallback to source + product_url
        if (p?.source && p?.product_url) {
          return `${p.source}:${p.product_url}`;
        }
        // Last resort: just product_url
        return p?.product_url || `fallback:${p?.title || Math.random()}`;
      };

      // Index all existing products by their unique keys
      for (const p of allProducts) {
        const key = getUniqueKey(p);
        cachedMap.set(key, p as Product);
      }
      timingSummary.cacheLookupMs = logTiming('Cache lookup preparation', cacheStartTime);

      // STEP 4: Combine exact query matches with fresh results and sort
      const startIndex = (page - 1) * actualMaxResults;
      const endIndex = startIndex + actualMaxResults;

      // Get exact query matches from database to prioritize them
      let exactQueryProducts: Product[] = [];
      if (hasExactQueryMatches) {
        try {
          const { config } = await import('../_shared/config.ts');
          const supabaseService = createClient(
            config.supabase.url,
            config.supabase.key,
            { auth: { persistSession: false } }
          );

          const { data: exactResults } = await supabaseService
            .rpc('search_products_priority', {
              search_query: normalizedQuery,
              page_num: 1,
              page_size: 1000, // Get all exact matches
              sort_by: sortBy,
              min_price: priceRange[0],
              max_price: priceRange[1],
              min_imo_score: minImoScore,
              min_rating: minRating
            });

          if (exactResults) {
            exactQueryProducts = exactResults.map(p => ({
              id: p.id,
              title: p.title,
              description: p.description || '',
              price: Number(p.price),
              image_url: p.image_url || '',
              image_urls: p.image_urls || [],
              product_url: p.product_url || '',
              source: p.source || 'Unknown',
              source_id: p.source_id || '',
              imo_score: p.imo_score || 0,
              pros: p.pros || [],
              cons: p.cons || [],
              created_at: p.created_at,
              reviews_summary: p.reviews_summary,
              site_rating: p.site_rating ? Number(p.site_rating) : undefined,
              query: p.query
            }));
          }
        } catch (error) {
          logStep("Error fetching exact query matches", { error: error.message });
        }
      }

      // Combine exact query matches with fresh results
      const combinedProducts = [...exactQueryProducts, ...rawProducts];

      // Remove duplicates based on source and source_id
      const uniqueProducts = combinedProducts.reduce((acc, product) => {
        const key = `${product.source}-${product.source_id}`;
        if (!acc.has(key)) {
          acc.set(key, product);
        }
        return acc;
      }, new Map<string, Product>());

      const deduplicatedProducts = Array.from(uniqueProducts.values());

      const globalSorters: Record<string, (a: Product, b: Product) => number> = {
        newest: (a, b) => +new Date(b.created_at!) - +new Date(a.created_at!),
        price_low: (a, b) => a.price - b.price,
        price_high: (a, b) => b.price - a.price,
        imo_score: (a, b) => (b.imo_score ?? 0) - (a.imo_score ?? 0),
        rating: (a, b) => (b.site_rating ?? 0) - (a.site_rating ?? 0),
      };
      const sortFn = globalSorters[sortBy] || globalSorters.newest;
      const sortedRaw = [...deduplicatedProducts].sort(sortFn);

      // Determine access early
      const isLimitedUser = !hasActiveSubscription && !hasSearchUnlock;

      // Decide slice source: limited users ignore page/sort, get first N only
      const sliceForPage = isLimitedUser
        ? sortedRaw.slice(0, freeUserLimit)
        : sortedRaw.slice(startIndex, endIndex);

      logStep("Pagination calculated", {
        page,
        actualMaxResults,
        startIndex,
        endIndex,
        exactQueryProducts: exactQueryProducts.length,
        freshProducts: rawProducts.length,
        totalCombinedProducts: deduplicatedProducts.length,
        currentPageSize: sliceForPage.length
      });

      // Compute total counts for combined results
      const totalCountRaw = deduplicatedProducts.length;

      // For limited users, we still show the real total count but limit products returned
      const totalPages = Math.max(1, Math.ceil(totalCountRaw / actualMaxResults));
      const currentPageSafe = Math.max(1, Math.min(page, totalPages));


      // Merge new products with cached data, with new products taking precedence
      const mergeStartTime = Date.now();
      const pageMerged: Product[] = [];
      const needsAnalysis: Product[] = [];
      const hasAnalysis = (p: any) => (
        !!p && (
          p.needs_ai_analysis === false ||
          (typeof p.imo_score === 'number' &&
            Array.isArray(p.pros) && p.pros.length > 0 &&
            Array.isArray(p.cons) && p.cons.length > 0)
        )
      );

      // Pre-allocate arrays for better performance
      pageMerged.length = sliceForPage.length;
      needsAnalysis.length = 0;

      // Use for loop for better performance than forEach
      for (let i = 0; i < sliceForPage.length; i++) {
        const newProduct = sliceForPage[i];
        const key = getUniqueKey(newProduct);
        const cachedVersion = cachedMap.get(key);

        // Merge: new product data takes precedence, but keep analysis if it exists
        const merged: Product = {
          ...(cachedVersion ?? newProduct),
          // Always use fresh data for core fields
          title: newProduct.title ?? cachedVersion?.title,
          price: newProduct.price ?? cachedVersion?.price,
          image_url: newProduct.image_url ?? cachedVersion?.image_url,
          image_urls: newProduct.image_urls ?? cachedVersion?.image_urls,
          product_url: newProduct.product_url ?? cachedVersion?.product_url,
          source: newProduct.source ?? cachedVersion?.source,
          source_id: newProduct.source_id ?? (cachedVersion as any)?.source_id,
          query: normalizedQuery,
          created_at: new Date().toISOString(), // Update timestamp for fresh fetch
          reviews_summary: (cachedVersion as any)?.reviews_summary ?? null,
        } as Product;

        pageMerged[i] = merged;

        if (!hasAnalysis(merged)) {
          needsAnalysis.push(merged);
        }
      }

      timingSummary.pageMergeMs = logTiming('Product merging', mergeStartTime, {
        pageMergedCount: pageMerged.length,
        needsAnalysisCount: needsAnalysis.length
      });
      logStep("Access control applied", {
        isLimitedUser,
        freeUserLimit,
        totalCountRaw,
        actualProductsToReturn: isLimitedUser ? Math.min(freeUserLimit, pageMerged.length) : pageMerged.length,
        currentPageSafe
      });

      // STEP 5: Analyze only products needed for current page with optimized batch size
      if (needsAnalysis.length > 0) {
        try {
          const analysisStartTime = Date.now();
          logStep("Analyzing products for current page", { count: needsAnalysis.length });

          // Process in smaller batches for faster parallel processing
          const batchSize = 4; // Smaller batches for better parallelism
          const analyses: any[] = [];

          // Create all batch promises at once for maximum parallelism
          const batchPromises = [];
          for (let i = 0; i < needsAnalysis.length; i += batchSize) {
            const batch = needsAnalysis.slice(i, i + batchSize);
            const batchIndex = Math.floor(i / batchSize);

            batchPromises.push(
              analyzeProductsBatch(batch).then(results => {
                const batchDuration = Date.now() - analysisStartTime;
                timingSummary.ai.batches.push(batchDuration);
                console.log(`[AI BATCH ${batchIndex + 1}] Completed in ${batchDuration}ms`);
                return { results, batchIndex };
              })
            );
          }

          // Wait for all batches in parallel
          const batchResults = await Promise.all(batchPromises);

          // Sort results by batch index to maintain order
          batchResults
            .sort((a, b) => a.batchIndex - b.batchIndex)
            .forEach(({ results }) => {
              analyses.push(...results);
            });

          timingSummary.ai.totalMs = logTiming('Total AI analysis', analysisStartTime, {
            totalProducts: needsAnalysis.length,
            batchCount: batchPromises.length
          });

          // Update products with analysis results
          const analyzedMap = new Map<string, Product>();
          needsAnalysis.forEach((product, index) => {
            const analysis = analyses[index];
            const key = getUniqueKey(product);
            const updated: Product = {
              ...product,
              imo_score: Math.round(analysis.imo_score),
              pros: analysis.pros,
              cons: analysis.cons,
              needs_ai_analysis: false,
            };
            analyzedMap.set(key, updated);
          });

          // Update pageMerged with analyzed results
          pageMerged.forEach((product, index) => {
            const key = getUniqueKey(product);
            const analyzed = analyzedMap.get(key);
            if (analyzed) {
              pageMerged[index] = analyzed;
            }
          });

          // Save analyzed products to database with timing
          const analyzedProducts = Array.from(analyzedMap.values());
          if (analyzedProducts.length > 0) {
            try {
              const saveStartTime = Date.now();

              // Start database save but don't block on it
              const _savePromise = upsertProducts(analyzedProducts)
                .then(() => {
                  timingSummary.db.saveAnalyzedMs = Date.now() - saveStartTime;
                  logStep("Saved analyzed products", { count: analyzedProducts.length });
                })
                .catch(e => {
                  console.error('Failed to save analyzed products:', e);
                });

              // Don't await - let it run in background while we continue processing

            } catch (e) {
              console.error('Failed to save analyzed products:', e);
            }
          }
        } catch (e) {
          console.error('Batch AI analysis for page failed:', e);
        }
      }

      // STEP 6: Merge ALL products (existing + newly fetched) for database save
      try {
        const allMergeStartTime = Date.now();
        // Create a comprehensive map of all products using unique keys
        const allProductsMap = new Map<string, Product>();

        // First, add all existing products
        allProducts.forEach(p => {
          const key = getUniqueKey(p);
          allProductsMap.set(key, p as Product);
        });

        // Then, add/overwrite with newly fetched products
        rawProducts.forEach(newProduct => {
          const key = getUniqueKey(newProduct);
          const existingProduct = allProductsMap.get(key);

          const mergedProduct: Product = {
            ...(existingProduct ?? newProduct),
            // Fresh data takes precedence for these fields
            title: newProduct.title ?? existingProduct?.title,
            price: newProduct.price ?? existingProduct?.price,
            image_url: newProduct.image_url ?? existingProduct?.image_url,
            image_urls: newProduct.image_urls ?? existingProduct?.image_urls,
            product_url: newProduct.product_url ?? existingProduct?.product_url,
            external_url: newProduct.external_url ?? (existingProduct as any)?.external_url,
            source: newProduct.source ?? existingProduct?.source,
            source_id: newProduct.source_id ?? (existingProduct as any)?.source_id ?? null,
            query: normalizedQuery,
            created_at: new Date().toISOString(), // Fresh timestamp
            reviews_summary: (existingProduct as any)?.reviews_summary ?? null,
            // Keep existing analysis if it exists, otherwise mark for analysis
            imo_score: hasAnalysis(existingProduct) ? (existingProduct as any)?.imo_score ?? 5 : 0,
            pros: hasAnalysis(existingProduct) ? (existingProduct as any)?.pros ?? [] : [],
            cons: hasAnalysis(existingProduct) ? (existingProduct as any)?.cons ?? [] : [],
            needs_ai_analysis: !hasAnalysis(existingProduct),
          } as Product;

          allProductsMap.set(key, mergedProduct);
        });

        const allToSave = Array.from(allProductsMap.values());
        timingSummary.db.mergeAllForSaveMs = logTiming('Merge all products for DB save', allMergeStartTime, { totalProductsToSave: allToSave.length });

        if (allToSave.length > 0) {
          try {
            const saveAllStartTime = Date.now();
            const savedProducts = await upsertProducts(allToSave);
            timingSummary.db.saveAllMs = logTiming('Save all products to DB', saveAllStartTime, { count: allToSave.length });
            logStep("Saved all fetched products", { count: allToSave.length });

            // Update pageMerged with database IDs from saved products
            if (savedProducts.length > 0) {
              const savedMap = new Map<string, Product>();
              savedProducts.forEach(saved => {
                const key = getUniqueKey(saved);
                savedMap.set(key, saved);
              });

              // Update pageMerged products with database IDs
              pageMerged.forEach((product, index) => {
                const key = getUniqueKey(product);
                const savedProduct = savedMap.get(key);
                if (savedProduct?.id) {
                  pageMerged[index] = { ...product, id: savedProduct.id };
                }
              });
            }
          } catch (e) {
            console.error('Failed to save all fetched products:', e);
          }
        }
      } catch (e) {
        console.error('Failed to persist all fetched products:', e);
      }

      // STEP 7: Prepare response with current page products
      // For limited users, only return the first N products (no sorting/filtering on backend)
      let pageProducts: Product[] = isLimitedUser ? pageMerged.slice(0, freeUserLimit) : [...pageMerged];

      // Apply filters and sorting only for subscribed users (frontend will handle for limited users)
      if (!isLimitedUser) {
        pageProducts = pageProducts.filter(p => {
          if ((p.imo_score ?? 0) < minImoScore) return false;
          if (p.site_rating && p.site_rating < minRating) return false;
          return true;
        });

        // Sort within the page
        const pageSorters: Record<string, (a: Product, b: Product) => number> = {
          newest: (a, b) => +new Date(b.created_at!) - +new Date(a.created_at!),
          price_low: (a, b) => a.price - b.price,
          price_high: (a, b) => b.price - a.price,
          imo_score: (a, b) => (b.imo_score ?? 0) - (a.imo_score ?? 0),
          rating: (a, b) => (b.site_rating ?? 0) - (a.site_rating ?? 0),
        };
        if (pageSorters[sortBy]) {
          pageProducts.sort(pageSorters[sortBy]);
        }
      }

      // STEP 8: Smart background analysis with task management
      try {
        const queryHash = generateQueryHash(normalizedQuery);
        const nextPage = currentPageSafe + 1;

        if (nextPage <= totalPages) {
          const { config } = await import('../_shared/config.ts');
          const supabaseService = createClient(
            config.supabase.url,
            config.supabase.key,
            { auth: { persistSession: false } }
          );

          // Check if next page is already being analyzed
          const taskStatus = await checkOrCreateBackgroundTask(supabaseService, queryHash, nextPage);

          if (taskStatus.status === 'not_found') {
            // Create new background task
            const taskId = await createBackgroundTask(supabaseService, queryHash, nextPage);

            if (taskId) {
              const bgTask = async () => {
                try {
                  const nextStartIndex = (nextPage - 1) * actualMaxResults;
                  const nextEndIndex = nextStartIndex + actualMaxResults;
                  const nextSlice = rawProducts.slice(nextStartIndex, nextEndIndex);

                  const nextToAnalyze = nextSlice.filter(p => {
                    const key = getUniqueKey(p);
                    const cached = cachedMap.get(key);
                    return !hasAnalysis(cached);
                  });

                  if (nextToAnalyze.length > 0) {
                    logStep("Background analyzing next page", { count: nextToAnalyze.length, page: nextPage });

                    await updateTaskProgress(supabaseService, taskId, {
                      total_products: nextToAnalyze.length
                    });

                    const bgBatchSize = 3; // Smaller batches for background processing
                    const nextBatches = chunkArray(nextToAnalyze, bgBatchSize);

                    // Process background batches in parallel
                    const bgPromises = nextBatches.map(async (nBatch, i) => {
                      try {
                        const analyses = await analyzeProductsBatch(nBatch);
                        const mapped: Product[] = nBatch.map((bp, idx) => ({
                          ...bp,
                          query: normalizedQuery,
                          imo_score: Math.round(analyses[idx]?.imo_score ?? 5),
                          pros: analyses[idx]?.pros ?? ['Available from reputable source'],
                          cons: analyses[idx]?.cons ?? ['Limited analysis available'],
                          reviews_summary: null,
                          created_at: new Date().toISOString(),
                          needs_ai_analysis: false,
                        } as Product));

                        await upsertProducts(mapped);

                        // Update progress
                        const analyzedSoFar = (i + 1) * bgBatchSize;
                        await updateTaskProgress(supabaseService, taskId, {
                          products_analyzed: Math.min(analyzedSoFar, nextToAnalyze.length)
                        });

                      } catch (e) {
                        console.error('Background batch analysis error:', e);
                      }
                    });

                    // Wait for all background batches to complete
                    await Promise.all(bgPromises);

                    // Mark task as completed
                    await updateTaskProgress(supabaseService, taskId, {
                      status: 'completed',
                      products_analyzed: nextToAnalyze.length
                    });

                    logStep("Background analysis completed", { page: nextPage, count: nextToAnalyze.length });
                  } else {
                    // No products to analyze, mark as completed
                    await updateTaskProgress(supabaseService, taskId, {
                      status: 'completed',
                      products_analyzed: 0
                    });
                  }
                } catch (e) {
                  console.error('Background analysis failed:', e);
                  await updateTaskProgress(supabaseService, taskId, {
                    status: 'failed'
                  });
                }
              };

              // Start background task without blocking response
              try {
                // deno-lint-ignore no-undef
                // @ts-expect-error
                EdgeRuntime?.waitUntil(bgTask());
              } catch (_e) {
                // Fallback for environments without EdgeRuntime
                bgTask().catch(e => console.error('Background task error:', e));
              }
            }
          }
        }
      } catch (e) {
        console.error('Background task setup failed:', e);
      }

      // Don't await background task - return immediately

      const showUpgradeBanner = isLimitedUser && totalCountRaw > freeUserLimit;
      const message = hasExactQueryMatches
        ? `Found ${exactQueryProducts.length} exact matches + ${rawProducts.length} fresh products (${totalCountRaw} total) - showing ${isLimitedUser ? `first ${freeUserLimit}` : `page ${currentPageSafe}/${totalPages}`}`
        : `Fetched ${totalCountRaw} fresh products from sources - showing ${isLimitedUser ? `first ${freeUserLimit}` : `page ${currentPageSafe}/${totalPages}`}`;
      const executionTime = Date.now() - startTime;
      timingSummary.totalMs = executionTime;
      // Log timing summary (not returned to client)
      logInfo('[TIMING_SUMMARY] fresh', { totalMs: executionTime, timings: timingSummary });

      return new Response(
        JSON.stringify({
          success: true,
          query: normalizedQuery,
          count: pageProducts.length,
          totalCount: totalCountRaw, // Always return real total count
          totalPages: isLimitedUser ? 1 : totalPages, // Limited users see 1 page
          currentPage: isLimitedUser ? 1 : currentPageSafe, // Limited users always on page 1
          hasNextPage: isLimitedUser ? false : currentPageSafe < totalPages, // Limited users can't go to next page
          hasPrevPage: false, // Never show prev page for first page or limited users
          products: pageProducts,
          isFromCache: false,
          isStaleData: false,
          message,
          showUpgradeBanner,
          hasActiveSubscription,
          hasSearchUnlock
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // STEP 9: Handle cached data (show ALL products, regardless of freshness)
    const hasAnalysis = (p: any) => (
      typeof p?.imo_score === 'number' &&
      Array.isArray(p?.pros) && p.pros.length > 0 &&
      Array.isArray(p?.cons) && p.cons.length > 0
    );

    const getUniqueKey = (p: any) => {
      if (p?.source && p?.source_id) {
        return `${p.source}:${p.source_id}`;
      }
      if (p?.source && p?.product_url) {
        return `${p.source}:${p.product_url}`;
      }
      return p?.product_url || `fallback:${p?.title || Math.random()}`;
    };

    // Use ALL products for pagination calculation but limit for non-subscribed users
    const totalCountRaw = products.length;
    const isLimitedUser = !hasActiveSubscription && !hasSearchUnlock;
    const totalPages = Math.max(1, Math.ceil(totalCountRaw / actualMaxResults));
    const currentPageSafe = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPageSafe - 1) * actualMaxResults;
    const endIndex = startIndex + actualMaxResults;

    // Global sort before pagination to ensure cross-page ordering
    const globalSorters: Record<string, (a: Product, b: Product) => number> = {
      newest: (a, b) => +new Date(b.created_at!) - +new Date(a.created_at!),
      price_low: (a, b) => a.price - b.price,
      price_high: (a, b) => b.price - a.price,
      imo_score: (a, b) => (b.imo_score ?? 0) - (a.imo_score ?? 0),
      rating: (a, b) => (b.site_rating ?? 0) - (a.site_rating ?? 0),
    };
    const sortFn = globalSorters[sortBy] || globalSorters.newest;
    // Limited users: ignore backend sorting/pagination; always first N items
    const baseSlice: Product[] = isLimitedUser
      ? products.slice(0, freeUserLimit)
      : [...products].sort(sortFn).slice(startIndex, endIndex);

    // Analyze only missing items within this slice
    const toAnalyze: Product[] = [];
    baseSlice.forEach((p) => {
      const needs = (p as any).needs_ai_analysis === true || !hasAnalysis(p);
      if (needs) toAnalyze.push(p);
    });

    if (toAnalyze.length > 0) {
      try {
        logStep("Analyzing cached products for current page", { count: toAnalyze.length });
        const analyses = await analyzeProductsBatch(toAnalyze);

        // Update products with analysis results
        const analyzedMap = new Map<string, Product>();
        toAnalyze.forEach((product, index) => {
          const analysis = analyses[index];
          const key = getUniqueKey(product);
          const updated: Product = {
            ...product,
            imo_score: Math.round(analysis.imo_score),
            pros: analysis.pros,
            cons: analysis.cons,
            needs_ai_analysis: false,
          };
          analyzedMap.set(key, updated);
        });

        // Update baseSlice with analyzed results
        baseSlice.forEach((product, index) => {
          const key = getUniqueKey(product);
          const analyzed = analyzedMap.get(key);
          if (analyzed) {
            baseSlice[index] = analyzed;
          }
        });

        // Save analyzed products to database
        const analyzedProducts = Array.from(analyzedMap.values());
        if (analyzedProducts.length > 0) {
          try {
            await upsertProducts(analyzedProducts);
            logStep("Saved analyzed cached products", { count: analyzedProducts.length });
          } catch (e) {
            console.error('Failed to save analyzed cached products:', e);
          }
        }
      } catch (e) {
        console.error('Batch AI analysis for cached page failed:', e);
      }
    }

    // Build final page products
    const paginatedProducts: Product[] = isLimitedUser
      ? baseSlice
      : baseSlice.filter(p => {
        if ((p.imo_score ?? 0) < minImoScore) return false;
        if (p.site_rating && p.site_rating < minRating) return false;
        return true;
      });

    // Only subscribed/unlocked users get backend page-level sorting
    if (!isLimitedUser) {
      const pageSorters: Record<string, (a: Product, b: Product) => number> = {
        newest: (a, b) => +new Date(b.created_at!) - +new Date(a.created_at!),
        price_low: (a, b) => a.price - b.price,
        price_high: (a, b) => b.price - a.price,
        imo_score: (a, b) => (b.imo_score ?? 0) - (a.imo_score ?? 0),
        rating: (a, b) => (b.site_rating ?? 0) - (a.site_rating ?? 0),
      };
      if (pageSorters[sortBy]) {
        paginatedProducts.sort(pageSorters[sortBy]);
      }
    }

    const showUpgradeBanner = isLimitedUser && totalCountRaw > freeUserLimit;

    const message = searchOnly && products.length === 0
      ? 'No cached products found. Click "Fetch Fresh Data" to get new results.'
      : isStaleData
        ? `Showing ${paginatedProducts.length} of ${totalCountRaw} older products ${isLimitedUser ? `(first ${freeUserLimit})` : `(page ${currentPageSafe}/${totalPages})`}. Fresh data will be fetched automatically.`
        : isFromCache
          ? `Found ${totalCountRaw} products from cache (${freshnessDays} days fresh) - showing ${isLimitedUser ? `first ${freeUserLimit}` : `page ${currentPageSafe}/${totalPages}`}`
          : `Fetched ${totalCountRaw} fresh products - showing ${isLimitedUser ? `first ${freeUserLimit}` : `page ${currentPageSafe}/${totalPages}`}`;

    const executionTime = Date.now() - startTime;

    timingSummary.totalMs = executionTime;

    logStep("Response prepared", {
      productCount: paginatedProducts.length,
      totalCount: totalCountRaw,
      showUpgradeBanner,
      userAccess: { hasActiveSubscription, hasSearchUnlock },
      executionTime
    });

    // Log timing summary (not returned to client)
    logInfo('[TIMING_SUMMARY] cached', { totalMs: executionTime, timings: timingSummary });

    return new Response(
      JSON.stringify({
        success: true,
        query: normalizedQuery,
        count: paginatedProducts.length,
        totalCount: totalCountRaw, // Always return real total count
        totalPages: isLimitedUser ? 1 : totalPages, // Limited users see 1 page
        currentPage: isLimitedUser ? 1 : currentPageSafe, // Limited users always on page 1
        hasNextPage: isLimitedUser ? false : currentPageSafe < totalPages, // Limited users can't go to next page
        hasPrevPage: false, // Never show prev page for first page or limited users
        products: paginatedProducts,
        isFromCache,
        isStaleData,
        message,
        showUpgradeBanner,
        hasActiveSubscription,
        hasSearchUnlock
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fetch-products function:', error);

    const executionTime = Date.now() - startTime;

    // Log the error to database
    await logError(
      'fetch-products',
      'function_error',
      error.message || 'Unknown error',
      { error: error.toString(), stack: error.stack, executionTime },
      query || 'unknown'
    );

    // Log timing summary (not returned to client)
    logInfo('[TIMING_SUMMARY] error', { totalMs: executionTime });

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});