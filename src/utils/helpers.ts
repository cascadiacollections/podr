export function getSecureUrl(url: string): string {
  return url.replace('http://', 'https://');
}

export function getFeedUrl(feedUrl: string, maxCount: number = 300): string {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
    feedUrl
  )}&api_key=xwxutnum3sroxsxlretuqp0dvigu3hsbeydbhbo6&count=${maxCount}`;
}
