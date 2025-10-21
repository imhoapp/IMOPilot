import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Deduplicate image URLs by their base, keeping only the highest quality (largest) image for each group.
 * @param imageUrls Array of image URLs
 * @returns Deduplicated array of image URLs
 */
export function deduplicateImagesByBaseUrl(imageUrls: string[]): string[] {
  function getBaseAndSize(url: string) {
    // Match _400.jpg, _600.jpg, _1000.jpg etc.
    const match = url.match(/(.+)_([0-9]+)\.jpg$/);
    if (match) {
      return { base: match[1], size: parseInt(match[2], 10), url };
    }
    return { base: url, size: 0, url };
  }
  const grouped: Record<string, { url: string; size: number }> = {};
  imageUrls.filter(url => url && typeof url === 'string' && url.trim()).forEach(url => {
    const { base, size } = getBaseAndSize(url);
    if (!grouped[base] || size > grouped[base].size) {
      grouped[base] = { url, size };
    }
  });
  return Object.values(grouped).map(obj => obj.url);
}