/**
 * Converts an HTTP URL to HTTPS for security
 * @param url The URL to secure
 * @returns The secured URL (HTTPS)
 */
export function getSecureUrl(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * Constructs a URL for the RSS to JSON API
 * @param feedUrl The RSS feed URL to convert to JSON
 * @param maxCount Maximum number of items to return
 * @returns The API URL for fetching JSON feed
 */
export function getFeedUrl(feedUrl: string, maxCount: number = 300): string {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
    feedUrl
  )}&api_key=xwxutnum3sroxsxlretuqp0dvigu3hsbeydbhbo6&count=${maxCount}`;
}

/**
 * Converts an IterableIterator to an array
 * @param iterator The iterator to convert
 * @returns An array containing all elements from the iterator
 */
export function ToArray<T>(iterator: IterableIterator<T>): Array<T> {
  return [...iterator];
}
