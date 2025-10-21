import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SearchAccessResponse {
  showUpgradeBanner: boolean;
  hasActiveSubscription: boolean;
  hasSearchUnlock: boolean;
}

export function useSearchAccess(searchQuery?: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['search-access', searchQuery, session?.user?.id],
    queryFn: async (): Promise<SearchAccessResponse> => {
      if (!searchQuery) {
        return {
          showUpgradeBanner: false,
          hasActiveSubscription: false,
          hasSearchUnlock: false,
        };
      }

      try {
        // Call the backend to check access for this specific search query
        const { data, error } = await supabase.functions.invoke('fetch-products', {
          body: {
            query: searchQuery,
            maxResults: 1, // We only need to check access, not get actual products
            searchOnly: true, // This tells the backend to only check access
          },
          headers: session ? {
            Authorization: `Bearer ${session.access_token}`,
          } : {},
        });

        if (error) {
          console.error('Error checking search access:', error);
          // If there's an error, default to showing upgrade banner for safety
          return {
            showUpgradeBanner: true,
            hasActiveSubscription: false,
            hasSearchUnlock: false,
          };
        }

        return {
          showUpgradeBanner: data.showUpgradeBanner || false,
          hasActiveSubscription: data.hasActiveSubscription || false,
          hasSearchUnlock: data.hasSearchUnlock || false,
        };
      } catch (error) {
        console.error('Error checking search access:', error);
        return {
          showUpgradeBanner: true,
          hasActiveSubscription: false,
          hasSearchUnlock: false,
        };
      }
    },
    enabled: !!searchQuery,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}