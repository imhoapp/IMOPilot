import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { VideoUpload } from "@/components/reviews/VideoUpload";

interface ProductReviewsSkeletonProps {
  productId: string;
  onRefreshReviews: () => void;
}

export const ProductReviewsSkeleton = ({ productId, onRefreshReviews }: ProductReviewsSkeletonProps) => {
  return (
    <div className="space-y-8 pt-16">
      <h2 className="text-2xl font-semibold flex items-center">
        <Video className="h-6 w-6 mr-3 text-primary" />
        Community Reviews
      </h2>
      
      <div className="space-y-8">
        {/* External Reviews Section */}
        <div>
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Community Reviews Section */}
        <div>
          <h3 className="text-lg font-semibold mb-6">Community Video Reviews</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video Upload Form - Static UI, always show actual component */}
            <VideoUpload 
              productId={productId} 
              onUploadSuccess={onRefreshReviews}
            />
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex space-x-4">
                        <Skeleton className="h-16 w-16 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};