import { Search, TrendingUp } from "lucide-react";
import {
  Command,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";

interface SearchAutosuggestProps {
  searchQuery: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSuggestion: (suggestion: string) => void;
  children: React.ReactNode;
  variant?: 'default' | 'compact' | 'hero';
  loading?: boolean;
}

export const SearchAutosuggest = ({ 
  searchQuery, 
  isOpen, 
  onOpenChange, 
  onSelectSuggestion, 
  children,
  variant = 'default',
  loading: externalLoading = false
}: SearchAutosuggestProps) => {
  const { suggestions, loading: suggestionsLoading } = useSearchSuggestions(searchQuery);
  const loading = externalLoading || suggestionsLoading;

  const getPopoverWidth = () => {
    // Make popover match the width of the search input trigger
    return 'w-[--radix-popover-trigger-width]';
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger 
        asChild
        onKeyDown={(e) => {
          // Prevent spacebar from closing the popover when typing in input
          if (e.code === "Space") {
            e.preventDefault();
          }
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className={`${getPopoverWidth()} p-0 bg-background border border-border shadow-lg z-50`}
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="bg-background">
          {loading && (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading suggestions...</span>
            </div>
          )}
          {!loading && suggestions.length > 0 && (
            <CommandList className="max-h-60">
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.query}
                  value={suggestion.query}
                  onSelect={() => onSelectSuggestion(suggestion.query)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/80"
                >
                  {suggestion.count > 20 ? (
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Search className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1">{suggestion.query}</span>
                  <span className="text-xs text-muted-foreground">
                    {suggestion.count} products
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          )}
          {!loading && suggestions.length === 0 && searchQuery.trim() && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No suggestions found
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};