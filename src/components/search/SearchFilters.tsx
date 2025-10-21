import { useState } from 'react';
import { Filter, SlidersHorizontal, ArrowUpDown, X, ChevronDown, Star, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface FilterOptions {
  sortBy: 'price_low' | 'price_high' | 'imo_score' | 'rating' | 'newest' | 'most_reviewed';
  priceRange: [number, number];
  minImoScore: number;
  minRating: number;
}

interface SearchFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  productCount: number;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'imo_score', label: 'IMO Score: High to Low' },
  { value: 'rating', label: 'Rating: High to Low' },
  { value: 'most_reviewed', label: 'Most Reviewed' },
];

export function SearchFilters({ filters, onFiltersChange, productCount }: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilters = (updates: Partial<FilterOptions>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const resetFilters = () => {
    onFiltersChange({
      sortBy: 'newest',
      priceRange: [250, 10000],
      minImoScore: 0,
      minRating: 0,
    });
  };

  const hasActiveFilters = 
    filters.priceRange[0] > 250 || 
    filters.priceRange[1] < 10000 || 
    filters.minImoScore > 0 || 
    filters.minRating > 0;

  return (
    <div className="space-y-4">
      {/* Compact Sort and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowUpDown className="h-4 w-4" />
            <Label className="text-sm font-medium">Sort:</Label>
          </div>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => updateFilters({ sortBy: value as FilterOptions['sortBy'] })}
          >
            <SelectTrigger className="w-48 h-9 rounded-lg border-border/40 focus:border-primary transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-border/40">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="rounded-md">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 rounded-full bg-primary/5 border-primary/20 text-primary font-medium">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </Badge>
          
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`gap-2 h-9 px-3 rounded-lg border-border/40 hover:border-primary transition-all duration-200 ${
                  isOpen ? 'bg-primary/5 border-primary/40' : ''
                }`}
              >
                <SlidersHorizontal className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                <span className="font-medium">Filters</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    Active
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Subtle Filter Panel */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="animate-accordion-down">
          <Card className="border-border/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-0">
              {/* Simplified Header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/3 to-secondary/3 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Filter className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Refine Results</h3>
                    <p className="text-xs text-muted-foreground">Adjust filters to find exactly what you're looking for</p>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetFilters}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Compact Filter Grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Price Range Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-md">
                      <DollarSign className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Price Range</Label>
                      <p className="text-xs text-muted-foreground">Adjusting filters...</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">${filters.priceRange[0].toLocaleString()}</span>
                      <span className="text-xs font-medium">${filters.priceRange[1].toLocaleString()}</span>
                    </div>
                    <Slider
                      value={filters.priceRange}
                      onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                      max={10000}
                      min={250}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>$250</span>
                      <span>$10,000+</span>
                    </div>
                  </div>
                </div>

                {/* IMO Score Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                      <TrendingUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">IMO Score</Label>
                      <p className="text-xs text-muted-foreground">AI quality rating</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Min: {filters.minImoScore}/10</span>
                      <Badge variant="outline" className="px-1.5 py-0.5 text-xs rounded-full">
                        {filters.minImoScore === 0 ? 'All' : `${filters.minImoScore}+`}
                      </Badge>
                    </div>
                    <Slider
                      value={[filters.minImoScore]}
                      onValueChange={(value) => updateFilters({ minImoScore: value[0] })}
                      max={10}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
                      <Star className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Customer Rating</Label>
                      <p className="text-xs text-muted-foreground">User reviews</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Min: {filters.minRating}/5</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.floor(filters.minRating) }).map((_, i) => (
                          <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                        ))}
                        {filters.minRating > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">+</span>
                        )}
                      </div>
                    </div>
                    <Slider
                      value={[filters.minRating]}
                      onValueChange={(value) => updateFilters({ minRating: value[0] })}
                      max={5}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0★</span>
                      <span>5★</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className="px-4 pb-4">
                  <Separator className="mb-3" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">Active:</span>
                    {(filters.priceRange[0] > 250 || filters.priceRange[1] < 10000) && (
                      <Badge variant="secondary" className="gap-1 rounded-full text-xs">
                        <DollarSign className="h-2.5 w-2.5" />
                        ${filters.priceRange[0]} - ${filters.priceRange[1]}
                      </Badge>
                    )}
                    {filters.minImoScore > 0 && (
                      <Badge variant="secondary" className="gap-1 rounded-full text-xs">
                        <TrendingUp className="h-2.5 w-2.5" />
                        IMO {filters.minImoScore}+
                      </Badge>
                    )}
                    {filters.minRating > 0 && (
                      <Badge variant="secondary" className="gap-1 rounded-full text-xs">
                        <Star className="h-2.5 w-2.5" />
                        {filters.minRating}+ stars
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}