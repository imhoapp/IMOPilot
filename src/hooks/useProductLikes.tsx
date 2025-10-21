import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useProductLikes(
  productId?: string, 
  initialLikeCount?: number, 
  initialLikedByUser?: boolean
) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(initialLikedByUser ?? false);
  const [likeCount, setLikeCount] = useState(initialLikeCount ?? 0);
  const [loading, setLoading] = useState(false);

  // Check if product is liked and get like count only if initial values not provided
  useEffect(() => {
    if (!productId || (initialLikeCount !== undefined && initialLikedByUser !== undefined)) return;

    let isCancelled = false;

    const fetchLikeData = async () => {
      try {
        // Get total like count
        const { count } = await supabase
          .from('product_likes')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', productId);

        if (!isCancelled) {
          setLikeCount(count || 0);
        }

        // Check if current user liked this product
        if (user && !isCancelled) {
          const { data } = await supabase
            .from('product_likes')
            .select('id')
            .eq('product_id', productId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!isCancelled) {
            setIsLiked(!!data);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching like data:', error);
        }
      }
    };

    fetchLikeData();
    
    return () => {
      isCancelled = true;
    };
  }, [productId, user?.id]); // Only depend on user.id, not the whole user object

  const toggleLike = async () => {
    if (!user || !productId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like products",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('product_likes')
          .delete()
          .eq('product_id', productId)
          .eq('user_id', user.id);

        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        // Like
        await supabase
          .from('product_likes')
          .insert({
            product_id: productId,
            user_id: user.id
          });

        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isLiked,
    likeCount,
    toggleLike,
    loading
  };
}