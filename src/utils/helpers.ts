/**
 * Protocol configuration for URL security
 */
const SECURE_PROTOCOL = 'https://' as const;
const INSECURE_PROTOCOL_PATTERN = /^http:\/\//i;

/**
 * RSS to JSON API configuration
 */
const RSS_API_CONFIG = {
  BASE_URL: 'https://api.rss2json.com/v1/api.json',
  API_KEY: 'xwxutnum3sroxsxlretuqp0dvigu3hsbeydbhbo6',
  DEFAULT_MAX_COUNT: 300,
} as const;

/**
 * Converts an HTTP URL to HTTPS for security
 * @param url - The URL to secure
 * @returns The secured URL (HTTPS)
 * @throws {Error} When the URL is invalid
 */
export function getSecureUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string');
  }
  
  return url.replace(INSECURE_PROTOCOL_PATTERN, SECURE_PROTOCOL);
}

/**
 * Constructs a URL for the RSS to JSON API with better type safety
 * @param feedUrl - The RSS feed URL to convert to JSON
 * @param maxCount - Maximum number of items to return (default: 300)
 * @returns The API URL for fetching JSON feed
 * @throws {Error} When the feedUrl is invalid
 */
export function getFeedUrl(
  feedUrl: string, 
  maxCount: number = RSS_API_CONFIG.DEFAULT_MAX_COUNT
): string {
  if (!feedUrl || typeof feedUrl !== 'string') {
    throw new Error('Invalid feed URL: URL must be a non-empty string');
  }
  
  if (maxCount <= 0 || !Number.isInteger(maxCount)) {
    throw new Error('Invalid maxCount: Must be a positive integer');
  }
  
  const searchParams = new URLSearchParams({
    rss_url: feedUrl,
    api_key: RSS_API_CONFIG.API_KEY,
    count: maxCount.toString(),
  });
  
  return `${RSS_API_CONFIG.BASE_URL}?${searchParams.toString()}`;
}

/**
 * Converts an IterableIterator to an array with better type inference
 * @param iterator - The iterator to convert
 * @returns An array containing all elements from the iterator
 */
export function toArray<T>(iterator: IterableIterator<T>): readonly T[] {
  return [...iterator] as const;
}

/**
 * @deprecated Use toArray instead. This will be removed in a future version.
 */
export const ToArray = toArray;
