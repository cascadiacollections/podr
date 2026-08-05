const { DEFAULT_API_BASE_URL, resolveApiConfig } = require('../api');

describe('resolveApiConfig', () => {
  it('uses the hosted Podr service by default', () => {
    expect(resolveApiConfig({})).toEqual({
      baseUrl: DEFAULT_API_BASE_URL,
      topPodcastsUrl: `${DEFAULT_API_BASE_URL}/?q=toppodcasts&limit=10`,
    });
  });

  it('uses a normalized self-hosted service origin for all API endpoints', () => {
    expect(resolveApiConfig({ PODR_API_BASE_URL: 'https://podr.example.org/' })).toEqual({
      baseUrl: 'https://podr.example.org',
      topPodcastsUrl: 'https://podr.example.org/?q=toppodcasts&limit=10',
    });
  });

  it('allows an HTTP localhost service for development', () => {
    expect(resolveApiConfig({ PODR_API_BASE_URL: 'http://localhost:8787' }).baseUrl).toBe(
      'http://localhost:8787'
    );
  });

  it.each(['podr.example.org', 'http://podr.example.org', 'https://podr.example.org/api'])(
    'rejects an invalid service origin: %s',
    (url) => {
      expect(() => resolveApiConfig({ PODR_API_BASE_URL: url })).toThrow(
        /PODR_API_BASE_URL/
      );
    }
  );
});
