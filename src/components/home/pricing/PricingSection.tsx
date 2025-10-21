import { Check, Crown, Sparkles, Star, Zap, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useSubscriptionFlow } from '@/hooks/useSubscriptionFlow';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export function PricingSection() {
  const { hasActiveSubscription } = useUserAccess();
  const { createCheckoutSession, loading } = useSubscriptionFlow();
  const { user } = useAuth();
  const [loadingType, setLoadingType] = useState<'subscription' | 'unlock' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleUnlockSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }
    setLoadingType('unlock');
    try {
      await createCheckoutSession('unlock', searchQuery.trim());
    } finally {
      setLoadingType(null);
    }
  };

  const handleSubscribe = async (type: 'subscription') => {
    setLoadingType(type);
    try {
      await createCheckoutSession(type);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <section className="py-24 bg-gradient-to-br from-muted/30 via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-6 px-4 py-2">
            <Sparkles className="mr-2 h-4 w-4" />
            Flexible Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Choose What Works for You
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Start free, unlock categories as needed, or go unlimited. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Three-Tier Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Free Tier */}
          <Card className="relative border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl mb-2">Free Forever</CardTitle>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">always</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>View top 3 products per category</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Basic AI product insights</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Product ratings and reviews</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Video product previews</span>
                </li>
              </ul>
              
              {user && !hasActiveSubscription ? (
                <Button variant="outline" className="w-full" disabled>
                  <Star className="mr-2 h-4 w-4" />
                  Current Plan
                </Button>
              ) : !user ? (
                <Button variant="outline" className="w-full" disabled>
                  <Star className="mr-2 h-4 w-4" />
                  Free Plan
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  <Star className="mr-2 h-4 w-4" />
                  Free Plan
                </Button>
              )}
              
              <p className="text-sm text-center text-muted-foreground">
                Perfect for casual browsing
              </p>
            </CardContent>
          </Card>

          {/* Pay-Per-Category */}
          <Card className="relative border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-background hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl mb-2">Pay-as-you-Go</CardTitle>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-bold">$4.99</span>
                <span className="text-muted-foreground">per category</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Unlock full search results</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>View all products for your search</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Advanced AI insights & rankings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Lifetime access to search results</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>No recurring charges</span>
                </li>
              </ul>
              
              <div className="space-y-3">
                <Input
                  placeholder="Enter your search query (e.g. 'wireless headphones')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleUnlockSearch}
                  disabled={loadingType !== null || !searchQuery.trim()}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Unlock Search Results
                </Button>
              </div>
              
              <p className="text-sm text-center text-muted-foreground">
                Great for specific research
              </p>
            </CardContent>
          </Card>

          {/* Premium Subscription */}
          <Card className="relative border-2 border-yellow-300 bg-gradient-to-br from-yellow-50/50 via-orange-50/30 to-background hover:shadow-xl transition-all duration-300 scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1.5 text-sm font-medium">
                <Crown className="mr-1 h-4 w-4" />
                Most Popular
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-8 pt-8">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Crown className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl mb-2">Premium Unlimited</CardTitle>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-bold">$10.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Unlimited access to all categories</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>View unlimited products per search</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Priority AI analysis & insights</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Advanced filtering & sorting</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Cancel anytime, no commitment</span>
                </li>
              </ul>
              
              {hasActiveSubscription ? (
                <Button disabled className="w-full bg-gradient-to-r from-yellow-500 to-orange-500">
                  <Crown className="mr-2 h-4 w-4" />
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  onClick={() => handleSubscribe('subscription')}
                  disabled={loadingType !== null}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Start Premium
                </Button>
              )}
              
              <p className="text-sm text-center text-muted-foreground">
                Best value for power users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Value Proposition */}
        <div className="text-center space-y-8">
          <h3 className="text-2xl font-semibold">Why Choose IMO?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center space-y-4 p-6">
              <div className="p-4 bg-blue-100 rounded-full">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold">AI-Powered Insights</h4>
              <p className="text-muted-foreground text-center leading-relaxed">
                Get intelligent product analysis and comparisons powered by advanced AI
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 p-6">
              <div className="p-4 bg-green-100 rounded-full">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold">No Hidden Fees</h4>
              <p className="text-muted-foreground text-center leading-relaxed">
                Transparent pricing with no surprise charges. Pay only for what you need
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 p-6">
              <div className="p-4 bg-purple-100 rounded-full">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold">Instant Access</h4>
              <p className="text-muted-foreground text-center leading-relaxed">
                Unlock content immediately after purchase. Start exploring right away
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}