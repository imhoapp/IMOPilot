import { useState, useEffect } from "react";
import { Heart, Star, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/ui/video-player";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ReviewComments } from "./ReviewComments";

interface Review {
  id: string;
  title: string;
  description: string;
  rating: number;
  video_url: string;
  created_at: string;
  user_id: string;
  likes_count?: number;
  user_has_liked?: boolean;
}

interface ReviewsListProps {
  productId: string;
  refreshTrigger: number;
}

export const ReviewsList = ({ productId, refreshTrigger }: ReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from('user_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      
      // Get user likes for each review
      const reviewsWithLikes = await Promise.all(
        (reviewsData || []).map(async (review) => {
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('review_id', review.id);

          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('review_id', review.id)
            .eq('user_id', user?.id || '')
            .maybeSingle();

          return {
            ...review,
            likes_count: likesCount || 0,
            user_has_liked: !!userLike,
          };
        })
      );

      setReviews(reviewsWithLikes);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error loading reviews",
        description: "Could not load reviews. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, refreshTrigger]);

  const handleLike = async (reviewId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like reviews.",
        variant: "destructive"
      });
      return;
    }

    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    try {
      if (review.user_has_liked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({
            review_id: reviewId,
            user_id: user.id
          });
      }

      // Update local state
      setReviews(reviews.map(r => 
        r.id === reviewId 
          ? {
              ...r,
              user_has_liked: !r.user_has_liked,
              likes_count: r.user_has_liked ? (r.likes_count || 0) - 1 : (r.likes_count || 0) + 1
            }
          : r
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Could not update like. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="text-center py-8">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
          <p className="text-muted-foreground">Be the first to share your experience!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <Card key={review.id} className="glass-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Review Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{review.title}</h3>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Video Player */}
              {review.video_url && (
                <VideoPlayer
                  src={review.video_url}
                  title={review.title}
                  className="aspect-video"
                />
              )}

              {/* Review Description */}
              {review.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {review.description}
                </p>
              )}

               {/* Action Buttons */}
               <div className="space-y-3 pt-2 border-t border-border/20">
                 <div className="flex items-center space-x-4">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleLike(review.id)}
                     className="flex items-center space-x-2 hover:text-red-500"
                   >
                     <Heart
                       className={`h-4 w-4 ${
                         review.user_has_liked ? 'fill-red-500 text-red-500' : ''
                       }`}
                     />
                     <span>{review.likes_count || 0}</span>
                   </Button>
                 </div>
                 
                 {/* Comments Section */}
                 <ReviewComments reviewId={review.id} reviewUserId={review.user_id} />
               </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};