import { useMemo } from 'react';
import { Product } from '@/types/search';
import { FilterOptions } from '@/components/search/SearchFilters';
import { useAccess } from '@/components/access-control/AccessProvider';

export function useProductFilter(products: Product[], filters: FilterOptions, searchQuery?: string) {
  const { canViewAllProducts, getMaxProductCount } = useAccess();
  
  // Check if user has limited access - only apply client-side filtering for limited users
  const maxProductCount = getMaxProductCount(searchQuery);
  const isLimitedAccess = !canViewAllProducts();
  const filteredAndSortedProducts = useMemo(() => {
    if (!products.length) return [];

    // Only apply client-side filtering for limited access users
    // Subscribed users get backend filtering, so return products as-is
    if (!isLimitedAccess) {
      return products;
    }

    // First, apply filters for limited users
    let filtered = products.filter((product) => {
      // Price range filter
      if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) {
        return false;
      }

      // IMO Score filter
      if (product.imo_score && product.imo_score < filters.minImoScore) {
        return false;
      }

      // Rating filter - using site_rating if available
      if (product.site_rating && product.site_rating < filters.minRating) {
        return false;
      }

      return true;
    });

    // Then, apply sorting for limited users
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_low':
          return a.price - b.price;
        
        case 'price_high':
          return b.price - a.price;
        
        case 'imo_score':
          return (b.imo_score || 0) - (a.imo_score || 0);
        
        case 'rating':
          return (b.site_rating || 0) - (a.site_rating || 0);
        
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [products, filters, isLimitedAccess]);

  return filteredAndSortedProducts;
}