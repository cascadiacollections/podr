import { APP_CONFIG, IFeed } from './AppContext';

/**
 * Protocol configuration for URL security
 */
const SECURE_PROTOCOL = 'https://' as const;
const INSECURE_PROTOCOL_PATTERN = /^http:\/\//i;
const WEB_URL_PATTERN = /^https?:\/\//i;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Feed conversion configuration.
 *
 * Episodes come from the Podr service's `/feed` route, which converts RSS to
 * JSON server-side. Any upstream API key stays on the service rather than in
 * this bundle (cascadiacollections/podr#133).
 */
const FEED_CONFIG = {
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
 * Normalizes a URL for use in `src` or `href`.
 *
 * HTTP is upgraded to HTTPS and protocol-relative URLs become HTTPS. Any other
 * scheme (`javascript:`, `data:`, `blob:`, …) is dropped so feed data cannot
 * be assigned to an element. Values with no scheme are left as written, which
 * keeps ordinary relative paths usable.
 * @param value - A candidate URL from a feed, the API, or storage
 * @returns An HTTPS URL, a scheme-less path, or an empty string
 */
export function toSecureHttpUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('//')) {
    return `${SECURE_PROTOCOL}${trimmed.slice(2)}`;
  }

  if (WEB_URL_PATTERN.test(trimmed)) {
    return trimmed.replace(INSECURE_PROTOCOL_PATTERN, SECURE_PROTOCOL);
  }

  if (SCHEME_PATTERN.test(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Converts an HTTP URL to HTTPS for security
 * @param url - The URL to secure
 * @returns The secured URL (HTTPS)
 * @throws {Error} When the URL is invalid or not a web URL
 */
export function getSecureUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string');
  }

  const secured = toSecureHttpUrl(url);

  if (!WEB_URL_PATTERN.test(secured)) {
    throw new Error('Invalid URL: URL must use HTTP or HTTPS');
  }

  return secured;
}

/**
 * The error's name, or an empty string when the thrown value is not an Error.
 * A bare `catch (err)` value is `unknown`; reading `.name` off it throws again.
 */
export function readErrorName(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

/**
 * A message safe to show or report for any thrown value
 */
export function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return 'Unknown error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Restores saved podcasts from local storage.
 *
 * Storage is untrusted: a failed write, a hand-edited value, or an older build
 * can leave something that is not a list of feeds. Those values used to be
 * passed straight to `new Set`, which throws when the value is not iterable
 * and takes the whole app down on startup.
 * @param payload - The parsed `podr_feeds` value
 * @returns The feeds that are safe to keep
 */
export function parseStoredFeeds(payload: unknown): readonly IFeed[] {
  if (!Array.isArray(payload)) {
    return Object.freeze([]);
  }

  const feeds: IFeed[] = [];

  for (const entry of payload) {
    if (!isRecord(entry) || typeof entry.feedUrl !== 'string') {
      continue;
    }

    const feedUrl = entry.feedUrl.trim();

    // Only web addresses are opened or sent to the feed service
    if (!WEB_URL_PATTERN.test(feedUrl)) {
      continue;
    }

    const artistName = typeof entry.artistName === 'string' ? entry.artistName.trim() : '';
    const feed: IFeed = {
      collectionName: typeof entry.collectionName === 'string' ? entry.collectionName : '',
      feedUrl,
      artworkUrl100: toSecureHttpUrl(entry.artworkUrl100),
      artworkUrl600: toSecureHttpUrl(entry.artworkUrl600),
    };

    feeds.push(artistName ? { ...feed, artistName } : feed);
  }

  return Object.freeze(feeds);
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
 * A resolved feed, with whatever metadata the resolution turned up
 */
export interface IResolvedFeed {
  /** The RSS feed URL to fetch episodes from */
  readonly feedUrl: string;
  /** The podcast's name, when the resolver could supply one */
  readonly collectionName?: string;
  /** Artwork URL, when the resolver could supply one */
  readonly artworkUrl?: string;
}

/**
 * Shape of the Podr worker's podcast detail response
 */
interface IPodcastDetailResponse {
  readonly podcast?: {
    readonly trackName?: string;
    readonly feedUrl?: string;
    readonly artworkUrl600?: string;
  };
}

/**
 * Resolves an Apple Podcasts ID through the Podr worker.
 *
 * Preferred over calling the iTunes lookup API from the browser: the worker sends
 * CORS headers, reaches Apple through its own proxy (Apple answers some clients
 * with a 403), caches the result, and returns the podcast's name and artwork
 * alongside the feed URL.
 * @param podcastId - The Apple Podcasts podcast ID
 * @returns The resolved feed
 * @throws {Error} When the worker cannot supply a feed URL
 */
export async function fetchPodcastDetail(podcastId: string): Promise<IResolvedFeed> {
  const response = await fetch(`${APP_CONFIG.API_BASE_URL}/podcast/${podcastId}`);

  if (!response.ok) {
    throw new Error(`Podcast lookup failed with status: ${response.status}`);
  }

  const data: IPodcastDetailResponse = await response.json();
  const feedUrl = data?.podcast?.feedUrl;

  if (!feedUrl) {
    throw new Error('Feed URL not found in podcast detail response');
  }

  return {
    feedUrl,
    collectionName: data.podcast?.trackName,
    artworkUrl: data.podcast?.artworkUrl600
  };
}

/**
 * Resolves a feed URL, converting Apple Podcasts URLs to RSS feed URLs if
 * necessary, and reporting any metadata found along the way.
 * @param feedUrl - The feed URL to resolve
 * @returns Promise resolving to the actual RSS feed and its metadata
 */
export async function resolveFeed(feedUrl: string): Promise<IResolvedFeed> {
  if (!feedUrl || typeof feedUrl !== 'string') {
    throw new Error('Invalid feed URL: URL must be a non-empty string');
  }

  // Anything that is already an RSS URL needs no resolution
  if (!isApplePodcastsUrl(feedUrl)) {
    return { feedUrl };
  }

  const podcastId = extractApplePodcastsId(feedUrl);

  if (!podcastId) {
    throw new Error('Failed to extract podcast ID from Apple Podcasts URL');
  }

  try {
    return await fetchPodcastDetail(podcastId);
  } catch {
    // Fall back to the iTunes lookup API directly, which works from some
    // clients even when the worker route is unavailable
    return { feedUrl: await fetchApplePodcastsFeedUrl(podcastId) };
  }
}

/**
 * Resolves a feed URL, converting Apple Podcasts URLs to RSS feed URLs if necessary
 * @param feedUrl - The feed URL to resolve
 * @returns Promise resolving to the actual RSS feed URL
 */
export async function resolveFeedUrl(feedUrl: string): Promise<string> {
  const resolved = await resolveFeed(feedUrl);
  return resolved.feedUrl;
}

/**
 * Constructs the Podr service URL that returns a feed as JSON
 * This function does NOT resolve Apple Podcasts URLs - use resolveFeedUrl first if needed
 * @param feedUrl - The RSS feed URL to convert to JSON
 * @param maxCount - Maximum number of items to return (default: 300)
 * @returns The service URL for fetching the JSON feed
 * @throws {Error} When the feedUrl is invalid
 */
export function getFeedUrl(
  feedUrl: string,
  maxCount: number = FEED_CONFIG.DEFAULT_MAX_COUNT
): string {
  if (!feedUrl || typeof feedUrl !== 'string') {
    throw new Error('Invalid feed URL: URL must be a non-empty string');
  }

  if (maxCount <= 0 || !Number.isInteger(maxCount)) {
    throw new Error('Invalid maxCount: Must be a positive integer');
  }

  const searchParams = new URLSearchParams({
    rss_url: feedUrl,
    count: maxCount.toString(),
  });

  return `${APP_CONFIG.API_BASE_URL}/feed?${searchParams.toString()}`;
}

/**
 * Converts an IterableIterator to an array with better type inference
 * @param iterator - The iterator to convert
 * @returns An array containing all elements from the iterator
 */
export function toArray<T>(iterator: IterableIterator<T>): T[] {
  return [...iterator];
}
