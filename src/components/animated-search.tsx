import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SharedSearchInput } from "@/components/search/SharedSearchInput";
import { useSearchUrl } from "@/hooks/useSearchUrl";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const handleSearch = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-6 mt-2">
          <SharedSearchInput 
            variant="default" 
            onSearch={handleSearch}
            showButton={true}
            className="border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AnimatedSearchProps {
  className?: string;
}

export function AnimatedSearch({ className }: AnimatedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const { query } = useSearchUrl();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Detect macOS
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);

    // Add keyboard shortcut listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowOverlay(true);
      }
      // Close search on Escape
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    // Click outside handler
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleSearch = () => {
    setIsExpanded(false);
  };

  const shortcutText = isMac ? '⌘K' : 'Ctrl K';

  return (
    <>
      <div className={`relative flex items-center ${className}`}>
        {/* Search Bar Container with Smooth Animation */}
        <div 
          ref={searchRef}
          className={`
            relative flex items-center glass-card rounded-full border border-border/60 shadow-lg overflow-hidden 
            bg-gradient-to-r from-background/95 via-background/98 to-background/95 backdrop-blur-xl
            transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${isExpanded 
              ? 'w-[min(300px,_calc(100vw-200px))] h-12' 
              : 'w-[180px] h-10 cursor-pointer hover:shadow-xl hover:border-primary/30'
            }
          `}
          style={{
            transformOrigin: 'right center'
          }}
          onClick={!isExpanded ? () => setIsExpanded(true) : undefined}
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-primary/5 to-primary/3 rounded-full"></div>
          
          {!isExpanded ? (
            /* Collapsed Button State */
            <div className="flex items-center justify-between px-3 py-2 group w-full">
              <div className="flex items-center">
                <SearchIcon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200 text-primary/60" />
                <span className="text-sm font-medium opacity-100 transition-opacity duration-300 text-primary/70">Search</span>
              </div>
              <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/60 border border-border/50 rounded shadow-sm backdrop-blur-sm">
                {shortcutText}
              </kbd>
            </div>
          ) : (
            /* Expanded Search State */
            <div className="w-full flex items-center animate-in fade-in-0 duration-300">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 h-6 w-6 p-0 hover:bg-muted z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
              
              <div className="w-full pr-8">
                <SharedSearchInput 
                  variant="compact" 
                  onSearch={handleSearch}
                  showButton={false}
                  className="bg-transparent border-0"
                  autoFocus={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <SearchOverlay isOpen={showOverlay} onClose={() => setShowOverlay(false)} />
    </>
  );
}