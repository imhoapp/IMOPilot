import { Video } from "lucide-react";
import { motion } from "framer-motion";
import { VideoUpload } from "@/components/reviews/VideoUpload";
import { ReviewsList } from "@/components/reviews/ReviewsList";
import { ExternalReviews } from "@/components/product/ProductReviews/ExternalReviews";

interface ProductReviewsProps {
  productId: string;
  reviews?: any[];
  reviewsSummary?: string;
  refreshReviews: number;
  onRefreshReviews: () => void;
  isLoadingReviews?: boolean;
}

export const ProductReviews = ({ productId, reviews = [], reviewsSummary, refreshReviews, onRefreshReviews, isLoadingReviews }: ProductReviewsProps) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="space-y-8 pt-16"
    >
      <h2 className="text-2xl font-semibold flex items-center">
        Internet Reviews
      </h2>

      <div className="space-y-8">
        {/* External Reviews Section */}
        <div>
          <ExternalReviews 
            productId={productId} 
            reviews={reviews} 
            reviewsSummary={reviewsSummary}
            isLoading={isLoadingReviews}
          />
        </div>

        {/* Community Reviews Section - Always shown as it has its own loading state */}
        <div>
          <h3 className="text-lg font-semibold mb-6 flex gap-2 items-center">
            <Video className="h-6 w-6 mr-3 text-primary" />
            Community Video Reviews
            </h3>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Video Upload Form - Sticky on desktop */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
                <VideoUpload
                  productId={productId}
                  onUploadSuccess={onRefreshReviews}
                />
            </div>
            {/* Reviews List - Scrollable */}
            <div className="lg:col-span-7">
              <ReviewsList
                productId={productId}
                refreshTrigger={refreshReviews}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};