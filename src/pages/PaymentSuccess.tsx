import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, Home, Search, Loader2 } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useSubscriptionFlow } from '@/hooks/useSubscriptionFlow';
import { SearchHeader } from '@/components/search/SearchHeader';
import { useQueryClient } from '@tanstack/react-query';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshAccess, loading } = useUserAccess();
  const { handlePaymentSuccess } = useSubscriptionFlow();
  const [isRefreshing, setIsRefreshing] = useState(true);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const handleSuccess = async () => {
      setIsRefreshing(true);

      // Get payment type and category from URL params
      const paymentType = searchParams.get('type') as 'subscription' | 'unlock' | null;
      const category = searchParams.get('category');

      // Wait a moment for Stripe to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (paymentType) {
        await handlePaymentSuccess(paymentType, category || undefined, sessionId || undefined);
      } else {
        // Fallback refresh if no type specified
        await refreshAccess();
      }

      // Invalidate all product search queries to ensure fresh access permissions
      queryClient.invalidateQueries({
        queryKey: ['productSearch']
      });

      // Also invalidate search access queries
      queryClient.invalidateQueries({
        queryKey: ['search-access']
      });

      setIsRefreshing(false);
    };

    handleSuccess();
  }, [searchParams, refreshAccess, handlePaymentSuccess, queryClient]);

  if (isRefreshing || loading) {
    return (
      <div className="min-h-screen bg-background">
        <SearchHeader />
        <div className="container mx-auto px-6 py-16 max-w-2xl">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="flex justify-center mb-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-4">Processing Payment...</h1>
              <p className="text-muted-foreground">
                We're updating your account with the new subscription. This may take a moment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SearchHeader />
      <div className="container mx-auto px-6 py-16 max-w-2xl">
        <Card className="text-center border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-900">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-green-800">
              <p className="text-lg mb-2">
                🎉 Welcome to your upgraded experience!
              </p>
              <p className="text-sm opacity-90">
                Your payment has been processed successfully. You now have access to premium features.
              </p>
            </div>

            {sessionId && (
              <div className="bg-green-100 p-4 rounded-lg">
                <p className="text-xs text-green-600 font-mono">
                  Session ID: {sessionId}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  // Navigate back to search with current query if available
                  // Add forceRefresh parameter to ensure fresh data after payment
                  const lastQuery = searchParams.get('category') || searchParams.get('query') || '';
                  const searchUrl = lastQuery
                    ? `/search?query=${encodeURIComponent(lastQuery)}&forceRefresh=true`
                    : '/search?forceRefresh=true';
                  navigate(searchUrl);
                }}
                className="flex items-center justify-center"
              >
                <Search className="mr-2 h-4 w-4" />
                Continue Searching
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/profile')}
                className="flex items-center justify-center"
              >
                <Crown className="mr-2 h-4 w-4" />
                View Subscription
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}