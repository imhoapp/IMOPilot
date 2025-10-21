import { ShoppingBag, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Product } from "@/types/search";
import { formatPrice } from "@/utils/format";
import { Link } from "react-router-dom";
import { ProductLikeButton } from "@/components/product/ProductLikeButton";
import { ProductSource } from "@/components/product/ProductSource";
import { deduplicateImagesByBaseUrl } from "@/lib/utils";
import { useUserAccess } from "@/hooks/useUserAccess";
import { ProductLimitBanner } from "@/components/access-control/ProductLimitBanner";


interface ProductGridProps {
  products: Product[];
  totalCount?: number;
  searchQuery?: string;
  showUpgradeBanner?: boolean;
}

export const ProductGrid = ({ products, totalCount, searchQuery, showUpgradeBanner = false }: ProductGridProps) => {
  // Use the API response value directly - don't override with local logic
  const shouldShowBanner = showUpgradeBanner;

  // Filter out products with invalid IDs before rendering
  const validProducts = products.filter(product => {
    const hasValidId = product.id && typeof product.id === 'string' && product.id !== 'undefined' && product.id !== 'null';
    if (!hasValidId) {
      console.warn('Product with invalid ID detected:', { title: product.title, id: product.id });
    }
    return hasValidId;
  });

  if (validProducts.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No products found</h3>
        <p className="text-muted-foreground">
          Try searching for a different product or keyword.
        </p>
      </div>
    );
  }

  return (
    <div>
      {shouldShowBanner && (
        <ProductLimitBanner
          currentCount={products.length}
          totalCount={totalCount || products.length}
          searchQuery={searchQuery}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {validProducts.map((product) => (
          <Card key={product.id} className="group hover-lift glass-card relative">
            <div className="absolute top-4 right-4 z-10">
              <ProductLikeButton 
                productId={product.id} 
                showCount={false}
                initialLikeCount={product.like_count}
                initialLikedByUser={product.liked_by_user}
              />
            </div>
            <CardContent className="p-6">
              <div className="aspect-video rounded-xl overflow-hidden mb-6 bg-muted/50 group-hover:shadow-lg transition-all duration-300">
                {product.image_urls && product.image_urls.length > 1 ? (
                  (() => {
                    // Remove duplicates and filter out empty URLs
                     const uniqueImages = deduplicateImagesByBaseUrl(product.image_urls);

                    return uniqueImages.length > 1 ? (
                      <Carousel className="w-full h-full">
                        <CarouselContent>
                          {uniqueImages.map((imageUrl, index) => (
                            <CarouselItem key={index}>
                              <div className="w-full h-full relative">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={`${product.title} - Image ${index + 1}`}
                                    className="w-full h-full object-contain max-h-fit"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                      const placeholder = target.nextElementSibling as HTMLElement;
                                      if (placeholder) placeholder.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground" style={{ display: 'none' }}>
                                  <ShoppingBag className="h-8 w-8" />
                                </div>
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                      </Carousel>
                    ) : (
                      <div className="w-full h-full relative">
                        {uniqueImages[0] || product.image_url ? (
                          <img
                            src={uniqueImages[0] || product.image_url}
                            alt={product.title}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground" style={{ display: 'none' }}>
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      </div>
                    );
                  })()
                ) : product.image_url ? (
                  <div className="w-full h-full relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground" style={{ display: product.image_url ? 'none' : 'flex' }}>
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors flex-1" title={product.title}>
                      {product.title}
                    </h3>
                    <ProductSource source={product.source} className="shrink-0" />
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(product.price)}
                  </p>
                </div>

                {product.imo_score && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="font-semibold glass-card text-primary border-primary/20">
                      IMO Score: {product.imo_score}/10
                    </Badge>
                  </div>
                )}

                {product.pros && product.pros.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                      Pros:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {product.pros.slice(0, 2).map((pro, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  asChild
                  className="w-full rounded-xl bg-gradient-primary hover:shadow-lg hover:shadow-primary/25 border-0 font-medium text-primary-foreground"
                  size="default"
                  disabled={!product.id || product.id === 'undefined'}
                >
                  <Link to={product.id && product.id !== 'undefined' ? `/product/${product.id}` : '#'}>
                    View Product
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};