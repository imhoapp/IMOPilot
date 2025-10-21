// Image utilities for extracting and processing product images

export interface ImageExtractionResult {
  imageUrl: string | null;
  imageUrls: string[];
}

export function extractProductImages(item: any): ImageExtractionResult {
  let imageUrls: string[] = [];
  let imageUrl = null;
  
  if (item.thumbnails && Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
    // Extract high-quality images from thumbnails array
    const thumbnailArray = item.thumbnails[0]; // First array contains different sizes
    if (Array.isArray(thumbnailArray)) {
      // Group images by base URL and keep only highest quality version
      const imageGroups = new Map<string, string[]>();
      
      thumbnailArray.forEach(url => {
        if (url.includes('_400.jpg') || url.includes('_600.jpg') || url.includes('_1000.jpg')) {
          // Extract base URL (everything before the quality suffix)
          const baseUrl = url.replace(/_\d+\.jpg$/, '');
          if (!imageGroups.has(baseUrl)) {
            imageGroups.set(baseUrl, []);
          }
          imageGroups.get(baseUrl)!.push(url);
        }
      });
      
      // Select highest quality version from each group
      imageUrls = Array.from(imageGroups.values()).map(group => {
        return group.find(url => url.includes('_1000.jpg')) ||
               group.find(url => url.includes('_600.jpg')) ||
               group.find(url => url.includes('_400.jpg')) ||
               group[0];
      });
      
      // Use highest quality image as primary
      imageUrl = thumbnailArray.find(url => url.includes('_1000.jpg')) || 
                thumbnailArray.find(url => url.includes('_600.jpg')) || 
                thumbnailArray.find(url => url.includes('_400.jpg')) ||
                thumbnailArray[0]; // Fallback to first image
    }
  }
  
  // Fallback to other image sources if thumbnails not available
  if (!imageUrl) {
    if (item.thumbnail) {
      imageUrl = item.thumbnail;
      imageUrls = [item.thumbnail];
    } else if (item.image) {
      imageUrl = item.image;
      imageUrls = [item.image];
    } else if (item.images && item.images.length > 0) {
      imageUrl = item.images[0];
      imageUrls = [...new Set(item.images)]; // Remove duplicates
    } else if (item.snippet?.thumbnail) {
      imageUrl = item.snippet.thumbnail;
      imageUrls = [item.snippet.thumbnail];
    }
  }

  return {
    imageUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : []
  };
}

export function extractPrice(item: any): number {
  let price = 0;
  if (item.price?.current_price) {
    const priceStr = item.price.current_price.toString().replace(/[^0-9.]/g, '');
    price = parseFloat(priceStr);
  } else if (item.price?.current) {
    const priceStr = item.price.current.toString().replace(/[^0-9.]/g, '');
    price = parseFloat(priceStr);
  } else if (item.price) {
    const priceStr = item.price.toString().replace(/[^0-9.]/g, '');
    price = parseFloat(priceStr);
  }
  return price;
}