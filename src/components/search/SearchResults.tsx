import { motion } from "framer-motion";
import { Package, Search } from "lucide-react";
import { useAccess } from "@/components/access-control/AccessProvider";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import type { Product } from "@/types/search";
import { ProductGrid } from "./ProductGrid";

interface SearchResultsProps {
	loading: boolean;
	products: Product[];
	totalCount?: number;
	searchPerformed: boolean;
	searchQuery?: string;
	showUpgradeBanner?: boolean;
	onRetry?: () => void;
	// Pagination props
	currentPage?: number;
	totalPages?: number;
	hasNextPage?: boolean;
	hasPrevPage?: boolean;
	onPageChange?: (page: number) => void;
}

export const SearchResults = ({
	loading,
	products,
	totalCount,
	searchPerformed,
	searchQuery,
	showUpgradeBanner,
	onRetry,
	currentPage = 1,
	totalPages = 1,
	hasNextPage = false,
	hasPrevPage = false,
	onPageChange,
}: SearchResultsProps) => {
	const { canViewAllProducts, getMaxProductCount } = useAccess();

	// Filter out products with invalid IDs to get the actual valid count
	const validProducts = products.filter((product) => {
		return (
			product?.id &&
			typeof product.id === "string" &&
			product.id.trim() !== "" &&
			product.id !== "undefined" &&
			product.id !== "null"
		);
	});

	// Determine limited access using maxProductCount from access provider (Infinity means unlimited)
	const maxProductCount = getMaxProductCount(searchQuery);
	const isLimitedAccess = !canViewAllProducts() && maxProductCount !== Infinity;

	// Use backend-provided pagination values; hide pagination for limited users
	const showPagination =
		!isLimitedAccess && (totalPages ?? 1) > 1 && !!onPageChange;

	if (!searchPerformed) {
		return (
			<div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="space-y-6"
				>
					<div className="flex justify-center">
						<Search className="h-16 w-16 text-muted-foreground/50" />
					</div>
					<div className="space-y-2">
						<h2 className="text-2xl font-semibold tracking-tight">
							Search for Products
						</h2>
						<p className="text-muted-foreground max-w-md mx-auto">
							Enter a product name or keyword to find the best deals and reviews
							across multiple stores.
						</p>
					</div>
				</motion.div>
			</div>
		);
	}

	if (!loading && validProducts.length === 0) {
		return (
			<div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="space-y-6"
				>
					<div className="flex justify-center">
						<Package className="h-16 w-16 text-muted-foreground/50" />
					</div>
					<div className="space-y-4">
						<h2 className="text-2xl font-semibold tracking-tight">
							No Products Found
						</h2>
						<p className="text-muted-foreground max-w-md mx-auto">
							We couldn't find any products matching your search. Try searching
							for a different product.
						</p>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
			{!loading && validProducts.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="space-y-8"
				>
					<div className="text-center space-y-2">
						<h2 className="text-xl font-semibold">
							Found {totalCount} {totalCount === 1 ? "Product" : "Products"}
						</h2>
						<p className="text-muted-foreground text-sm">
							Showing products over $250 with AI-powered analysis
						</p>
					</div>

					<motion.div
						key={currentPage}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
					>
						<ProductGrid
							products={validProducts}
							totalCount={totalCount}
							searchQuery={searchQuery}
							showUpgradeBanner={showUpgradeBanner}
						/>
					</motion.div>

					{/* Pagination Controls */}
					{showPagination && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.2 }}
							className="flex justify-center mt-8"
						>
							<Pagination>
								<PaginationContent>
									{hasPrevPage && onPageChange && (
										<PaginationItem>
											<PaginationPrevious
												href="#"
												className="hover:bg-muted hover:text-primary"
												onClick={(e) => {
													e.preventDefault();
													if (onPageChange) {
														onPageChange(currentPage - 1);
													}
												}}
											/>
										</PaginationItem>
									)}

									{/* Generate page numbers */}
									{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
										let pageNumber: number;
										if (totalPages <= 5) {
											pageNumber = i + 1;
										} else if (currentPage <= 3) {
											pageNumber = i + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNumber = totalPages - 4 + i;
										} else {
											pageNumber = currentPage - 2 + i;
										}

										return (
											<PaginationItem key={pageNumber}>
												<PaginationLink
													href="#"
													isActive={pageNumber === currentPage}
													className={`transition-all duration-200 hover:bg-muted hover:text-primary ${pageNumber === currentPage ? "bg-primary text-primary-foreground" : ""}`}
													onClick={(e) => {
														e.preventDefault();
														if (onPageChange && pageNumber !== currentPage) {
															onPageChange(pageNumber);
														}
													}}
												>
													{pageNumber}
												</PaginationLink>
											</PaginationItem>
										);
									})}

									{hasNextPage && onPageChange && (
										<PaginationItem>
											<PaginationNext
												href="#"
												className="hover:bg-muted hover:text-primary"
												onClick={(e) => {
													e.preventDefault();
													if (onPageChange) {
														onPageChange(currentPage + 1);
													}
												}}
											/>
										</PaginationItem>
									)}
								</PaginationContent>
							</Pagination>
						</motion.div>
					)}
				</motion.div>
			)}
		</div>
	);
};
