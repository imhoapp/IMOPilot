import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionFlow } from '@/hooks/useSubscriptionFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Crown, Sparkles, ArrowLeft, Check, Zap } from 'lucide-react';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createCheckoutSession } = useSubscriptionFlow();

  useEffect(() => {
    const initiateCheckout = async () => {
      // Wait for auth to load
      if (authLoading) return;

      // Redirect to auth if not authenticated
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get checkout parameters from URL
      const urlParams = new URLSearchParams(location.search);
      const type = urlParams.get('type') as 'subscription' | 'unlock';
      const category = urlParams.get('category');

      if (type) {
        // Small delay to ensure user state is fully loaded
        setTimeout(async () => {
          await createCheckoutSession(type, category || undefined);
        }, 1000);
      } else {
        navigate('/');
      }
    };

    initiateCheckout();
  }, [user, authLoading, location.search, createCheckoutSession, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/10 to-background">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Authenticating...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const urlParams = new URLSearchParams(location.search);
  const type = urlParams.get('type');
  const category = urlParams.get('category');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Product Info */}
          <Card className="shadow-xl border-0 bg-gradient-to-br from-card to-card/80">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center">
                {type === 'subscription' ? (
                  <Crown className="h-10 w-10 text-primary" />
                ) : (
                  <Sparkles className="h-10 w-10 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {type === 'subscription' ? 'Premium Subscription' : `Unlock ${category} Category`}
              </CardTitle>
              <p className="text-muted-foreground">
                {type === 'subscription' 
                  ? 'Get unlimited access to all features' 
                  : `Get lifetime access to ${category} products`
                }
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Price */}
              <div className="text-center p-6 bg-muted/30 rounded-xl">
                <div className="text-3xl font-bold mb-1">
                  {type === 'subscription' ? '$10.99' : '$4.99'}
                </div>
                <p className="text-muted-foreground">
                  {type === 'subscription' ? 'per month' : 'one-time payment'}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <h4 className="font-semibold mb-3">What's included:</h4>
                {type === 'subscription' ? (
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Unlimited access to all categories</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">View unlimited products per search</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Priority AI analysis & insights</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Advanced filtering & sorting</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Cancel anytime</span>
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Full access to {category} category</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">View all products in category</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Advanced AI insights & rankings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Lifetime access</span>
                    </li>
                  </ul>
                )}
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  🔒 Secure payment powered by Stripe
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Right Side - Loading */}
          <Card className="shadow-xl border-0 bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 h-12 w-12 border-4 border-transparent border-r-primary/30 rounded-full animate-[spin_2s_linear_infinite]"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Setting up your checkout...</h3>
                <p className="text-muted-foreground">
                  You'll be redirected to complete your purchase securely
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>This usually takes just a moment</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}