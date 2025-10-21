import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useSubscriptionFlow } from '@/hooks/useSubscriptionFlow';

export function GracePeriodBanner() {
  const { subscription, hasActiveSubscription } = useUserAccess();
  const { manageSubscription, loading } = useSubscriptionFlow();
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Check if user is in grace period (subscription exists but payment failed)
  const isInGracePeriod = subscription && 
    !hasActiveSubscription && 
    subscription.status === 'past_due' &&
    new Date(subscription.current_period_end) > new Date();

  useEffect(() => {
    if (!isInGracePeriod) return;

    const updateTimeLeft = () => {
      const endDate = new Date(subscription.current_period_end);
      const now = new Date();
      const timeDiff = endDate.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setTimeLeft(`${days} day${days > 1 ? 's' : ''}`);
      } else {
        setTimeLeft(`${hours} hour${hours > 1 ? 's' : ''}`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isInGracePeriod, subscription]);

  if (!isInGracePeriod) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 mb-6">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div>
            <div className="font-medium text-amber-800 mb-1">
              Payment Issue - Premium Access Ending Soon
            </div>
            <div className="text-sm text-amber-700 mb-2">
              We couldn't process your payment. Update your payment method to continue enjoying premium features.
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                <Clock className="mr-1 h-3 w-3" />
                {timeLeft} remaining
              </Badge>
              <span className="text-xs text-amber-600">
                Until {new Date(subscription.current_period_end).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <Button
          onClick={manageSubscription}
          disabled={loading}
          className="ml-4 bg-amber-600 hover:bg-amber-700 text-white"
          size="sm"
        >
          <CreditCard className="mr-1 h-3 w-3" />
          {loading ? 'Opening...' : 'Update Payment'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}