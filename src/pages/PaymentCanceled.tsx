import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Home, Search, RefreshCw, Crown, Shield, Clock, Check } from 'lucide-react';
import { useSubscriptionFlow } from '@/hooks/useSubscriptionFlow';
import { SearchHeader } from '@/components/search/SearchHeader';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';

export default function PaymentCanceled() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handlePaymentCancelled, createCheckoutSession } = useSubscriptionFlow();

  useEffect(() => {
    const handleCancellation = async () => {
      // Get payment type and category from URL params
      const paymentType = searchParams.get('type') as 'subscription' | 'unlock' | null;
      const category = searchParams.get('category');
      
      if (paymentType) {
        await handlePaymentCancelled(paymentType, category || undefined);
      }
    };

    handleCancellation();
  }, [searchParams, handlePaymentCancelled]);

  const handleTryAgain = async () => {
    const paymentType = searchParams.get('type') as 'subscription' | 'unlock' | null;
    const category = searchParams.get('category');
    
    if (paymentType) {
      await createCheckoutSession(paymentType, category || undefined);
    } else {
      // Default to subscription if no type specified
      await createCheckoutSession('subscription');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <SearchHeader />
      <div className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-200 rounded-full blur-xl opacity-20"></div>
              <div className="relative p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200">
                <XCircle className="h-16 w-16 text-orange-600" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Payment Canceled</h1>
          <p className="text-xl text-muted-foreground mb-2">
            No worries! Your payment was canceled.
          </p>
          <p className="text-muted-foreground">
            You can try again anytime or continue using our free features.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button 
            onClick={handleTryAgain}
            size="lg"
            className="px-8 py-6 text-lg"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Payment Again
          </Button>
          <Button 
            onClick={() => navigate('/search')}
            variant="outline"
            size="lg"
            className="px-8 py-6 text-lg"
          >
            <Search className="mr-2 h-5 w-5" />
            Continue Searching
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate('/')}
            size="lg"
            className="px-8 py-6 text-lg"
          >
            <Home className="mr-2 h-5 w-5" />
            Return Home
          </Button>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Why Upgrade */}
          <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <Crown className="h-8 w-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Why Upgrade?</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground">Unlimited access to all product categories</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground">Advanced AI-powered product insights</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground">Priority customer support</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground">Cancel anytime with no fees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust & Security */}
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <Shield className="h-8 w-8 text-green-600 mr-3" />
                <h3 className="text-2xl font-semibold">Secure & Trusted</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <p className="text-muted-foreground">256-bit SSL encryption</p>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <p className="text-muted-foreground">Instant activation after payment</p>
                </div>
                <div className="flex items-start space-x-3">
                  <RefreshCw className="h-5 w-5 text-purple-600 mt-0.5" />
                  <p className="text-muted-foreground">30-day money-back guarantee</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plans */}
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Ready to try again?</h2>
              <p className="text-muted-foreground">Choose the plan that works best for you</p>
            </div>
            
            {/* Single Premium Plan Card */}
            <Card className="relative border-2 hover:shadow-lg transition-shadow">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Most Popular
                </div>
              </div>
              
              <CardContent className="pt-8 pb-6">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    <Crown className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Premium Subscription</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">$10.99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Unlimited access to all categories</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">View all search results (no 3 product limit)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Priority AI analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Advanced filtering and sorting</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Cancel anytime</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleTryAgain}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  Upgrade to Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}