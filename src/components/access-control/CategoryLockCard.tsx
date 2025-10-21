import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Sparkles, CheckCircle } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CategoryLockCardProps {
  category: string;
  productCount?: number;
  className?: string;
}

export function CategoryLockCard({ 
  category, 
  productCount, 
  className = '' 
}: CategoryLockCardProps) {
  const { canAccessCategory, hasActiveSubscription } = useUserAccess();
  const { session } = useAuth();
  const { toast } = useToast();

  const hasAccess = canAccessCategory(category);

  const handleUnlock = async (type: 'subscription' | 'unlock') => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Please log in to unlock categories.",
        variant: "destructive",
      });
      return;
    }

    try {
      const requestBody = type === 'unlock' 
        ? { 
            type: 'unlock', 
            category,
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

  if (hasAccess) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">{category}</h4>
                {productCount && (
                  <p className="text-sm text-green-700">{productCount} products available</p>
                )}
              </div>
            </div>
            <div className="text-sm font-medium text-green-600">Unlocked</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-gray-200 bg-gray-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-gray-400" />
            <div>
              <h4 className="font-medium text-gray-900">{category}</h4>
              {productCount && (
                <p className="text-sm text-gray-600">{productCount} products locked</p>
              )}
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            {!hasActiveSubscription && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleUnlock('unlock')}
                  className="text-xs"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  $4.99
                </Button>
                <div className="text-xs text-center text-gray-500">or</div>
                <Button 
                  size="sm"
                  onClick={() => handleUnlock('subscription')}
                  className="text-xs"
                >
                  <Crown className="mr-1 h-3 w-3" />
                  Premium
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}