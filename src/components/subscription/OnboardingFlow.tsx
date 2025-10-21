import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Star, Sparkles, ArrowRight, Check, Gift, Zap } from 'lucide-react';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { getAppConfig, type AppConfig } from '@/utils/appConfig';

interface OnboardingFlowProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const getSteps = (appName: string) => [
  {
    title: `Welcome to ${appName}!`,
    description: "Discover the best products with AI-powered analysis",
    icon: Gift,
  },
  {
    title: "How Our Pricing Works",
    description: "Flexible options to match your needs",
    icon: Crown,
  },
  {
    title: "Choose Your Plan",
    description: "Start with what works best for you",
    icon: Zap,
  },
];

export function OnboardingFlow({ open, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    getAppConfig().then(setAppConfig);
  }, []);

  const handleNext = () => {
    if (!appConfig) return;
    const steps = getSteps(appConfig.appName);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  if (!appConfig) {
    return null; // Loading state
  }

  const steps = getSteps(appConfig.appName);
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  const CurrentIcon = steps[currentStep].icon;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CurrentIcon className="h-5 w-5 text-primary" />
              {steps[currentStep].title}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          <div className="space-y-2">
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Gift className="h-16 w-16 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Welcome to {appConfig.appName}!</h3>
                <p className="text-muted-foreground text-lg">
                  Your AI-powered companion for finding the perfect products
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Sparkles className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-semibold">AI Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Get intelligent product insights
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <h4 className="font-semibold">Quality Reviews</h4>
                    <p className="text-sm text-muted-foreground">
                      Real reviews and ratings
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Crown className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h4 className="font-semibold">Premium Features</h4>
                    <p className="text-sm text-muted-foreground">
                      Unlock unlimited access
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Flexible Pricing Options</h3>
                <p className="text-muted-foreground text-lg">
                  Choose the option that works best for you
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <Card className="border-2 border-blue-200">
                  <CardHeader className="text-center">
                    <Star className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <CardTitle>Free Tier</CardTitle>
                    <CardDescription>Perfect for trying us out</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        View up to 3 products per search
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Basic product information
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Limited category access
                      </li>
                    </ul>
                    <Badge variant="secondary" className="w-full justify-center">
                      Always Free
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200">
                  <CardHeader className="text-center">
                    <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <CardTitle>Pay-as-you-Go</CardTitle>
                    <CardDescription>Unlock categories individually</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        $4.99 per category
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Lifetime access to category
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        No recurring charges
                      </li>
                    </ul>
                    <Badge variant="outline" className="w-full justify-center">
                      One-time Payment
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 max-w-2xl mx-auto">
                <CardHeader className="text-center">
                  <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <CardTitle>Premium Subscription</CardTitle>
                  <CardDescription>Best value for power users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Unlimited access to all categories
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      View unlimited products per search
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Priority AI analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Cancel anytime
                    </li>
                  </ul>
                  <Badge className="w-full justify-center bg-gradient-to-r from-yellow-500 to-orange-500">
                    <Crown className="mr-1 h-3 w-3" />
                    $10.99/month
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Zap className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Choose Your Plan</h3>
                <p className="text-muted-foreground text-lg">
                  You can always change or upgrade later
                </p>
              </div>
              <div className="flex justify-center">
                <SubscriptionPlans showCategoryUnlock={false} />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't worry - you can start with the free tier and upgrade anytime!
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? (
              "Get Started"
            ) : (
              <>
                Next
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}