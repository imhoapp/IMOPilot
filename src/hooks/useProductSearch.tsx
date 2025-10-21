import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useUserAccess } from "@/hooks/useUserAccess";
import {
	SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_URL,
	supabase,
} from "@/integrations/supabase/client";
import type { Product } from "@/types/search";

interface SearchProductsParams {
	query: string;
	enabled?: boolean;
	page?: number;
	pageSize?: number;
	// Filter options for backend filtering (only for subscribed users)
	sortBy?: "price_low" | "price_high" | "imo_score" | "rating" | "newest" | "most_reviewed";
	priceRange?: [number, number];
	minImoScore?: number;
	minRating?: number;
}

interface SearchResponse {
	products: Product[];
	isFromCache: boolean;
	isStaleData?: boolean;
	message: string;
	totalCount: number;
	count: number;
	showUpgradeBanner?: boolean;
	currentPage: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	isPending?: boolean;
	retryAfterMs?: number;
}

export function useProductSearch({
	query,
	enabled = false,
	page = 1,
	pageSize = 12,
	sortBy = "newest",
	priceRange = [250, 10000],
	minImoScore = 0,
	minRating = 0,
}: SearchProductsParams) {
	const queryClient = useQueryClient();
	const freshDataFetchedRef = useRef<Set<string>>(new Set()); // Track which queries have been refreshed
	const { hasActiveSubscription, unlockedSearches } = useUserAccess();

	// Check for forceRefresh parameter in URL
	const urlParams = new URLSearchParams(window.location.search);
	const forceRefresh = urlParams.get("forceRefresh") === "true";

	// Query for searching products - this calls fetch-products with searchOnly flag
	const searchQuery = useQuery({
		queryKey: [
			"productSearch",
			query?.toLowerCase(),
			page,
			forceRefresh,
			sortBy,
			priceRange,
			minImoScore,
			minRating,
		],
		queryFn: async ({ signal }): Promise<SearchResponse> => {
			if (!query?.trim()) {
				throw new Error("Search query is required");
			}
			const { data: sessionData } = await supabase.auth.getSession();
			const authToken =
				sessionData.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
			const res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-products`, {
				method: "POST",
				signal,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					query: query.trim().toLowerCase(),
					searchOnly: true,
					maxResults: pageSize,
					page: page,
					forceRefresh: forceRefresh,
					sortBy,
					priceRange,
					minImoScore,
					minRating,
				}),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to search products");
			}
			const data = await res.json();

			// Handle 202 (pending) responses from background analysis
			if (data.status === "pending") {
				// Return partial data with pending flag
				return {
					products: data.products || [],
					isFromCache: data.isFromCache || false,
					isStaleData: data.isStaleData || false,
					message: data.message || "Analyzing products...",
					totalCount: data.totalCount || 0,
					count: data.count || 0,
					showUpgradeBanner: data.showUpgradeBanner || false,
					currentPage: data.currentPage || page,
					totalPages: data.totalPages || 1,
					hasNextPage: data.hasNextPage || false,
					hasPrevPage: data.hasPrevPage || false,
					isPending: true,
					retryAfterMs: data.retryAfterMs || 3000,
				};
			}

			return {
				products: data.products || [],
				isFromCache: data.isFromCache || false,
				isStaleData: data.isStaleData || false,
				message: data.message || "",
				totalCount: data.totalCount || 0,
				count: data.count || 0,
				showUpgradeBanner: data.showUpgradeBanner || false,
				currentPage: data.currentPage || page,
				totalPages: data.totalPages || 1,
				hasNextPage: data.hasNextPage || false,
				hasPrevPage: data.hasPrevPage || false,
			};
		},
		enabled: enabled && !!query?.trim(),
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		placeholderData: (previousData) => previousData,
	});

	// Mutation for triggering fresh product fetch
	const fetchFreshProducts = useMutation({
		mutationFn: async (searchQuery: string) => {
			const { data: sessionData } = await supabase.auth.getSession();
			const authToken =
				sessionData.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
			const res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-products`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					query: searchQuery.trim().toLowerCase(),
					forceRefresh: true,
					maxResults: pageSize,
				}),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to fetch fresh products");
			}
			const data = await res.json();
			return data;
		},
		onSuccess: (_data, variables) => {
			// Mark this query as having fresh data fetched
			freshDataFetchedRef.current.add(variables.toLowerCase());

			// Invalidate and refetch the search query to show fresh data
			queryClient.invalidateQueries({
				queryKey: ["productSearch", variables.toLowerCase()],
			});
		},
		onError: (error: Error) => {
			// Mark this query as attempted to prevent retry loops
			const normalizedQuery = query?.trim().toLowerCase();
			if (normalizedQuery) {
				freshDataFetchedRef.current.add(normalizedQuery);
			}

			// Log error silently for debugging - error should be in error_logs table
			console.error("Background fresh data fetch failed:", error.message);
		},
	});

	// Handle pending analysis with polling
	useEffect(() => {
		const data = searchQuery.data as SearchResponse | undefined;
		if (data?.isPending) {
			const retryAfter = data.retryAfterMs || 3000;
			const timeoutId = setTimeout(() => {
				searchQuery.refetch();
			}, retryAfter);

			return () => clearTimeout(timeoutId);
		}
	}, [searchQuery.data, searchQuery.refetch]);

	// Auto-fetch fresh data when stale data is detected (only once per query)
	useEffect(() => {
		const normalizedQuery = query?.trim().toLowerCase();
		const data = searchQuery.data as SearchResponse | undefined;
		if (
			data?.isStaleData &&
			!fetchFreshProducts.isPending &&
			normalizedQuery &&
			!freshDataFetchedRef.current.has(normalizedQuery)
		) {
			fetchFreshProducts.mutate(query.trim());
		}
	}, [
		searchQuery.data,
		query,
		fetchFreshProducts.isPending,
		fetchFreshProducts.mutate,
	]);

	// Auto-refetch when access state changes (subscription or search unlocks)
	useEffect(() => {
		// Trigger when access state changes so queries reflect new permissions
		if (
			(hasActiveSubscription !== undefined || unlockedSearches !== undefined) &&
			enabled &&
			query?.trim()
		) {
			// Invalidate the search query when access changes
			queryClient.invalidateQueries({
				queryKey: ["productSearch", query.toLowerCase()],
			});
		}
	}, [hasActiveSubscription, unlockedSearches, enabled, query, queryClient]);

	// Clear forceRefresh parameter from URL after query is made
	useEffect(() => {
		if (forceRefresh && !searchQuery.isLoading && searchQuery.data) {
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete("forceRefresh");
			window.history.replaceState({}, "", newUrl.toString());
		}
	}, [forceRefresh, searchQuery.isLoading, searchQuery.data]);

	const data = searchQuery.data as SearchResponse | undefined;

	return {
		// Search results
		products: data?.products || [],
		totalCount: data?.totalCount || 0,
		count: data?.count || 0,
		isFromCache: data?.isFromCache || false,
		isStaleData: data?.isStaleData || false,
		message: data?.message || "",
		showUpgradeBanner: data?.showUpgradeBanner || false,

		// Pagination data
		currentPage: data?.currentPage || page,
		totalPages: data?.totalPages || 1,
		hasNextPage: data?.hasNextPage || false,
		hasPrevPage: data?.hasPrevPage || false,

		// Background analysis status
		isPending: data?.isPending || false,
		isAnalyzing: data?.isPending || false,

		// Query state
		isLoading: searchQuery.isLoading,
		isFetching: searchQuery.isFetching,
		isError: searchQuery.isError,
		error: searchQuery.error,

		// Fresh fetch mutation
		fetchFresh: fetchFreshProducts.mutate,
		isFetchingFresh: fetchFreshProducts.isPending,

		// Refetch function
		refetch: searchQuery.refetch,
	};
}

export function useProductDetails(productId?: string) {
	return useQuery({
		queryKey: ["productDetails", productId],
		queryFn: async () => {
			if (!productId) {
				throw new Error("Product ID is required");
			}

			const { data, error } = await supabase.functions.invoke(
				"fetch-product-details",
				{
					body: { productId },
				},
			);

			if (error) {
				throw new Error(error.message || "Failed to fetch product details");
			}

			return data;
		},
		enabled: !!productId,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}
