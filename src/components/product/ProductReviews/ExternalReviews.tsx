import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Star, ThumbsUp, ThumbsDown, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ExternalReview {
  id: string;
  external_review_id: string;
  reviewer_name: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  verified_purchase: boolean;
  review_date: string | null;
  positive_feedback: number;
  negative_feedback: number;
  source: string | null;
}

interface ExternalReviewsProps {
  productId: string;
  reviews?: ExternalReview[];
  reviewsSummary?: string;
  isLoading?: boolean;
}

export const ExternalReviews = ({ productId, reviews = [], reviewsSummary, isLoading }: ExternalReviewsProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;
  const totalReviews = reviews.length;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const totalPages = Math.ceil(totalReviews / reviewsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const generatePageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;

      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, start + maxVisiblePages - 1);

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      }

      return pages;
    };

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {generatePageNumbers().map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => setCurrentPage(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (isLoading) {
    return (
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
    );
  }

  if (totalReviews === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No reviews available for this product.
        </CardContent>
      </Card>
    );
  }

  // Get current page reviews
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const endIndex = startIndex + reviewsPerPage;
  const currentReviews = reviews.slice(startIndex, endIndex);

  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
             Product Reviews ({totalReviews})
            </h3>
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
          </div>

          {reviewsSummary && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Review Summary</h4>
              <p className="text-sm text-muted-foreground">{reviewsSummary}</p>
            </div>
          )}

          <div className="space-y-4">
            {currentReviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex">{renderStars(review.rating)}</div>
                      <span className="text-sm font-medium">
                        {review.rating}/5
                      </span>
                      {review.verified_purchase && (
                        <Badge variant="outline" className="text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{review.reviewer_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{formatDate(review.review_date)}</span>
                      {review.source && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs">
                            {review.source === 'FireCrawl' ? 'External Review' : review.source}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {review.title && (
                  <h4 className="font-medium mb-2">{review.title}</h4>
                )}

                {review.review_text && (
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {review.review_text}
                  </p>
                )}

                {(review.positive_feedback > 0 || review.negative_feedback > 0) && (
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{review.positive_feedback}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ThumbsDown className="h-4 w-4" />
                      <span>{review.negative_feedback}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

          {renderPagination()}
        </div>
      </CardContent>
    </Card>
  );
};