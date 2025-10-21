import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Crown, Loader2 } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useSearchAccess } from '@/hooks/useSearchAccess';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ProductLimitBannerProps {
  currentCount: number;
  totalCount: number;
  searchQuery?: string;
}

export function ProductLimitBanner({ currentCount, totalCount, searchQuery: propSearchQuery }: ProductLimitBannerProps) {
  const { canViewAllProducts, loading: userAccessLoading, refetchAccess } = useUserAccess();
  const { session } = useAuth();
  const { toast } = useToast();
  const { trackFreeLimitReached, trackUpgradePromptShown, trackCheckoutStarted } = useAnalytics();
  const [searchParams] = useSearchParams();
  const searchQuery = propSearchQuery || searchParams.get('q') || '';
  const { isLoading: searchAccessLoading } = useSearchAccess(searchQuery);
  const [loading, setLoading] = useState<string | null>(null);

  // Check if payment just succeeded - hide banner immediately
  const urlParams = new URLSearchParams(window.location.search);
  const paymentSuccess = urlParams.get('payment_success');
  const forceRefresh = urlParams.get('forceRefresh');
  const hasJustPaid = paymentSuccess === 'true' || forceRefresh === 'true';

  // Track when limit banner is shown
  useEffect(() => {
    if (!canViewAllProducts() && totalCount > currentCount) {
      trackFreeLimitReached(currentCount, totalCount);
      trackUpgradePromptShown('search_results');
    }
  }, [currentCount, totalCount, canViewAllProducts, trackFreeLimitReached, trackUpgradePromptShown]);

  // Hide banner immediately if:
  // 1. User has access, OR
  // 2. Total count is same as current count (no more products), OR
  // 3. Payment just succeeded (even before data refreshes)
  if (canViewAllProducts() || totalCount <= currentCount || hasJustPaid) {
    return null;
  }

    // Check for payment success in URL parameters and refresh access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const sessionId = urlParams.get('session_id');

    if (paymentSuccess === 'true' && sessionId) {
      // Clear URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment_success');
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', newUrl.toString());

      // Refresh access data immediately
      refetchAccess();

      toast({
        title: "Payment Successful!",
        description: "Your access has been upgraded. You can now view all products.",
        variant: "default",
      });
    }
  }, [refetchAccess, toast]);

  const handleUpgrade = async (type: 'subscription' | 'unlock') => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Please log in to access premium features.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(type);
      const price = type === 'unlock' ? 4.99 : 10.99;

      // Fire analytics without awaiting to avoid delay
      trackCheckoutStarted(price, searchQuery || 'unknown', type === 'unlock' ? 'one-time' : 'subscription');

      const requestBody = type === 'subscription'
        ? { type: 'subscription', redirect_url: window.location.href }
        : { type: 'unlock', search_query: searchQuery, redirect_url: window.location.href };

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: requestBody,
      });

      if (error) throw error;

      // Redirect to Stripe checkout in the same page
      window.location.href = data.url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <TooltipProvider>
      <Card className="mb-6 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardContent className="p-6">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Crown className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Viewing {currentCount} of {totalCount} products
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to premium to see all {totalCount} products and unlock unlimited access
                </p>
              </div>
            </div>
            <div className="flex space-x-3 shrink-0">
              {searchQuery && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => handleUpgrade('unlock')}
                      disabled={loading === 'unlock'}
                      className="bg-white hover:bg-gray-50 hover:text-black"
                    >
                      {loading === 'unlock' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>🔓 Unlock "{searchQuery}" – $4.99</>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">One-time payment to unlock all "{searchQuery}" results. Limited to this search category only.</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleUpgrade('subscription')}
                    disabled={loading === 'subscription'}
                  >
                    {loading === 'subscription' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>💼 Go Unlimited – $10.99/mo</>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Monthly subscription for unlimited access to all product searches and categories with no restrictions.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Crown className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  Viewing {currentCount} of {totalCount} products
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to premium to see all {totalCount} products and unlock unlimited access
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleUpgrade('subscription')}
                    disabled={loading === 'subscription'}
                    className="w-full"
                  >
                    {loading === 'subscription' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>💼 Go Unlimited – $10.99/mo</>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Monthly subscription for unlimited access to all product searches and categories with no restrictions.</p>
                </TooltipContent>
              </Tooltip>
              {searchQuery && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => handleUpgrade('unlock')}
                      disabled={loading === 'unlock'}
                      className="w-full bg-white hover:bg-gray-50 hover:text-black"
                    >
                      {loading === 'unlock' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>🔓 Unlock "{searchQuery}" – $4.99</>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">One-time payment to unlock all "{searchQuery}" results. Limited to this search category only.</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}