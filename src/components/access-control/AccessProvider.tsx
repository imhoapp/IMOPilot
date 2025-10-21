import { createContext, useContext, ReactNode } from 'react';
import { useUserAccess } from '@/hooks/useUserAccess';

interface AccessContextType {
  hasActiveSubscription: boolean;
  unlockedCategories: string[];
  unlockedSearches: string[];
  accessLevel: 'basic' | 'premium';
  canAccessCategory: (category: string) => boolean;
  canAccessSearch: (searchQuery: string) => boolean;
  canAccessPremiumFeatures: () => boolean;
  canViewAllProducts: () => boolean;
  getMaxProductCount: (searchQuery?: string) => number;
  loading: boolean;
  error: string | null;
  refreshAccess: () => void;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

export function AccessProvider({ children }: { children: ReactNode }) {
  const userAccess = useUserAccess();

  return (
    <AccessContext.Provider value={userAccess}>
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (context === undefined) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
}