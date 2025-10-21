import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserAccess {
  hasActiveSubscription: boolean;
  unlockedSearches: string[];
  unlockedCategories: string[];
  accessLevel: 'basic' | 'premium';
  subscription: {
    id: string;
    status: string;
    current_period_end: string;
    plan_type: string;
    cancel_at_period_end?: boolean;
    canceled_at?: string | null;
  } | null;
  loading: boolean;
  error: string | null;
}

export function useUserAccess() {
  const { user, session } = useAuth();
  const [accessData, setAccessData] = useState<UserAccess>({
    hasActiveSubscription: false,
    unlockedSearches: [],
    unlockedCategories: [],
    accessLevel: 'basic',
    subscription: null,
    loading: true,
    error: null,
  });

  const checkAccess = useCallback(async (retryCount = 0) => {
    if (!user || !session) {
      setAccessData(prev => ({
        ...prev,
        loading: false,
        hasActiveSubscription: false,
        accessLevel: 'basic',
        unlockedSearches: [],
        unlockedCategories: [],
        subscription: null,
      }));
      return;
    }

    try {
      setAccessData(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-subscription-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setAccessData(prev => ({
        ...prev,
        hasActiveSubscription: data.hasActiveSubscription || false,
        unlockedSearches: data.unlockedSearches || [],
        unlockedCategories: data.unlockedCategories || [],
        accessLevel: data.accessLevel || 'basic',
        subscription: data.subscription || null,
        loading: false,
        error: null,
      }));
    } catch (err) {
      console.error('Error checking user access:', err);
      
      // If we're on search page after payment success and it's an auth error, retry once after delay
      const isSearchPage = window.location.pathname.includes('/search');
      const hasPaymentParams = window.location.search.includes('payment_success') || window.location.search.includes('session_id');
      const isAuthError = err instanceof Error && err.message.includes('Authentication error');
      
      if (isSearchPage && hasPaymentParams && isAuthError && retryCount < 1) {
        console.log('Retrying access check after payment success...');
        setTimeout(() => checkAccess(retryCount + 1), 1000);
        return;
      }
      
      setAccessData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to check access',
      }));
    }
  }, [user, session]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Helper functions for access control
  const canAccessSearch = useCallback((searchQuery: string): boolean => {
    if (accessData.hasActiveSubscription) return true;
    return accessData.unlockedSearches.includes(searchQuery);
  }, [accessData.hasActiveSubscription, accessData.unlockedSearches]);

  const canAccessCategory = useCallback((category: string): boolean => {
    if (accessData.hasActiveSubscription) return true;
    return accessData.unlockedCategories.includes(category);
  }, [accessData.hasActiveSubscription, accessData.unlockedCategories]);

  const canAccessPremiumFeatures = useCallback((): boolean => {
    return accessData.hasActiveSubscription;
  }, [accessData.hasActiveSubscription]);

  const canViewAllProducts = useCallback((): boolean => {
    return accessData.hasActiveSubscription;
  }, [accessData.hasActiveSubscription]);

  const refetchAccess = useCallback(() => {
    checkAccess();
  }, [checkAccess]);

  const getMaxProductCount = useCallback((searchQuery?: string): number => {
    if (accessData.hasActiveSubscription) return Infinity;
    if (searchQuery && accessData.unlockedSearches.includes(searchQuery)) return Infinity;
    return 10; // Align with backend free_user_product_limit
  }, [accessData.hasActiveSubscription, accessData.unlockedSearches]);

  const refreshAccess = useCallback(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    ...accessData,
    canAccessSearch,
    canAccessCategory,
    canAccessPremiumFeatures,
    canViewAllProducts,
    getMaxProductCount,
    refreshAccess,
    refetchAccess,
  };
}