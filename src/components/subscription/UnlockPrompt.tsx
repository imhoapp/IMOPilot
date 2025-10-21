import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Sparkles, ArrowRight, Star } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

interface UnlockPromptProps {
  variant?: 'banner' | 'card' | 'inline';
  category?: string;
  showBoth?: boolean; // Show both subscription and category unlock options
  className?: string;
  message?: string;
}

export function UnlockPrompt({ 
  variant = 'card',
  category,
  showBoth = true,
  className = '',
  message
}: UnlockPromptProps) {
  const { hasActiveSubscription, canAccessCategory } = useUserAccess();
  const { session } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  // Don't show if user already has access
  if (hasActiveSubscription || (category && canAccessCategory(category))) {
    return null;
  }

  const handleUnlock = async (type: 'subscription' | 'unlock') => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Please log in to unlock content.",
        variant: "destructive",
      });
      return;
    }

    try {
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

  const defaultMessage = message || (
    searchQuery 
      ? `Unlock search "${searchQuery}" to see all results`
      : "Upgrade to premium to unlock all features"
  );

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4 ${className}`}>
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{defaultMessage}</p>
              <p className="text-sm text-muted-foreground">
                Get unlimited access to all products and features
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            {showBoth && searchQuery && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleUnlock('unlock')}
              >
                Unlock "{searchQuery}" - $4.99
              </Button>
            )}
            <Button 
              size="sm"
              onClick={() => handleUnlock('subscription')}
            >
              <Crown className="mr-2 h-4 w-4" />
              Premium - $10.99/mo
            </Button>
          </div>
        </div>

        {/* Mobile App-style Layout */}
        <div className="md:hidden space-y-4">
          <div className="flex items-start space-x-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-base">{defaultMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Get unlimited access to all products and features
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => handleUnlock('subscription')}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-xl h-12 text-base font-medium shadow-lg"
            >
              <Crown className="mr-2 h-5 w-5" />
              Premium - $10.99/mo
            </Button>
            
            {showBoth && searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => handleUnlock('unlock')}
                className="w-full rounded-xl h-10 text-sm"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Just unlock "{searchQuery}" - $4.99
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-4 p-3 bg-muted/50 rounded-lg ${className}`}>
        <Star className="h-4 w-4 text-yellow-500" />
        <span className="text-sm flex-1">{defaultMessage}</span>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => handleUnlock('subscription')}
        >
          Upgrade
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Default card variant
  return (
    <Card className={`border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 ${className}`}>
      <CardContent className="p-6 text-center space-y-4">
        {/* Desktop Layout */}
        <div className="hidden md:block space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Crown className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Unlock Premium Features</h3>
            <p className="text-sm text-muted-foreground">
              {defaultMessage}
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => handleUnlock('subscription')}
              className="w-full"
            >
              <Crown className="mr-2 h-4 w-4" />
              Get Premium - $10.99/month
            </Button>
            
            {showBoth && searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => handleUnlock('unlock')}
                className="w-full"
                size="sm"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Just unlock "{searchQuery}" - $4.99
              </Button>
            )}
          </div>
        </div>

        {/* Mobile App-style Layout */}
        <div className="md:hidden space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl">
              <Crown className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground">Ready to unlock unlimited product insights?</h3>
            <p className="text-muted-foreground leading-relaxed">
              {defaultMessage}
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => handleUnlock('subscription')}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-xl h-12 text-base font-semibold shadow-lg"
            >
              <Crown className="mr-2 h-5 w-5" />
              Premium - $10.99/mo
            </Button>
            
            {showBoth && searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => handleUnlock('unlock')}
                className="w-full rounded-xl h-10"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Just unlock "{searchQuery}" - $4.99
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}