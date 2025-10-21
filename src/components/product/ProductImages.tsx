import { Package, ShoppingBag } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { deduplicateImagesByBaseUrl } from "@/lib/utils";

interface ProductImagesProps {
  title: string;
  imageUrl?: string;
  imageUrls?: string[];
}

export const ProductImages = ({ title, imageUrl, imageUrls }: ProductImagesProps) => {

  if (imageUrls && imageUrls.length > 1) {
    const uniqueImages = deduplicateImagesByBaseUrl(imageUrls);
    return (
      <div className="aspect-square rounded-2xl overflow-hidden bg-muted/50">
        <Carousel className="w-full h-full">
          <CarouselContent>
            {uniqueImages.map((url, index) => (
              <CarouselItem key={index}>
                <div className="w-full h-full relative">
                  {url ? (
                    <img
                      src={url}
                      alt={`${title} - Image ${index + 1}`}
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
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />
        </Carousel>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="aspect-square rounded-2xl overflow-hidden bg-muted/50">
        <div className="w-full h-full relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground" style={{ display: imageUrl ? 'none' : 'flex' }}>
            <Package className="h-12 w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-square rounded-2xl bg-muted flex items-center justify-center">
      <ShoppingBag className="h-20 w-20 text-muted-foreground/50" />
    </div>
  );
};