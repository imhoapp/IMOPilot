import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useParallax } from "@/hooks/useParallax";
import { motion } from "framer-motion";
import { FeaturedProductsSection } from "@/components/home/featured-products";
import { ProblemStatementSection } from "@/components/home/problem-statement";
import { FeaturesSection } from "@/components/home/features-section";
import { TestimonialSection } from "@/components/home/testimonials";
import { ComparisonSection } from "@/components/features/comparison";
import { FaqSection } from "@/components/home/faq";
import { PricingSection } from "@/components/home/pricing";
import { HeroSection } from "@/components/features/hero";
import { UnlockPrompt } from "@/components/subscription/UnlockPrompt";
import { OnboardingFlow } from "@/components/subscription/OnboardingFlow";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useAuth } from "@/hooks/useAuth";
import { getAppConfig } from "@/utils/appConfig";

const Index = () => {
  useParallax();
  const { hasActiveSubscription } = useUserAccess();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const initializeOnboarding = async () => {
      if (user) {
        const hasSeenOnboarding = localStorage.getItem(`hasSeenOnboarding_${user.id}`);
        if (!hasSeenOnboarding) {
          // Check backend config to see if onboarding should be shown
          const config = await getAppConfig();
          if (config.showOnboarding) {
            setShowOnboarding(true);
          }
        }
      }
    };

    initializeOnboarding();
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      // Store user-specific onboarding completion
      localStorage.setItem(`hasSeenOnboarding_${user.id}`, 'true');
    }
    setShowOnboarding(false);
  };
  
  return (
    <div style={{
      background: 'linear-gradient(-45deg, rgba(255,255,255,1), rgba(245,245,245,0.9), rgba(230,230,230,0.8), rgba(255,255,255,1))',
      backgroundSize: '400% 400%',
      animation: 'gradient-shift 12s ease infinite'
    }}>
      {/* Main content */}
      <div className="relative">

        {/* Hero Section */}
        <HeroSection />
        
        {/* Mobile App Sections - Card-based Layout */}
        <div className="md:hidden space-y-4 px-4 pb-8">
          <ProblemStatementSection />
          <FeaturedProductsSection />
          <FeaturesSection />
          <PricingSection />
          <TestimonialSection />
          <ComparisonSection />
        </div>

        {/* Desktop Sections with Separators */}
        <div className="hidden md:block">
          {/* Section Separator */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Separator className="opacity-30" />
          </div>
          
          {/* Problem Statement Section */}
          <ProblemStatementSection />
          
          {/* Section Separator */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Separator className="opacity-30" />
          </div>

          {/* Featured Products */}
          <FeaturedProductsSection />
          
          {/* Section Separator */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Separator className="opacity-30" />
          </div>
          
          {/* Features Section */}
          <FeaturesSection />
          
          {/* Section Separator */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Separator className="opacity-30" />
          </div>
          
          {/* Pricing Section */}
          <PricingSection />
          
          {/* Section Separator */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Separator className="opacity-30" />
          </div>
          
          {/* Testimonials Section */}
          <TestimonialSection />
          
          {/* Section Separator */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Separator className="opacity-30" />
          </div>
          
          {/* Comparison Section */}
          <ComparisonSection />
          
          {/* Section Separator */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Separator className="opacity-30" />
          </div>
        </div>
        
        {/* Upgrade Prompt for Free Users */}
        {!hasActiveSubscription && (
          <>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <UnlockPrompt 
                variant="banner" 
                message="Ready to unlock unlimited product insights?"
                showBoth={false}
                className="mb-8"
              />
            </div>
            
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <Separator className="opacity-30" />
            </div>
          </>
        )}
        
        {/* FAQ Section */}
        <FaqSection />
      </div>
      
      <OnboardingFlow
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};

export default Index;
