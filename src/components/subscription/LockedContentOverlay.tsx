import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Eye, EyeOff } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface LockedContentOverlayProps {
  children: ReactNode;
  isLocked: boolean;
  title?: string;
  description?: string;
  category?: string;
  requiresSubscription?: boolean;
  blurIntensity?: 'light' | 'medium' | 'heavy';
  className?: string;
}

export function LockedContentOverlay({
  children,
  isLocked,
  title = "Content Locked",
  description,
  category,
  requiresSubscription = false,
  blurIntensity = 'medium',
  className = ''
}: LockedContentOverlayProps) {
  const { hasActiveSubscription } = useUserAccess();
  const { session } = useAuth();
  const { toast } = useToast();

  const blurClasses = {
    light: 'filter blur-sm',
    medium: 'filter blur-md',
    heavy: 'filter blur-lg'
  };

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
      const requestBody = type === 'unlock' && category 
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

  if (!isLocked) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className={`${blurClasses[blurIntensity]} pointer-events-none select-none opacity-60`}>
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="max-w-sm w-full shadow-lg border-2">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-muted rounded-full">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {description || (
                  requiresSubscription 
                    ? "This content requires a premium subscription to view."
                    : category 
                      ? `Unlock the ${category} category to view this content.`
                      : "This content is locked. Upgrade to access."
                )}
              </p>
            </div>

            <div className="space-y-2">
              {!hasActiveSubscription && (
                <>
                  <Button 
                    onClick={() => handleUnlock('subscription')}
                    className="w-full"
                    size="sm"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Get Premium - $10.99/month
                  </Button>
                  
                  {category && !requiresSubscription && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            or
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => handleUnlock('unlock')}
                        className="w-full"
                        size="sm"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Unlock {category} - $4.99
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}