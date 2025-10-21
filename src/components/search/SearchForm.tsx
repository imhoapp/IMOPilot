import { Search as SearchIcon } from "lucide-react";
import { SharedSearchInput } from "@/components/search/SharedSearchInput";

interface SearchFormProps {
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
}

export const SearchForm = ({ loading, onSearch }: SearchFormProps) => {
  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gradient-primary p-3 rounded-2xl shadow-lg">
            <SearchIcon className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Find Products Over <span className="text-gradient">$250</span>
        </h1>
        <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
          Search across Amazon, Walmart, Google Shopping, and Home Depot for high-value products with AI-powered analysis.
        </p>
      </div>

      <SharedSearchInput 
        variant="hero" 
        loading={loading} 
        onSearch={onSearch}
      />
    </div>
  );
};