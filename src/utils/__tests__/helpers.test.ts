import { 
  getSecureUrl, 
  getFeedUrl, 
  toArray,
  isApplePodcastsUrl,
  extractApplePodcastsId,
  fetchApplePodcastsFeedUrl,
  resolveFeedUrl,
} from '../helpers';

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

  describe('isApplePodcastsUrl', () => {
    it('should return true for valid Apple Podcasts URLs', () => {
      const validUrls = [
        'https://podcasts.apple.com/us/podcast/adrift/id1834242268',
        'https://podcasts.apple.com/us/podcast/adrift/id1834242268?uo=2',
        'http://podcasts.apple.com/gb/podcast/some-show/id123456789',
      ];
      
      validUrls.forEach(url => {
        expect(isApplePodcastsUrl(url)).toBe(true);
      });
    });

    it('should return false for non-Apple Podcasts URLs', () => {
      const invalidUrls = [
        'https://example.com/feed.rss',
        'https://podcasts.google.com/feed/123',
        'https://apple.com/podcast',
        '',
        null as any,
      ];
      
      invalidUrls.forEach(url => {
        expect(isApplePodcastsUrl(url)).toBe(false);
      });
    });
  });

  describe('extractApplePodcastsId', () => {
    it('should extract podcast ID from valid Apple Podcasts URLs', () => {
      const testCases = [
        { url: 'https://podcasts.apple.com/us/podcast/adrift/id1834242268', expectedId: '1834242268' },
        { url: 'https://podcasts.apple.com/us/podcast/adrift/id1834242268?uo=2', expectedId: '1834242268' },
        { url: 'http://podcasts.apple.com/gb/podcast/some-show/id123456789', expectedId: '123456789' },
      ];
      
      testCases.forEach(({ url, expectedId }) => {
        expect(extractApplePodcastsId(url)).toBe(expectedId);
      });
    });

    it('should return null for invalid URLs', () => {
      const invalidUrls = [
        'https://example.com/feed.rss',
        'https://podcasts.apple.com/us/podcast/no-id',
        '',
        null as any,
      ];
      
      invalidUrls.forEach(url => {
        expect(extractApplePodcastsId(url)).toBeNull();
      });
    });
  });

  describe('fetchApplePodcastsFeedUrl', () => {
    beforeEach(() => {
      // Reset fetch mock before each test
      global.fetch = jest.fn();
    });

    it('should fetch and return RSS feed URL from Apple Podcasts API', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          results: [
            {
              feedUrl: 'https://feeds.example.com/podcast.rss',
            },
          ],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await fetchApplePodcastsFeedUrl('1834242268');
      
      expect(result).toBe('https://feeds.example.com/podcast.rss');
      expect(global.fetch).toHaveBeenCalledWith('https://itunes.apple.com/lookup?id=1834242268&entity=podcast');
    });

    it('should throw error for invalid podcast ID', async () => {
      await expect(fetchApplePodcastsFeedUrl('')).rejects.toThrow('Invalid podcast ID');
      await expect(fetchApplePodcastsFeedUrl(null as any)).rejects.toThrow('Invalid podcast ID');
    });

    it('should throw error when API request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });
      
      await expect(fetchApplePodcastsFeedUrl('1234')).rejects.toThrow('Apple Podcasts lookup failed with status: 404');
    });

    it('should throw error when no results are found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });
      
      await expect(fetchApplePodcastsFeedUrl('1234')).rejects.toThrow('No podcast found for the given ID');
    });

    it('should throw error when feed URL is not in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{}],
        }),
      });
      
      await expect(fetchApplePodcastsFeedUrl('1234')).rejects.toThrow('Feed URL not found in Apple Podcasts response');
    });
  });

  describe('resolveFeedUrl', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should resolve Apple Podcasts URLs to RSS feed URLs', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          results: [
            {
              feedUrl: 'https://feeds.example.com/podcast.rss',
            },
          ],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await resolveFeedUrl('https://podcasts.apple.com/us/podcast/adrift/id1834242268');
      
      expect(result).toBe('https://feeds.example.com/podcast.rss');
    });

    it('should return non-Apple Podcasts URLs unchanged', async () => {
      const url = 'https://feeds.example.com/podcast.rss';
      const result = await resolveFeedUrl(url);
      
      expect(result).toBe(url);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error for invalid URLs', async () => {
      await expect(resolveFeedUrl('')).rejects.toThrow('Invalid feed URL');
      await expect(resolveFeedUrl(null as any)).rejects.toThrow('Invalid feed URL');
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