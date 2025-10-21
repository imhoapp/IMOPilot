import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving formatting
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // Configure DOMPurify to allow common formatting tags
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'span', 'div',
      'blockquote'
    ],
    ALLOWED_ATTR: [
      'style', 'class'
    ],
    ALLOWED_STYLES: {
      '*': {
        'text-align': /^(left|right|center|justify)$/,
        'padding-left': /^\d+px$/,
        'font-weight': /^(normal|bold|bolder|lighter|\d+)$/,
        'font-style': /^(normal|italic|oblique)$/
      }
    }
  };
  
  return DOMPurify.sanitize(html, config);
};

/**
 * Checks if a string contains HTML tags
 */
export const isHtmlContent = (content: string): boolean => {
  if (!content) return false;
  return /<[^>]*>/.test(content);
};