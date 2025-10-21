import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpgradeCallToActionProps {
  title?: string;
  description?: string;
  showStats?: boolean;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export function UpgradeCallToAction({
  title = "Unlock Premium Features",
  description = "Get unlimited access to all products and categories",
  showStats = true,
  variant = 'horizontal',
  className = ''
}: UpgradeCallToActionProps) {
  const { hasActiveSubscription } = useUserAccess();
  const { session } = useAuth();
  const { toast } = useToast();

  if (hasActiveSubscription) {
    return null;
  }

  const handleUpgrade = async () => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Please log in to upgrade to premium.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { 
          type: 'subscription',
          redirect_url: window.location.href
        },
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

  const stats = [
    { icon: TrendingUp, label: "Unlimited Products", value: "∞" },
    { icon: Users, label: "All Categories", value: "10+" },
    { icon: Crown, label: "Premium Analysis", value: "AI" }
  ];

  if (variant === 'vertical') {
    return (
      <Card className={`bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 ${className}`}>
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Crown className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
          </div>

          {showStats && (
            <div className="grid grid-cols-3 gap-4 py-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleUpgrade} className="w-full bg-gradient-primary" size="lg">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade for $10.99/month
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Horizontal variant
  return (
    <Card className={`bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {showStats && (
              <div className="hidden md:flex items-center space-x-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center space-x-1">
                      <stat.icon className="h-4 w-4 text-primary" />
                      <span className="font-bold">{stat.value}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
            
            <Button onClick={handleUpgrade} className="bg-gradient-primary">
              <Crown className="mr-2 h-4 w-4" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}