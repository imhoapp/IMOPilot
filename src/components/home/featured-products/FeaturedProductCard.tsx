import { Heart, ExternalLink, Star, Package } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ProductLikeButton } from "@/components/product/ProductLikeButton";
import { ProductSource } from "@/components/product/ProductSource";
import { Link } from "react-router-dom";
import { Product } from "@/types/search";
import { formatPrice } from "@/utils/format";
import { deduplicateImagesByBaseUrl } from "@/lib/utils";

interface FeaturedProductCardProps {
  product: Product;
  index: number;
}

export const FeaturedProductCard = ({ product, index }: FeaturedProductCardProps) => {
  // Calculate delay based on index for staggered animation
  const delay = 0.15 + (index * 0.2);

  // Determine if reduced motion is preferred
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 50,
        filter: "blur(10px)",
        scale: 0.95
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        scale: 1
      }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.7,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1.0]
      }}
    >
      <Card className="group hover-lift glass-card relative h-full">
        <div className="absolute top-4 right-4 z-10">
          <ProductLikeButton 
            productId={product.id} 
            showCount={false}
            initialLikeCount={product.like_count}
            initialLikedByUser={product.liked_by_user}
          />
        </div>
        <CardContent className="p-6 flex flex-col h-full">
          <div className="aspect-video rounded-xl overflow-hidden mb-6 bg-muted/50 group-hover:shadow-lg transition-all duration-300">
            {product.image_urls && product.image_urls.length > 1 ? (
              <Carousel className="w-full h-full">
                <CarouselContent>
                  {deduplicateImagesByBaseUrl(product.image_urls).map((imageUrl, i) => (
                    <CarouselItem key={i}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${product.title} - Image ${i + 1}`}
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
                        <Package className="h-8 w-8" />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            ) : (
              <div className="w-full h-full relative">
                {product.image_url || (product.image_urls && product.image_urls[0]) ? (
                  <img
                    src={product.image_url || (product.image_urls && product.image_urls[0])}
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
                <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground" style={{ display: product.image_url || (product.image_urls && product.image_urls[0]) ? 'none' : 'flex' }}>
                  <Package className="h-12 w-12" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 flex-grow">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  IMO Score: {product.imo_score}/10
                </Badge>
                <ProductSource source={product.source} />
              </div>

              <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                {product.title}
              </h3>

              <p className="text-2xl font-bold text-primary mt-2">
                {formatPrice(product.price)}
              </p>
            </div>

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
          </div>

          <Button
            asChild
            className="w-full mt-4 rounded-xl bg-gradient-primary hover:shadow-lg hover:shadow-primary/25 border-0 font-medium text-primary-foreground"
            size="default"
          >
            <Link to={`/product/${product.id}`}>
              View Product
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};