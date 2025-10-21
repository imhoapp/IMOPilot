import { useState, useEffect, useMemo } from 'react';

interface SearchSuggestion {
  query: string;
  count: number;
}

// Pre-loaded popular search queries from the database - frontend only, no API calls!
const POPULAR_QUERIES: SearchSuggestion[] = [
  { query: "dyson", count: 130 },
  { query: "canon", count: 91 },
  { query: "samsung tv", count: 86 },
  { query: "dishwasher", count: 83 },
  { query: "car seat", count: 77 },
  { query: "macbook", count: 71 },
  { query: "taylor made driver", count: 69 },
  { query: "garage doors", count: 68 },
  { query: "baccarat", count: 67 },
  { query: "imac", count: 65 },
  { query: "ps5", count: 65 },
  { query: "men golf set", count: 63 },
  { query: "google pixel", count: 62 },
  { query: "baby stroller", count: 61 },
  { query: "saxophone", count: 57 },
  { query: "refrigerators", count: 54 },
  { query: "american flag", count: 50 },
  { query: "men's trimmer", count: 50 },
  { query: "perfumes", count: 50 },
  { query: "air frier", count: 49 },
  { query: "60\" tv", count: 47 },
  { query: "garage door", count: 45 },
  { query: "mens golf set", count: 45 },
  { query: "golf", count: 44 },
  { query: "vacuum cleaner", count: 44 },
  { query: "nikon", count: 42 },
  { query: "anker", count: 41 },
  { query: "laptop", count: 41 },
  { query: "3 wood", count: 38 },
  { query: "monitor", count: 37 },
  { query: "home curtains", count: 36 },
  { query: "headphones", count: 35 },
  { query: "air fryer", count: 34 },
  { query: "curtains", count: 27 },
  { query: "mens shoes", count: 27 },
  { query: "bose headphones", count: 26 },
  { query: "car", count: 25 },
  { query: "running shoes", count: 24 },
  { query: "iphone 15", count: 23 },
  { query: "leather jacket", count: 23 },
  { query: "womens running shoes", count: 23 },
  { query: "iphone 17", count: 20 },
  { query: "laptops", count: 19 },
  { query: "mens running shoes", count: 17 },
  { query: "men running shoes", count: 16 },
  { query: "television", count: 13 },
  { query: "washing machine", count: 12 },
  { query: "shoes", count: 10 },
  { query: "iphone 16", count: 9 },
  { query: "stroller", count: 6 },
  { query: "strollers", count: 5 }
];

export const useSearchSuggestions = (searchTerm: string) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term to avoid too frequent filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter suggestions based on search term - completely client-side
  const suggestions = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      // Show top 8 popular queries when no search term
      return POPULAR_QUERIES.slice(0, 8);
    }

    const filtered = POPULAR_QUERIES.filter(item =>
      item.query.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );

    // Sort by relevance: exact matches first, then starts with, then contains
    return filtered.sort((a, b) => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const aQueryLower = a.query.toLowerCase();
      const bQueryLower = b.query.toLowerCase();

      // Exact match gets highest priority
      if (aQueryLower === searchLower) return -1;
      if (bQueryLower === searchLower) return 1;

      // Starts with gets second priority
      if (aQueryLower.startsWith(searchLower) && !bQueryLower.startsWith(searchLower)) return -1;
      if (bQueryLower.startsWith(searchLower) && !aQueryLower.startsWith(searchLower)) return 1;

      // Otherwise sort by popularity (count)
      return b.count - a.count;
    }).slice(0, 8);
  }, [debouncedSearchTerm]);

  // Never show loading state since this is purely client-side
  return {
    suggestions,
    loading: false
  };
};
