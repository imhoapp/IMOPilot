// Utility functions for access control logic

/**
 * Determines if a user has access to a specific category
 */
export function hasAccessToCategory(
  category: string,
  hasActiveSubscription: boolean,
  unlockedCategories: string[]
): boolean {
  if (hasActiveSubscription) return true;
  return unlockedCategories.includes(category);
}

/**
 * Determines if a user can view all products (no limit)
 */
export function canViewAllProducts(hasActiveSubscription: boolean): boolean {
  return hasActiveSubscription;
}

/**
 * Gets the maximum number of products a user can view
 */
export function getMaxProductViewLimit(hasActiveSubscription: boolean): number {
  return hasActiveSubscription ? Infinity : 10;
}

/**
 * Filters products based on user access level
 */
export function filterProductsByAccess<T>(
  products: T[],
  hasActiveSubscription: boolean,
  maxProducts: number = 10
): T[] {
  if (hasActiveSubscription) return products;
  return products.slice(0, maxProducts);
}

/**
 * Determines if content should be blurred/locked
 */
export function shouldRestrictContent(
  requiresSubscription: boolean,
  requiredCategory: string | undefined,
  hasActiveSubscription: boolean,
  unlockedCategories: string[]
): boolean {
  if (requiresSubscription && !hasActiveSubscription) return true;
  if (requiredCategory && !hasAccessToCategory(requiredCategory, hasActiveSubscription, unlockedCategories)) return true;
  return false;
}

/**
 * Gets subscription tier display name
 */
export function getSubscriptionTierLabel(hasActiveSubscription: boolean): string {
  return hasActiveSubscription ? 'Premium' : 'Free';
}

/**
 * Categories that require unlocking (can be expanded)
 */
export const UNLOCKABLE_CATEGORIES = [
  'Electronics',
  'Home & Garden',
  'Sports & Outdoors',
  'Beauty & Personal Care',
  'Automotive',
  'Books',
  'Toys & Games',
  'Health & Wellness',
  'Fashion',
  'Tools & Hardware'
] as const;

export type UnlockableCategory = typeof UNLOCKABLE_CATEGORIES[number];