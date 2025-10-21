import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Crown, Star, Calendar, Settings, CreditCard, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { useSubscriptionFlow } from '@/hooks/useSubscriptionFlow';
import { GracePeriodBanner } from '@/components/subscription/GracePeriodBanner';

export function SubscriptionManagement() {
  const { 
    hasActiveSubscription, 
    subscription, 
    unlockedCategories, 
    unlockedSearches,
    loading, 
    error,
    refreshAccess 
  } = useUserAccess();
  const { session } = useAuth();
  const { toast } = useToast();
  const { manageSubscription, loading: flowLoading } = useSubscriptionFlow();


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading subscription status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Error Loading Subscription</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={refreshAccess} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if subscription is in grace period
  const isInGracePeriod = subscription && 
    !hasActiveSubscription && 
    subscription.status === 'past_due' &&
    new Date(subscription.current_period_end) > new Date();

  return (
    <div className="space-y-6">
      {/* Grace Period Banner */}
      <GracePeriodBanner />
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasActiveSubscription ? (
              <Crown className="h-5 w-5 text-yellow-500" />
            ) : (
              <Star className="h-5 w-5" />
            )}
            Current Plan
          </CardTitle>
          <CardDescription>
            Your current subscription status and benefits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge 
                  variant={hasActiveSubscription ? "default" : "secondary"}
                  className={hasActiveSubscription ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white" : ""}
                >
                  {hasActiveSubscription ? (
                    <>
                      <Crown className="mr-1 h-3 w-3" />
                      Premium
                    </>
                  ) : (
                    <>
                      <Star className="mr-1 h-3 w-3" />
                      Free
                    </>
                  )}
                </Badge>
                {hasActiveSubscription && !subscription?.cancel_at_period_end && (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                )}
                {hasActiveSubscription && subscription?.cancel_at_period_end && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Cancelling
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {hasActiveSubscription && subscription?.cancel_at_period_end
                  ? `Your subscription will be cancelled on ${formatDate(subscription.current_period_end)}`
                  : hasActiveSubscription
                  ? "You have access to all premium features"
                  : "Limited access - upgrade to unlock all features"
                }
              </p>
            </div>
            
            {(hasActiveSubscription || isInGracePeriod) && (
              <Button 
                onClick={manageSubscription}
                disabled={flowLoading}
                variant={isInGracePeriod ? "destructive" : "outline"}
                size="sm"
              >
                {flowLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isInGracePeriod ? (
                  <AlertTriangle className="mr-2 h-4 w-4" />
                ) : (
                  <Settings className="mr-2 h-4 w-4" />
                )}
                {isInGracePeriod ? 'Fix Payment' : 'Manage Subscription'}
              </Button>
            )}
          </div>

          {hasActiveSubscription && subscription && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Plan Type</p>
                  <p className="text-muted-foreground capitalize">{subscription.plan_type}</p>
                </div>
                <div>
                  <p className="font-medium">Next Billing</p>
                  <p className="text-muted-foreground flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlocks Card - Only show for non-premium users */}
      {!hasActiveSubscription && (unlockedCategories.length > 0 || unlockedSearches.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Your Unlocks
            </CardTitle>
            <CardDescription>
              Searches and categories you've purchased individual access to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unlockedSearches.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-sm">Unlocked Searches</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unlockedSearches.map((search) => (
                    <Badge key={search} variant="outline" className="justify-start py-2 px-3 text-xs">
                      <CheckCircle className="mr-1 h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="truncate">{search}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {unlockedCategories.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-sm">Unlocked Categories</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {unlockedCategories.map((category) => (
                    <Badge key={category} variant="outline" className="justify-center py-2">
                      <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upgrade/Subscription Plans */}
      {!hasActiveSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Upgrade Your Plan
            </CardTitle>
            <CardDescription>
              Choose the perfect plan for your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionPlans showCategoryUnlock={false} />
          </CardContent>
        </Card>
      )}

      {/* Features Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
          <CardDescription>
            Compare what's included in each plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Star className="mr-1 h-4 w-4" />
                  Free Plan
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• View up to 3 products per search</li>
                  <li>• Basic product information</li>
                  <li>• Limited category access</li>
                  <li>• Standard support</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Crown className="mr-1 h-4 w-4 text-yellow-500" />
                  Premium Plan
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Unlimited product views</li>
                  <li>• Advanced AI analysis</li>
                  <li>• All categories unlocked</li>
                  <li>• Priority support</li>
                  <li>• Advanced filtering</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}