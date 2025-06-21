import { getSecureUrl, getFeedUrl, toArray } from '../helpers';

describe('helpers', () => {
  describe('getSecureUrl', () => {
    it('should convert HTTP to HTTPS', () => {
      const httpUrl = 'http://example.com';
      const result = getSecureUrl(httpUrl);
      expect(result).toBe('https://example.com');
    });

    it('should leave HTTPS URLs unchanged', () => {
      const httpsUrl = 'https://example.com';
      const result = getSecureUrl(httpsUrl);
      expect(result).toBe('https://example.com');
    });

    it('should handle URLs with paths and query parameters', () => {
      const httpUrl = 'http://example.com/path?query=value';
      const result = getSecureUrl(httpUrl);
      expect(result).toBe('https://example.com/path?query=value');
    });

    it('should throw error for empty string', () => {
      expect(() => getSecureUrl('')).toThrow('Invalid URL: URL must be a non-empty string');
    });

    it('should throw error for null/undefined', () => {
      expect(() => getSecureUrl(null as any)).toThrow('Invalid URL: URL must be a non-empty string');
      expect(() => getSecureUrl(undefined as any)).toThrow('Invalid URL: URL must be a non-empty string');
    });

    it('should throw error for non-string input', () => {
      expect(() => getSecureUrl(123 as any)).toThrow('Invalid URL: URL must be a non-empty string');
    });
  });

  describe('getFeedUrl', () => {
    it('should construct valid RSS feed URL with default count', () => {
      const feedUrl = 'https://example.com/feed.rss';
      const result = getFeedUrl(feedUrl);
      
      expect(result).toContain('https://api.rss2json.com/v1/api.json');
      expect(result).toContain('rss_url=https%3A%2F%2Fexample.com%2Ffeed.rss');
      expect(result).toContain('api_key=xwxutnum3sroxsxlretuqp0dvigu3hsbeydbhbo6');
      expect(result).toContain('count=300');
    });

    it('should construct valid RSS feed URL with custom count', () => {
      const feedUrl = 'https://example.com/feed.rss';
      const customCount = 100;
      const result = getFeedUrl(feedUrl, customCount);
      
      expect(result).toContain('count=100');
    });

    it('should throw error for empty feed URL', () => {
      expect(() => getFeedUrl('')).toThrow('Invalid feed URL: URL must be a non-empty string');
    });

    it('should throw error for null/undefined feed URL', () => {
      expect(() => getFeedUrl(null as any)).toThrow('Invalid feed URL: URL must be a non-empty string');
      expect(() => getFeedUrl(undefined as any)).toThrow('Invalid feed URL: URL must be a non-empty string');
    });

    it('should throw error for non-string feed URL', () => {
      expect(() => getFeedUrl(123 as any)).toThrow('Invalid feed URL: URL must be a non-empty string');
    });

    it('should throw error for zero maxCount', () => {
      expect(() => getFeedUrl('https://example.com/feed.rss', 0)).toThrow('Invalid maxCount: Must be a positive integer');
    });

    it('should throw error for negative maxCount', () => {
      expect(() => getFeedUrl('https://example.com/feed.rss', -5)).toThrow('Invalid maxCount: Must be a positive integer');
    });

    it('should throw error for non-integer maxCount', () => {
      expect(() => getFeedUrl('https://example.com/feed.rss', 3.14)).toThrow('Invalid maxCount: Must be a positive integer');
    });
  });

  describe('toArray', () => {
    it('should convert Set to array', () => {
      const set = new Set([1, 2, 3]);
      const result = toArray(set.values());
      expect(result).toEqual([1, 2, 3]);
    });

    it('should convert Map keys to array', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const result = toArray(map.keys());
      expect(result).toEqual(['a', 'b']);
    });

    it('should handle empty iterator', () => {
      const set = new Set();
      const result = toArray(set.values());
      expect(result).toEqual([]);
    });
  });
});