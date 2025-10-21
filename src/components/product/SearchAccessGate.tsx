import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Lock } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { YouTubeVideosSkeleton } from './YouTubeVideosSkeleton';
import { ProductReviewsSkeleton } from './ProductReviewsSkeleton';

interface SearchAccessGateProps {
  searchQuery: string;
  children: React.ReactNode;
  productTitle?: string;
  showUpgradeBanner: boolean;
}

export function SearchAccessGate({ 
  searchQuery, 
  children, 
  productTitle,
  showUpgradeBanner
}: SearchAccessGateProps) {
  const { hasActiveSubscription, loading } = useUserAccess();
  const { session } = useAuth();
  const { toast } = useToast();
  const { trackInteraction, trackUpgradePromptShown, trackCheckoutStarted, trackUnlockAttempt } = useAnalytics();

  // Track when content is blocked - MUST be called before any conditional returns
  useEffect(() => {
    if (!loading && showUpgradeBanner) {
      trackInteraction('search_blocked', 'search', searchQuery, {
        search_query: searchQuery,
        product_title: productTitle,
        subscription_status: hasActiveSubscription ? 'premium' : 'free'
      });
      trackUpgradePromptShown('product_details', searchQuery);
    }
  }, [loading, showUpgradeBanner, searchQuery, productTitle, hasActiveSubscription, trackInteraction, trackUpgradePromptShown]);

  // Don't show locked content while loading to prevent flash
  if (loading) {
    return (
      <div className="space-y-8">
        <YouTubeVideosSkeleton />
        <ProductReviewsSkeleton 
          productId="loading" 
          onRefreshReviews={() => {}} 
        />
      </div>
    );
  }

  const handleUnlock = async (type: 'subscription' | 'unlock') => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Please log in to unlock this search.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Track analytics
      if (type === 'unlock') {
        await trackUnlockAttempt(searchQuery, 'search');
      }
      await trackCheckoutStarted(type === 'subscription' ? 10.99 : 4.99, searchQuery, type === 'subscription' ? 'subscription' : 'one-time');

      const requestBody = type === 'unlock'
        ? { 
            type: 'unlock', 
            searchQuery,
            redirect_url: window.location.href
          }
        : { 
            type: 'subscription',
            redirect_url: window.location.href
          };

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: requestBody,
      });

      if (error) throw error;

      // Navigate to Stripe checkout in same window
      window.location.href = data.url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!showUpgradeBanner) {
    return <>{children}</>;
  }

  // Security: Don't render actual children if access is denied
  // Instead show placeholder content with blur for visual appeal
  return (
    <div className="relative">
      {/* Placeholder content with blur effect */}
      <div className="filter blur-lg pointer-events-none select-none opacity-40">
        <div className="space-y-8">
          {/* Placeholder YouTube Videos Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Video Reviews</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="space-y-3">
                  <div 
                    className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundImage: `url(https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=225&fit=crop&crop=center&auto=format&q=20)`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="bg-black/50 rounded-full p-3">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Placeholder Reviews Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Customer Reviews</h2>
            <div className="grid gap-6">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="border rounded-xl p-6 space-y-4 bg-card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div key={star} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                        ))}
                      </div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-300 rounded w-4/6"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Placeholder Pros and Cons if it's product content */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-6 bg-green-200 rounded w-20"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-4 h-4 bg-green-400 rounded-full mt-0.5"></div>
                    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-6 bg-red-200 rounded w-20"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-4 h-4 bg-red-400 rounded-full mt-0.5"></div>
                    <div className="h-4 bg-gray-300 rounded w-4/6"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-xl">
                "{searchQuery}" Search Locked
              </h3>
              <p className="text-sm text-muted-foreground">
                {productTitle 
                  ? `"${productTitle}" is part of the "${searchQuery}" search results. Unlock to view full details.`
                  : `This content is part of the "${searchQuery}" search and requires access to view.`
                }
              </p>
            </div>

            <div className="space-y-3">
              {!hasActiveSubscription && (
                <>
                  <Button 
                    onClick={() => handleUnlock('subscription')}
                    className="w-full bg-gradient-primary"
                    size="lg"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Get Full Access - $10.99/month
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        or unlock just this search
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => handleUnlock('unlock')}
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Unlock "{searchQuery}" Only - $4.99
                  </Button>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Instant access • Secure payment • Cancel anytime
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}