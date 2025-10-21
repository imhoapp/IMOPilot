export const validateSearchQuery = (query: string): boolean => {
  return query.trim().length > 0;
};

export const normalizeSearchQuery = (query: string): string => {
  return query.trim();
};

export const getSearchPlaceholder = (): string => {
  return "Search for tools, appliances, electronics...";
};