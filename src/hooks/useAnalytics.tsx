import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Analytics event types
export type AnalyticsEventType = 
  | 'unlock_attempt'
  | 'checkout_started' 
  | 'checkout_success'
  | 'checkout_cancelled'
  | 'content_unlocked'
  | 'subscription_active'
  | 'product_view'
  | 'search_performed'
  | 'category_interest'
  | 'affiliate_click'
  | 'upgrade_prompt_shown'
  | 'free_limit_reached';

// Content interaction types
export type InteractionType = 
  | 'content_view'
  | 'unlock_prompt_shown'
  | 'unlock_attempt'
  | 'content_unlocked'
  | 'category_blocked'
  | 'search_blocked'
  | 'product_limit_reached';

interface AnalyticsEventData {
  category?: string;
  product_id?: string;
  amount?: number;
  currency?: string;
  plan_type?: string;
  source?: string;
  search_query?: string;
  total_results?: number;
  user_limit?: number;
  [key: string]: any;
}

interface InteractionData {
  category?: string;
  product_id?: string;
  product_title?: string;
  limit_reached?: boolean;
  subscription_status?: string;
  [key: string]: any;
}

export function useAnalytics() {
  const { user, session } = useAuth();
  const sessionIdRef = useRef<string>();

  // Generate or get session ID
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  const trackEvent = useCallback(async (
    eventType: AnalyticsEventType,
    eventData: AnalyticsEventData = {}
  ) => {
    try {
      const event = {
        user_id: user?.id || null,
        event_name: eventType,
        event_data: {
          ...eventData,
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          page_title: document.title,
        },
        session_id: sessionIdRef.current,
        user_agent: navigator.userAgent,
        ip_address: null, // Will be handled by database if needed
      };

      // Send to new analytics_events table
      const { error } = await supabase
        .from('analytics_events')
        .insert([event]);

      if (error) {
        console.error('Analytics tracking error:', error);
      }

      // Also send to legacy subscription_events table for backward compatibility
      const legacyEvent = {
        user_id: user?.id || null,
        event_type: eventType,
        event_data: eventData,
        session_id: sessionIdRef.current,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
      };

      await supabase
        .from('subscription_events')
        .insert([legacyEvent])
        .then(({ error }) => {
          if (error) console.warn('Legacy analytics tracking warning:', error);
        });

    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }, [user?.id]);

  const trackInteraction = useCallback(async (
    interactionType: InteractionType,
    contentType: string,
    contentId: string,
    metadata: InteractionData = {}
  ) => {
    try {
      const interaction = {
        user_id: user?.id || null,
        interaction_type: interactionType,
        content_type: contentType,
        content_id: contentId,
        metadata: metadata,
        session_id: sessionIdRef.current,
      };

      // Send to Supabase
      const { error } = await supabase
        .from('user_interactions')
        .insert([interaction]);

      if (error) {
        console.error('Interaction tracking error:', error);
      }
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }, [user?.id]);

  const trackAffiliateClick = useCallback(async (
    productId: string,
    retailer: string,
    subscriptionStatus: string = 'free',
    conversionValue: number = 0
  ) => {
    try {
      const { error } = await supabase
        .from('affiliate_clicks')
        .insert([{
          user_id: user?.id || null,
          product_id: productId,
          subscription_status: subscriptionStatus,
          conversion_value: conversionValue,
          session_id: sessionIdRef.current,
        }]);

      if (error) {
        console.error('Affiliate click tracking error:', error);
      }

      // Also track as analytics event with retailer info
      await trackEvent('affiliate_click', {
        product_id: productId,
        retailer,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
        subscription_status: subscriptionStatus,
        conversion_value: conversionValue,
      });
    } catch (error) {
      console.error('Failed to track affiliate click:', error);
    }
  }, [user?.id, trackEvent]);

  // Convenience methods for common events
  const trackUnlockAttempt = useCallback((category: string, planType: string) => {
    return trackEvent('unlock_attempt', { 
      category, 
      plan_type: planType,
      user_id: user?.id 
    });
  }, [trackEvent, user?.id]);

  const trackCheckoutStarted = useCallback((price: number, category: string, method: 'one-time' | 'subscription') => {
    return trackEvent('checkout_started', { 
      price,
      category, 
      method,
      currency: 'usd' 
    });
  }, [trackEvent]);

  const trackCheckoutSuccess = useCallback((type: string, price: number) => {
    return trackEvent('checkout_success', { 
      type,
      price,
      user_id: user?.id,
      timestamp: new Date().toISOString(),
      currency: 'usd' 
    });
  }, [trackEvent, user?.id]);

  const trackContentUnlocked = useCallback((method: string, category: string) => {
    return trackEvent('content_unlocked', { 
      method,
      category,
      user_id: user?.id 
    });
  }, [trackEvent, user?.id]);

  const trackSubscriptionActive = useCallback((plan: string) => {
    return trackEvent('subscription_active', { 
      plan,
      user_id: user?.id,
      timestamp: new Date().toISOString() 
    });
  }, [trackEvent, user?.id]);

  const trackCheckoutCancelled = useCallback((type: 'subscription' | 'unlock', category?: string) => {
    return trackEvent('checkout_cancelled', { 
      plan_type: type, 
      category 
    });
  }, [trackEvent]);

  const trackProductView = useCallback((productId: string, category?: string) => {
    return trackEvent('product_view', { product_id: productId, category });
  }, [trackEvent]);

  const trackSearchPerformed = useCallback((query: string, totalResults: number, userLimit?: number) => {
    return trackEvent('search_performed', { 
      search_query: query, 
      total_results: totalResults,
      user_limit: userLimit 
    });
  }, [trackEvent]);

  const trackUpgradePromptShown = useCallback((location: string, category?: string) => {
    return trackEvent('upgrade_prompt_shown', { source: location, category });
  }, [trackEvent]);

  const trackFreeLimitReached = useCallback((limit: number, totalAvailable: number) => {
    return trackEvent('free_limit_reached', { 
      user_limit: limit, 
      total_results: totalAvailable 
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackInteraction,
    trackAffiliateClick,
    trackUnlockAttempt,
    trackCheckoutStarted,
    trackCheckoutSuccess,
    trackCheckoutCancelled,
    trackContentUnlocked,
    trackSubscriptionActive,
    trackProductView,
    trackSearchPerformed,
    trackUpgradePromptShown,
    trackFreeLimitReached,
    sessionId: sessionIdRef.current,
  };
}