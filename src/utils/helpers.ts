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
 * Apple Podcasts configuration
 */
const APPLE_PODCASTS_CONFIG = {
  URL_PATTERN: /^https?:\/\/podcasts\.apple\.com\/([a-z]{2})\/podcast\/[^/]+\/id(\d+)/i,
  LOOKUP_API_BASE: 'https://itunes.apple.com/lookup',
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
 * Checks if a URL is an Apple Podcasts web page URL
 * @param url - The URL to check
 * @returns True if the URL is an Apple Podcasts web page URL
 */
export function isApplePodcastsUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return APPLE_PODCASTS_CONFIG.URL_PATTERN.test(url);
}

/**
 * Extracts the podcast ID from an Apple Podcasts URL
 * @param url - The Apple Podcasts URL
 * @returns The podcast ID or null if not found
 */
export function extractApplePodcastsId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const match = url.match(APPLE_PODCASTS_CONFIG.URL_PATTERN);
  return match ? match[2] : null;
}

/**
 * Fetches the actual RSS feed URL for an Apple Podcasts podcast
 * @param podcastId - The Apple Podcasts podcast ID
 * @returns Promise resolving to the RSS feed URL
 * @throws {Error} When the fetch fails or feed URL is not found
 */
export async function fetchApplePodcastsFeedUrl(podcastId: string): Promise<string> {
  if (!podcastId || typeof podcastId !== 'string') {
    throw new Error('Invalid podcast ID: ID must be a non-empty string');
  }
  
  const lookupUrl = `${APPLE_PODCASTS_CONFIG.LOOKUP_API_BASE}?id=${podcastId}&entity=podcast`;
  
  try {
    const response = await fetch(lookupUrl);
    
    if (!response.ok) {
      throw new Error(`Apple Podcasts lookup failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No podcast found for the given ID');
    }
    
    const feedUrl = data.results[0]?.feedUrl;
    
    if (!feedUrl) {
      throw new Error('Feed URL not found in Apple Podcasts response');
    }
    
    return feedUrl;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch Apple Podcasts feed URL');
  }
}

/**
 * Resolves a feed URL, converting Apple Podcasts URLs to RSS feed URLs if necessary
 * @param feedUrl - The feed URL to resolve
 * @returns Promise resolving to the actual RSS feed URL
 */
export async function resolveFeedUrl(feedUrl: string): Promise<string> {
  if (!feedUrl || typeof feedUrl !== 'string') {
    throw new Error('Invalid feed URL: URL must be a non-empty string');
  }
  
  // If it's an Apple Podcasts web page URL, convert it to RSS feed URL
  if (isApplePodcastsUrl(feedUrl)) {
    const podcastId = extractApplePodcastsId(feedUrl);
    
    if (!podcastId) {
      throw new Error('Failed to extract podcast ID from Apple Podcasts URL');
    }
    
    return await fetchApplePodcastsFeedUrl(podcastId);
  }
  
  // Otherwise, return the URL as-is
  return feedUrl;
}

/**
 * Constructs a URL for the RSS to JSON API with better type safety
 * This function does NOT resolve Apple Podcasts URLs - use resolveFeedUrl first if needed
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
export function toArray<T>(iterator: IterableIterator<T>): T[] {
  return [...iterator];
}

/**
 * @deprecated Use toArray instead. This will be removed in a future version.
 */
export const ToArray = toArray;
