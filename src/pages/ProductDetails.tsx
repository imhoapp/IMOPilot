import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useParallax } from "@/hooks/useParallax";
import { useProductBasic, useProductReviews, useProductVideos } from "@/hooks/useProductDetails";

import { ProductLikeButton } from "@/components/product/ProductLikeButton";
import { ProductImages } from "@/components/product/ProductImages";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductInfoSkeleton } from "@/components/product/ProductInfoSkeleton";
import { ProductProsAndCons } from "@/components/product/ProductProsAndCons";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductReviewsSkeleton } from "@/components/product/ProductReviewsSkeleton";
import { VideoReviews } from "@/components/product/VideoReviews";
import { YouTubeVideosSkeleton } from "@/components/product/YouTubeVideosSkeleton";
import { SearchAccessGate } from "@/components/product/SearchAccessGate";
import { Product } from "@/types/search";
import { useSearchAccess } from "@/hooks/useSearchAccess";

const ProductDetails = () => {
  useParallax();
  const { productId } = useParams<{ productId: string }>();
  const [refreshReviews, setRefreshReviews] = useState(0);
  const { toast } = useToast();
  const { trackProductView } = useAnalytics();

  // Validate productId early
  const isValidProductId = productId && 
    typeof productId === 'string' && 
    productId !== 'undefined' && 
    productId !== 'null' &&
    productId.length > 0;

  // Use React Query for product details with separate hooks for better UX
  const {
    data: productData,
    isLoading: isLoadingBasic,
    isError: isErrorBasic,
    error: errorBasic
  } = useProductBasic(isValidProductId ? productId : undefined);

  // Handle errors with useEffect to prevent infinite re-renders
  useEffect(() => {
    if (isErrorBasic && errorBasic) {
      toast({
        title: "Error loading product",
        description: errorBasic.message || "There was an error loading the product details.",
        variant: "destructive"
      });
    }
  }, [isErrorBasic, errorBasic, toast]);

  const product = (productData as any)?.product as Product | undefined;
  
  // Get search-based access control first
  const searchQuery = product?.query;
  const { 
    data: searchAccess, 
    isLoading: isLoadingAccess 
  } = useSearchAccess(searchQuery);

  // For individual product details, always allow access to reviews and videos
  // since the user can already see the product (either they have access or it's within their free limit)
  const shouldLoadContent = true;

  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    isError: isErrorReviews,
    error: errorReviews
  } = useProductReviews(isValidProductId ? productId : undefined, shouldLoadContent);

  const {
    data: videosData,
    isLoading: isLoadingVideos,
    isError: isErrorVideos,
    error: errorVideos
  } = useProductVideos(isValidProductId ? productId : undefined, shouldLoadContent);

  // Track product view when product data loads
  useEffect(() => {
    if (product && productId) {
      trackProductView(productId, searchQuery);
    }
  }, [product, productId, searchQuery, trackProductView]);

  // Handle invalid product ID
  if (!isValidProductId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Invalid Product ID</h3>
          <p className="text-muted-foreground mb-4">
            The product link appears to be broken or invalid.
          </p>
          <Button asChild>
            <Link to="/search">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {!product && !isLoadingBasic ? (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Product not found</h3>
            <p className="text-muted-foreground mb-4">
              The product you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/search">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-clip">
          <div className="absolute inset-0 bg-gradient-background opacity-35 parallax-background"></div>
          
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-primary rounded-full mix-blend-multiply filter blur-3xl opacity-[0.35] dark:opacity-[0.15] dark:mix-blend-normal parallax-slow"></div>
          <div className="absolute top-1/3 -right-32 w-80 h-80 bg-gradient-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-[0.4] dark:opacity-[0.18] dark:mix-blend-normal parallax-medium"></div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Product Header */}
              {isLoadingBasic ? (
                <ProductInfoSkeleton />
              ) : product ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <ProductImages 
                        title={product.title}
                        imageUrl={product.image_url}
                        imageUrls={product.image_urls}
                      />
                    </div>

                    <div className="space-y-4">
                      <ProductInfo 
                        title={product.title}
                        price={product.price}
                        imoScore={product.imo_score}
                        description={product.description}
                        productUrl={product.product_url}
                        source={product.source}
                      />
                      <div className="flex justify-start">
                        <ProductLikeButton productId={product.id} />
                      </div>
                    </div>
                  </div>

                  {/* Pros and Cons */}
                  <ProductProsAndCons 
                    pros={product.pros}
                    cons={product.cons}
                  />
                </>
              ) : null}

              {/* YouTube Videos and Reviews Sections - Always shown for product details */}
              <div className="space-y-8">
                {/* YouTube Videos Section */}
                {isLoadingVideos ? (
                  <YouTubeVideosSkeleton />
                ) : (
                  <VideoReviews
                    productId={productId || ""} 
                    videos={(videosData as any)?.videos || []}
                  />
                )}

                {/* User Reviews Section */}
                <ProductReviews 
                  productId={productId || ""}
                  reviews={(reviewsData as any)?.reviews || []}
                  reviewsSummary={(reviewsData as any)?.reviewsSummary}
                  refreshReviews={refreshReviews}
                  onRefreshReviews={() => setRefreshReviews(prev => prev + 1)}
                  isLoadingReviews={isLoadingReviews}
                />
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;