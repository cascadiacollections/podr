const { resolveAnalyticsConfig, SUPPORTED_PROVIDERS } = require('../analytics');

describe('resolveAnalyticsConfig', () => {
  it('injects nothing when no provider is configured', () => {
    expect(resolveAnalyticsConfig({})).toEqual({
      provider: 'none',
      origins: [],
      snippet: '',
    });
  });

  it('treats an explicit none the same as unconfigured', () => {
    expect(resolveAnalyticsConfig({ PODR_ANALYTICS_PROVIDER: 'none' }).snippet).toBe('');
  });

  it('rejects an unknown provider', () => {
    expect(() => resolveAnalyticsConfig({ PODR_ANALYTICS_PROVIDER: 'matomo' })).toThrow(
      /Unknown PODR_ANALYTICS_PROVIDER/
    );
  });

  it('builds the Google Analytics snippet from the measurement id', () => {
    const { provider, snippet, origins } = resolveAnalyticsConfig({
      PODR_ANALYTICS_PROVIDER: 'gtag',
      PODR_ANALYTICS_SITE_ID: 'G-19Z3SPSJPY',
    });

    expect(provider).toBe('gtag');
    expect(snippet).toContain('https://www.googletagmanager.com/gtag/js?id=G-19Z3SPSJPY');
    expect(snippet).toContain("gtag('config', 'G-19Z3SPSJPY')");
    expect(origins).toContain('https://www.googletagmanager.com');
  });

  it('builds the Umami snippet and reports its origin for the CSP', () => {
    const { snippet, origins } = resolveAnalyticsConfig({
      PODR_ANALYTICS_PROVIDER: 'umami',
      PODR_ANALYTICS_HOST: 'https://stats.example.org',
      PODR_ANALYTICS_SITE_ID: 'abc-123',
    });

    expect(snippet).toBe(
      '<script defer src="https://stats.example.org/script.js" data-website-id="abc-123"></script>'
    );
    expect(origins).toEqual(['https://stats.example.org']);
  });

  it('builds the Plausible snippet from the host and site domain', () => {
    const { snippet } = resolveAnalyticsConfig({
      PODR_ANALYTICS_PROVIDER: 'plausible',
      PODR_ANALYTICS_HOST: 'https://stats.example.org',
      PODR_ANALYTICS_SITE_ID: 'podrapp.com',
    });

    expect(snippet).toBe(
      '<script defer data-domain="podrapp.com" src="https://stats.example.org/js/script.js"></script>'
    );
  });

  it('builds the GoatCounter snippet without requiring a site id', () => {
    const { snippet } = resolveAnalyticsConfig({
      PODR_ANALYTICS_PROVIDER: 'goatcounter',
      PODR_ANALYTICS_HOST: 'https://stats.example.org',
    });

    expect(snippet).toBe(
      '<script data-goatcounter="https://stats.example.org/count" async ' +
        'src="https://stats.example.org/count.js"></script>'
    );
  });

  it('drops a trailing slash on the host so URLs do not double up', () => {
    const { snippet } = resolveAnalyticsConfig({
      PODR_ANALYTICS_PROVIDER: 'umami',
      PODR_ANALYTICS_HOST: 'https://stats.example.org/',
      PODR_ANALYTICS_SITE_ID: 'abc-123',
    });

    expect(snippet).toContain('https://stats.example.org/script.js');
  });

  it('fails the build when a self-hosted provider has no host', () => {
    expect(() =>
      resolveAnalyticsConfig({
        PODR_ANALYTICS_PROVIDER: 'plausible',
        PODR_ANALYTICS_SITE_ID: 'podrapp.com',
      })
    ).toThrow(/PODR_ANALYTICS_HOST is required/);
  });

  it('fails the build when the host is not https', () => {
    expect(() =>
      resolveAnalyticsConfig({
        PODR_ANALYTICS_PROVIDER: 'umami',
        PODR_ANALYTICS_HOST: 'http://stats.example.org',
        PODR_ANALYTICS_SITE_ID: 'abc-123',
      })
    ).toThrow(/must use https/);
  });

  it('allows a plain-http localhost host for local testing', () => {
    expect(() =>
      resolveAnalyticsConfig({
        PODR_ANALYTICS_PROVIDER: 'umami',
        PODR_ANALYTICS_HOST: 'http://localhost:3000',
        PODR_ANALYTICS_SITE_ID: 'abc-123',
      })
    ).not.toThrow();
  });

  it('fails the build when a provider that needs a site id has none', () => {
    expect(() => resolveAnalyticsConfig({ PODR_ANALYTICS_PROVIDER: 'gtag' })).toThrow(
      /PODR_ANALYTICS_SITE_ID is required/
    );
  });

  it('escapes values so a site id cannot break out of its attribute', () => {
    const { snippet } = resolveAnalyticsConfig({
      PODR_ANALYTICS_PROVIDER: 'umami',
      PODR_ANALYTICS_HOST: 'https://stats.example.org',
      PODR_ANALYTICS_SITE_ID: '"><script>alert(1)</script>',
    });

    expect(snippet).not.toContain('<script>alert(1)');
    expect(snippet).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('accepts every documented provider', () => {
    expect(SUPPORTED_PROVIDERS).toEqual(['none', 'gtag', 'umami', 'plausible', 'goatcounter']);
  });
});
