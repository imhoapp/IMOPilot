import { useState, useEffect } from "react";
import { MessageCircle, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
}

interface ReviewCommentsProps {
  reviewId: string;
  reviewUserId: string;
}

export const ReviewComments = ({ reviewId, reviewUserId }: ReviewCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user names for each comment
      const commentsWithNames = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', comment.user_id)
            .maybeSingle();

          return {
            ...comment,
            user_name: profile?.full_name || 'Anonymous'
          };
        })
      );

      setComments(commentsWithNames);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [reviewId, showComments]);

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment.",
        variant: "destructive"
      });
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          review_id: reviewId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully."
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Could not post comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canComment = user && user.id !== reviewUserId;

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="flex items-center space-x-2"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
      </Button>

      {showComments && (
        <div className="space-y-4 pl-4 border-l border-border/20">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <Card key={comment.id} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">
                            {comment.user_name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {canComment && (
                <div className="space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[80px] resize-none"
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Posting...' : 'Post Comment'}</span>
                  </Button>
                </div>
              )}

              {!canComment && user && user.id === reviewUserId && (
                <p className="text-sm text-muted-foreground italic">
                  You cannot comment on your own review.
                </p>
              )}

              {!user && (
                <p className="text-sm text-muted-foreground italic">
                  Please sign in to comment on this review.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};