import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import { useCallback, useEffect, useState } from "react";
import {
	type FilterOptions,
	SearchFilters,
} from "@/components/search/SearchFilters";
import { SearchForm } from "@/components/search/SearchForm";
import { SearchResults } from "@/components/search/SearchResults";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useParallax } from "@/hooks/useParallax";
import { useProductFilter } from "@/hooks/useProductFilter";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useSearchUrl } from "@/hooks/useSearchUrl";

// Debounce hook for subtle filtering
const useDebounce = <T,>(value: T, delay: number): T => {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
};

const Search = () => {
	useParallax();
	const { query } = useSearchUrl();
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
	const [isChangingPage, setIsChangingPage] = useState(false);

	// URL-based filter state
	const [sortBy, setSortBy] = useQueryState(
		"sortBy",
		parseAsString.withDefault("newest"),
	);
	const [priceMin, setPriceMin] = useQueryState(
		"priceMin",
		parseAsInteger.withDefault(250),
	);
	const [priceMax, setPriceMax] = useQueryState(
		"priceMax",
		parseAsInteger.withDefault(10000),
	);
	const [minImoScore, setMinImoScore] = useQueryState(
		"minImoScore",
		parseAsInteger.withDefault(0),
	);
	const [minRating, setMinRating] = useQueryState(
		"minRating",
		parseAsInteger.withDefault(0),
	);

	// Local state for immediate UI updates (before debouncing)
	const [localFilters, setLocalFilters] = useState<FilterOptions>({
		sortBy: sortBy as FilterOptions["sortBy"],
		priceRange: [priceMin, priceMax] as [number, number],
		minImoScore,
		minRating,
	});

	// Debounced filters for API calls (more subtle)
	const debouncedFilters = useDebounce(localFilters, 800);

	const { toast } = useToast();
	const { trackSearchPerformed } = useAnalytics();

	// Sync URL params to local filters on mount/URL change
	useEffect(() => {
		setLocalFilters({
			sortBy: sortBy as FilterOptions["sortBy"],
			priceRange: [priceMin, priceMax] as [number, number],
			minImoScore,
			minRating,
		});
	}, [sortBy, priceMin, priceMax, minImoScore, minRating]);

	// Update URL when debounced filters change
	useEffect(() => {
		// Only trigger loading state if we're already submitted and have a query
		if (hasSubmitted && query?.trim()) {
			console.log(`Debounced filter change: setting isChangingPage=true`);
			setIsChangingPage(true);

			// Scroll to top when debounced filters change (when user finishes adjusting)
			window.scrollTo({ top: 0, behavior: "smooth" });
		}

		setSortBy(debouncedFilters.sortBy);
		setPriceMin(debouncedFilters.priceRange[0]);
		setPriceMax(debouncedFilters.priceRange[1]);
		setMinImoScore(debouncedFilters.minImoScore);
		setMinRating(debouncedFilters.minRating);
	}, [
		debouncedFilters,
		hasSubmitted,
		query,
		setPriceMin,
		setMinRating,
		setSortBy,
		setPriceMax,
		setMinImoScore,
	]);

	// Use React Query for product search with debounced filters
	const {
		products,
		totalCount,
		totalPages,
		hasNextPage,
		hasPrevPage,
		isLoading,
		isFetching,
		isError,
		error,
		isFetchingFresh,
		refetch,
		showUpgradeBanner,
	} = useProductSearch({
		query: query,
		enabled: hasSubmitted && !!query?.trim(),
		page: page,
		// Pass debounced filter parameters for backend filtering
		sortBy: debouncedFilters.sortBy,
		priceRange: debouncedFilters.priceRange,
		minImoScore: debouncedFilters.minImoScore,
		minRating: debouncedFilters.minRating,
	});

	// Apply filters to products (only for limited users, backend handles it for subscribed users)
	const filteredProducts = useProductFilter(products, debouncedFilters, query);

	// Handle filter changes (immediate UI update, debounced API call)
	const handleFiltersChange = useCallback(
		(newFilters: FilterOptions) => {
			// Only update local filters immediately - no loading state yet
			setLocalFilters(newFilters);
			// Reset to page 1 when filters change
			setPage(1);
		},
		[setPage],
	);

	const handleSearch = (searchQuery?: string) => {
		const effectiveQuery = searchQuery || query;
		if (!effectiveQuery?.trim()) {
			toast({
				title: "Search query required",
				description: "Please enter a product name or keyword to search.",
				variant: "destructive",
			});
			return;
		}

		console.log(
			`Search: setting isChangingPage=true, query: ${effectiveQuery}`,
		);

		// Set loading state for search
		setIsChangingPage(true);

		// Scroll to top of page
		window.scrollTo({ top: 0, behavior: "smooth" });

		setHasSubmitted(true);
		setPage(1); // Reset to first page on new search
		// Force refetch to ensure fresh results even for the same query
		// refetch();
	};

	const handlePageChange = (newPage: number) => {
		// Validate page number
		if (newPage < 1 || (totalPages && newPage > totalPages)) {
			toast({
				title: "Invalid page",
				description: `Page ${newPage} doesn't exist. Valid pages are 1-${totalPages}.`,
				variant: "destructive",
			});
			return;
		}

		console.log(
			`Page change: setting isChangingPage=true, current page: ${page}, new page: ${newPage}`,
		);

		// Set loading state for page change
		setIsChangingPage(true);

		// Scroll to top of page
		window.scrollTo({ top: 0, behavior: "smooth" });

		setPage(newPage);
	};

	// Handle errors and reset page changing state
	useEffect(() => {
		if (isError && error) {
			toast({
				title: "Search failed",
				description:
					error.message || "There was an error performing the search.",
				variant: "destructive",
			});
			setIsChangingPage(false);
		}
	}, [isError, error, toast]);

	// Reset page changing state when loading completes and we have new data
	useEffect(() => {
		if (!isFetching && isChangingPage && products.length > 0) {
			console.log(
				`Loading complete: setting isChangingPage=false, isFetching: ${isFetching}, isChangingPage: ${isChangingPage}, products.length: ${products.length}`,
			);
			setIsChangingPage(false);
		}
	}, [isFetching, isChangingPage, products.length]);

	// Auto-submit search when query exists in URL
	useEffect(() => {
		if (query?.trim()) {
			// Set loading state when query changes
			setIsChangingPage(true);
			// Scroll to top when query changes
			window.scrollTo({ top: 0, behavior: "smooth" });
			setHasSubmitted(true);
		} else {
			setHasSubmitted(false);
		}
	}, [query]);

	// Validate page number only after search results are loaded and we have totalPages
	useEffect(() => {
		// Add a small delay to ensure we have the correct totalPages value
		const timeoutId = setTimeout(() => {
			// Only validate if we have search results loaded and totalPages is available
			// Also ensure we have products loaded to avoid race conditions
			if (
				totalPages &&
				totalPages > 0 &&
				hasSubmitted &&
				!isLoading &&
				products.length > 0
			) {
				if (page < 1) {
					// Handle negative or zero page numbers
					toast({
						title: "Invalid page",
						description: `Page ${page} doesn't exist. Redirecting to page 1.`,
						variant: "destructive",
					});
					setPage(1);
				} else if (page > totalPages) {
					// Handle pages beyond the maximum
					console.log(
						`Validation: page=${page}, totalPages=${totalPages}, totalCount=${totalCount}, products.length=${products.length}, redirecting to page ${totalPages}`,
					);
					toast({
						title: "Page not found",
						description: `Page ${page} doesn't exist. Redirecting to page ${totalPages}.`,
						variant: "destructive",
					});
					setPage(totalPages);
				}
			}
		}, 100); // Small delay to ensure data is stable

		return () => clearTimeout(timeoutId);
	}, [
		totalPages,
		page,
		hasSubmitted,
		isLoading,
		products.length,
		setPage,
		toast,
		totalCount,
	]);

	// Listen for payment success and refetch search results
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const paymentSuccess = urlParams.get("payment_success");
		let timeoutId: number | undefined;

		if (paymentSuccess === "true" && hasSubmitted && query?.trim()) {
			timeoutId = window.setTimeout(() => {
				refetch();
			}, 1500); // Give time for access to update
		}

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [hasSubmitted, query, refetch]);

	// Track search performed when results are loaded
	useEffect(() => {
		if (hasSubmitted && !isLoading && products.length > 0 && query?.trim()) {
			trackSearchPerformed(query, totalCount, products.length);
		}
	}, [
		hasSubmitted,
		isLoading,
		products.length,
		query,
		totalCount,
		trackSearchPerformed,
	]);

	return (
		<NuqsAdapter>
			<div className="min-h-screen bg-background">
				{/* Main content with background */}
				<div className="relative overflow-hidden">
					{/* Very subtle animated background with enhanced parallax */}
					<div className="absolute inset-0 bg-gradient-background opacity-35 parallax-background"></div>

					{/* Extremely subtle floating orbs with enhanced parallax */}
					<div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-primary rounded-full mix-blend-multiply filter blur-3xl opacity-[0.35] dark:opacity-[0.15] dark:mix-blend-normal parallax-slow"></div>
					<div className="absolute top-1/3 -right-32 w-80 h-80 bg-gradient-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-[0.4] dark:opacity-[0.18] dark:mix-blend-normal parallax-medium"></div>
					<div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-primary rounded-full mix-blend-multiply filter blur-3xl opacity-[0.3] dark:opacity-[0.12] dark:mix-blend-normal parallax-fast"></div>
					<div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-secondary rounded-full mix-blend-multiply filter blur-2xl opacity-[0.35] dark:opacity-[0.15] dark:mix-blend-normal parallax-drift"></div>
					<div className="absolute top-1/6 left-1/2 w-56 h-56 bg-gradient-primary rounded-full mix-blend-multiply filter blur-2xl opacity-[0.25] dark:opacity-[0.1] dark:mix-blend-normal parallax-ultra-slow"></div>

					{isFetchingFresh && filteredProducts.length > 0 && (
						<div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
							<div className="flex items-center justify-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-lg">
								<div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
								<p className="text-sm font-medium">
									Updating with fresh data...
								</p>
							</div>
						</div>
					)}

					<SearchForm
						query={query || ""}
						loading={isLoading}
						onQueryChange={() => {}}
						onSearch={handleSearch}
					/>

					{/* Enhanced loader positioned below search form */}
					{(isLoading || isChangingPage) && (
						<div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
							<div className="flex flex-col items-center space-y-6">
								<div className="relative">
									{/* Main spinning ring */}
									<div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
									{/* Secondary ring with different rotation */}
									<div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-r-secondary rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
									{/* Inner pulsing dot */}
									<div className="absolute inset-8 w-4 h-4 bg-gradient-primary rounded-full animate-pulse"></div>
									{/* Orbiting dots */}
									<div className="absolute inset-0 w-20 h-20">
										<div className="absolute top-0 left-1/2 w-2 h-2 bg-primary rounded-full animate-[spin_2s_linear_infinite] transform -translate-x-1/2"></div>
										<div className="absolute bottom-0 left-1/2 w-2 h-2 bg-secondary rounded-full animate-[spin_2s_linear_infinite] transform -translate-x-1/2"></div>
									</div>
								</div>
								<div className="text-center space-y-3 animate-fade-in">
									<p className="text-xl font-semibold">
										{/* {isChangingPage
											? "Loading page..."
											: "Analyzing products with AI..."} */}
										Analyzing products with AI...
									</p>
									<p className="text-muted-foreground">
										{/* {isChangingPage
											? "Fetching new products..."
											: "Searching across multiple stores and analyzing quality"} */}
										Searching across multiple stores and analyzing quality
									</p>
									<div className="flex justify-center space-x-2 mt-4">
										<div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1.4s_ease-in-out_infinite]"></div>
										<div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1.4s_ease-in-out_0.2s_infinite]"></div>
										<div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1.4s_ease-in-out_0.4s_infinite]"></div>
									</div>
								</div>
							</div>
						</div>
					)}

					{hasSubmitted && !isLoading && !isChangingPage && (
						<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
							<SearchFilters
								filters={localFilters}
								onFiltersChange={handleFiltersChange}
								productCount={filteredProducts.length}
							/>
						</div>
					)}

					<div data-search-results>
						<SearchResults
							loading={isLoading || isChangingPage}
							products={filteredProducts}
							totalCount={totalCount}
							searchPerformed={hasSubmitted}
							searchQuery={query || ""}
							showUpgradeBanner={showUpgradeBanner}
							currentPage={page}
							totalPages={totalPages}
							hasNextPage={hasNextPage}
							hasPrevPage={hasPrevPage}
							onPageChange={handlePageChange}
						/>
					</div>
				</div>
			</div>
		</NuqsAdapter>
	);
};

export default Search;
