import { Star, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useParams } from "react-router-dom";
import { ProductSource } from "./ProductSource";
import { sanitizeHtml, isHtmlContent } from "@/utils/htmlSanitizer";

interface ProductInfoProps {
  title: string;
  price: number;
  imoScore?: number;
  description?: string;
  productUrl: string;
  source: 'Amazon' | 'Walmart' | 'Home Depot' | 'Google';
}

export const ProductInfo = ({ title, price, imoScore, description, productUrl, source }: ProductInfoProps) => {
  const { productId } = useParams<{ productId: string }>();
  const { trackAffiliateClick } = useAnalytics();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getAffiliateUrl = (url: string, source: string): string => {
    if (source === 'Amazon') {
      // Handle relative URLs by converting to absolute
      const fullUrl = url.startsWith('/') ? `https://www.amazon.com${url}` : url;
      
      // Check if URL already has query parameters
      const separator = fullUrl.includes('?') ? '&' : '?';
      
      // Append Amazon Associate tag
      return `${fullUrl}${separator}tag=Imoapp01-20`;
    }
    
    // Return unchanged for other sources (Walmart support coming soon)
    return url;
  };

  const handleAffiliateClick = () => {
    if (productId) {
      trackAffiliateClick(productId, source);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-4xl font-bold tracking-tight flex-1">
            {title}
          </h1>
          <ProductSource source={source} />
        </div>
        <p className="text-3xl font-bold text-primary mb-6">
          {formatPrice(price)}
        </p>

        {imoScore && (
          <div className="flex items-center space-x-2 mb-6">
            <Badge variant="secondary" className="font-semibold glass-card text-primary border-primary/20 text-lg px-4 py-2">
              <Star className="h-4 w-4 mr-2" />
              IMO Score: {imoScore}/10
            </Badge>
          </div>
        )}

        {description && (
          <div className="text-muted-foreground text-lg leading-relaxed mb-8 prose prose-slate dark:prose-invert max-w-none">
            {isHtmlContent(description) ? (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHtml(description) 
                }}
                className="[&>p]:mb-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2 [&>ul]:mb-4 [&>li]:mb-1 [&>strong]:font-semibold"
              />
            ) : (
              <p>{description}</p>
            )}
          </div>
        )}
      </div>

      {/* Buy Button */}
      <Button 
        asChild 
        size="lg"
        className="w-full rounded-xl bg-gradient-primary hover:shadow-lg hover:shadow-primary/25 border-0 font-medium text-lg py-6 text-primary-foreground"
      >
        <a 
          href={getAffiliateUrl(productUrl, source)} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={handleAffiliateClick}
        >
          Buy Now
          <ArrowRight className="h-5 w-5 ml-2" />
        </a>
      </Button>
    </div>
  );
};