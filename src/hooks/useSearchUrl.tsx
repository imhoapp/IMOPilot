import { useNavigate, useLocation } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';

export const useSearchUrl = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use nuqs for URL state management
  const [query, setQuery] = useQueryState('q', parseAsString.withDefault(''));
  
  const updateSearchUrl = (searchQuery: string) => {
    if (searchQuery.trim()) {
      setQuery(searchQuery.trim());
      // Navigate to search page if not already there
      if (!location.pathname.includes('/search')) {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    } else {
      setQuery(null);
    }
  };
  
  const clearSearch = () => {
    setQuery(null);
  };
  
  return {
    query,
    updateSearchUrl,
    clearSearch,
    setQuery
  };
};