import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchUrl } from "@/hooks/useSearchUrl";
import { validateSearchQuery, normalizeSearchQuery, getSearchPlaceholder } from "@/utils/searchUtils";
import { SearchAutosuggest } from "./SearchAutosuggest";

interface SharedSearchInputProps {
  variant?: 'default' | 'compact' | 'hero';
  loading?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
  showButton?: boolean;
  autoFocus?: boolean;
}

export const SharedSearchInput = ({ 
  variant = 'default', 
  loading = false, 
  onSearch,
  className = "",
  showButton = true,
  autoFocus = false
}: SharedSearchInputProps) => {
  const { query, updateSearchUrl } = useSearchUrl();
  const [localQuery, setLocalQuery] = useState(query || '');
  const [isAutosuggestOpen, setIsAutosuggestOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with URL query
  useEffect(() => {
    setLocalQuery(query || '');
  }, [query]);

  // Handle auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure the component is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleSearch = () => {
    const normalizedQuery = normalizeSearchQuery(localQuery);
    if (validateSearchQuery(normalizedQuery)) {
      updateSearchUrl(normalizedQuery);
      onSearch?.(normalizedQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setLocalQuery(suggestion);
    updateSearchUrl(suggestion);
    onSearch?.(suggestion);
    setIsAutosuggestOpen(false);
  };

  const handleInputFocus = () => {
    setIsAutosuggestOpen(true);
  };

  const handleInputBlur = () => {
    // Don't close on blur - let user interact freely
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    // Always open when typing
    setIsAutosuggestOpen(true);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          container: "flex gap-2",
          input: "h-full pl-10 rounded-full",
          button: "h-10 px-4"
        };
      case 'hero':
        return {
          container: "flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto",
          input: "h-14 pl-12 text-base rounded-2xl border-border/60 focus:border-primary shadow-lg glass-input",
          button: "h-14 px-8 rounded-2xl font-semibold bg-gradient-primary hover:shadow-xl hover:shadow-primary/25 border-0 hover-lift"
        };
      default:
        return {
          container: "flex gap-3",
          input: "h-12 pl-11",
          button: "h-12 px-6"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`${styles.container} ${className}`}>
      <SearchAutosuggest
        searchQuery={localQuery}
        isOpen={isAutosuggestOpen}
        onOpenChange={setIsAutosuggestOpen}
        onSelectSuggestion={handleSelectSuggestion}
        variant={variant}
        loading={loading}
      >
        <div className="relative flex-1 h-full cursor-text" onClick={handleContainerClick}>
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder={getSearchPlaceholder()}
            value={localQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={`${styles.input} ${className.includes('border-0') ? 'border-0 focus:ring-0 shadow-none' : ''}`}
            disabled={loading}
          />
        </div>
      </SearchAutosuggest>
      {showButton && (
        <Button
          onClick={handleSearch}
          disabled={loading || !validateSearchQuery(localQuery)}
          className={styles.button}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {variant === 'compact' ? '...' : 'Searching...'}
            </>
          ) : (
            <>
              {variant === 'compact' ? <SearchIcon className="h-4 w-4" /> : 'Search'}
              {variant !== 'compact' && <ArrowRight className="h-5 w-5 ml-2" />}
            </>
          )}
        </Button>
      )}
    </div>
  );
};