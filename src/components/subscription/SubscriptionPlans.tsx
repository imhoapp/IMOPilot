import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Check, Zap, Loader2 } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useSubscriptionFlow } from '@/hooks/useSubscriptionFlow';
import { useState } from 'react';

interface SubscriptionPlansProps {
  className?: string;
  category?: string; // For category-specific unlocks
  showCategoryUnlock?: boolean;
}

export function SubscriptionPlans({ 
  className = '', 
  category,
  showCategoryUnlock = true 
}: SubscriptionPlansProps) {
  const { hasActiveSubscription, canAccessCategory } = useUserAccess();
  const { createCheckoutSession, loading } = useSubscriptionFlow();
  const [loadingType, setLoadingType] = useState<'subscription' | 'unlock' | null>(null);

  const handleSubscribe = async (type: 'subscription' | 'unlock') => {
    setLoadingType(type);
    try {
      await createCheckoutSession(type, category);
    } finally {
      setLoadingType(null);
    }
  };

  const categoryUnlocked = category ? canAccessCategory(category) : false;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto ${className}`}>
      {/* Category Unlock Plan */}
      {showCategoryUnlock && category && (
        <Card className={`relative ${categoryUnlocked ? 'border-green-200 bg-green-50' : 'hover:shadow-lg transition-shadow'}`}>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2">
              {categoryUnlocked ? (
                <Check className="h-8 w-8 text-green-600" />
              ) : (
                <Sparkles className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <CardTitle className="text-xl">
              {category} Category
            </CardTitle>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl font-bold">$4.99</span>
              <span className="text-muted-foreground">one-time</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Unlimited access to {category} products</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Detailed product analysis</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Reviews and ratings</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Lifetime access to category</span>
              </li>
            </ul>
            
            {categoryUnlocked ? (
              <Button disabled className="w-full">
                <Check className="mr-2 h-4 w-4" />
                Unlocked
              </Button>
            ) : (
              <Button 
                onClick={() => handleSubscribe('unlock')}
                className="w-full"
                variant="outline"
                disabled={loadingType === 'unlock'}
              >
                {loadingType === 'unlock' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {loadingType === 'unlock' ? 'Processing...' : 'Unlock Category'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Premium Subscription Plan */}
      <Card className={`relative ${hasActiveSubscription ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-primary bg-gradient-to-br from-primary/5 to-secondary/5 hover:shadow-lg transition-shadow'}`}>
        {!hasActiveSubscription && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-gradient-primary text-primary-foreground px-4 py-1">
              <Crown className="mr-1 h-3 w-3" />
              Most Popular
            </Badge>
          </div>
        )}
        
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <Crown className={`h-8 w-8 ${hasActiveSubscription ? 'text-yellow-600' : 'text-primary'}`} />
          </div>
          <CardTitle className="text-xl">
            Premium Subscription
          </CardTitle>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-3xl font-bold">$10.99</span>
            <span className="text-muted-foreground">/month</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Unlimited access to all categories</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">View all search results (no 3 product limit)</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Priority AI analysis</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Advanced filtering and sorting</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Cancel anytime</span>
            </li>
          </ul>
          
          {hasActiveSubscription ? (
            <div className="space-y-2">
              <Button disabled className="w-full">
                <Crown className="mr-2 h-4 w-4" />
                Current Plan
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Active premium subscription
              </p>
            </div>
          ) : (
            <Button 
              onClick={() => handleSubscribe('subscription')}
              className="w-full bg-gradient-primary hover:shadow-lg"
              disabled={loadingType === 'subscription'}
            >
              {loadingType === 'subscription' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {loadingType === 'subscription' ? 'Processing...' : 'Upgrade to Premium'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}