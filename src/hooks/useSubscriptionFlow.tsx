import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionFlowState {
  loading: boolean;
  error: string | null;
  checkoutUrl: string | null;
}

export function useSubscriptionFlow() {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { refreshAccess } = useUserAccess();
  const { trackCheckoutStarted, trackCheckoutSuccess, trackCheckoutCancelled } = useAnalytics();
  const { toast } = useToast();
  
  const [state, setState] = useState<SubscriptionFlowState>({
    loading: false,
    error: null,
    checkoutUrl: null,
  });

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error(`Error in ${operation}:`, error);
    
    setState(prev => ({
      ...prev,
      loading: false,
      error: errorMessage,
    }));

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const createCheckoutSession = useCallback(async (
    type: 'subscription' | 'unlock',
    searchQuery?: string
  ) => {
    if (!session) {
      // Store the intended action for after login
      const redirectPath = type === 'subscription' ? '/checkout?type=subscription' : `/checkout?type=unlock&search_query=${searchQuery || ''}`;
      localStorage.setItem('redirectAfterAuth', redirectPath);
      
      // Navigate to auth page
      navigate('/auth');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Track analytics
      const amount = type === 'subscription' ? 10.99 : 4.99;
      if (type === 'unlock' && searchQuery) {
        await trackCheckoutStarted(amount, searchQuery, 'one-time');
      } else {
        await trackCheckoutStarted(amount, 'subscription', 'subscription');
      }

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

      setState(prev => ({
        ...prev,
        loading: false,
        checkoutUrl: data.url,
      }));

      // Navigate to checkout in same page
      toast({
        title: "Redirecting to Checkout",
        description: "Taking you to secure payment...",
      });

      // Navigate to Stripe checkout in same page
      window.location.href = data.url;
      return data.url;

    } catch (error) {
      handleError(error, 'creating checkout session');
      return null;
    }
  }, [session, trackCheckoutStarted, handleError, toast, navigate]);

  const handlePaymentSuccess = useCallback(async (type: 'subscription' | 'unlock', searchQuery?: string, sessionId?: string) => {
    try {
      // Track successful payment
      const amount = type === 'subscription' ? 10.99 : 4.99;
      await trackCheckoutSuccess(type, amount);

      // Verify payment and record unlock securely on backend
      if (sessionId) {
        try {
          console.log("Verifying payment with session ID:", sessionId);
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: {
              session_id: sessionId,
            },
          });

          if (verifyError) {
            console.error('Error verifying payment:', verifyError);
            toast({
              title: "Payment Verification Failed",
              description: "Your payment was successful, but we couldn't verify it immediately. Please contact support if issues persist.",
              variant: "destructive",
            });
          } else {
            console.log('Payment verified and unlock recorded successfully:', verifyData);
          }
        } catch (verifyError) {
          console.error('Error calling verify-payment function:', verifyError);
          toast({
            title: "Payment Verification Error",
            description: "Your payment was successful, but we couldn't verify it immediately. Please refresh the page or contact support.",
            variant: "destructive",
          });
          // Don't fail the flow if verification fails
        }
      }

      // Send welcome email
      if (user?.email) {
        try {
          await supabase.functions.invoke('send-subscription-emails', {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: {
              type: type === 'subscription' ? 'subscription_active' : 'welcome',
              userEmail: user.email,
              userName: user.user_metadata?.full_name || user.email?.split('@')[0],
              planType: 'Premium',
              amount: amount,
            },
          });
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
          // Don't fail the flow if email fails
        }
      }

      // Refresh access data
      await refreshAccess();

      toast({
        title: "Payment Successful!",
        description: type === 'subscription' 
          ? "Welcome to Premium! You now have unlimited access." 
          : `Search "${searchQuery}" unlocked!`,
      });

    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  }, [user, session, trackCheckoutSuccess, refreshAccess, toast]);

  const handlePaymentCancelled = useCallback(async (type: 'subscription' | 'unlock', searchQuery?: string) => {
    try {
      await trackCheckoutCancelled(type, searchQuery);
      
      toast({
        title: "Payment Cancelled",
        description: "You can try again anytime from your profile.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error handling payment cancellation:', error);
    }
  }, [trackCheckoutCancelled, toast]);

  const manageSubscription = useCallback(async () => {
    if (!session) {
      // Store the intended action for after login
      localStorage.setItem('redirectAfterAuth', '/profile');
      
      // Navigate to auth page
      navigate('/auth');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setState(prev => ({ ...prev, loading: false }));
      
      toast({
        title: "Opening Subscription Manager",
        description: "Redirecting to Stripe Customer Portal...",
      });

      // Open Stripe customer portal in a new tab
      window.open(data.url, '_blank');

    } catch (error) {
      handleError(error, 'opening customer portal');
    }
  }, [session, handleError, toast, navigate]);

  return {
    ...state,
    createCheckoutSession,
    handlePaymentSuccess,
    handlePaymentCancelled,
    manageSubscription,
    clearError,
  };
}