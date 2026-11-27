const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ADS_TXT_PLACEHOLDER, applyAdsPublisherId, resolveAdsConfig } = require('../ads');
const {
  PRIVACY_PATH,
  collectPodcastPages,
  loadTopPodcasts,
  podcastPageUrl,
  renderRobots,
  renderSitemap
} = require('../sitemap');
const { DEFAULT_SITE_ORIGIN, resolveSiteConfig } = require('../site');
const fallbackTopPodcasts = require('../top-podcasts-fallback');

const DAILY =
  'https://podcasts.apple.com/us/podcast/the-daily/id1200361736?uo=2';

describe('resolveSiteConfig', () => {
  it('defaults to the canonical podrapp.com origin', () => {
    expect(resolveSiteConfig({})).toEqual({ origin: DEFAULT_SITE_ORIGIN });
    expect(DEFAULT_SITE_ORIGIN).toBe('https://podrapp.com');
  });

  it('accepts a self-hosted https origin and a localhost http origin', () => {
    expect(resolveSiteConfig({ PODR_SITE_ORIGIN: 'https://podr.example.org/' }).origin).toBe(
      'https://podr.example.org'
    );
    expect(resolveSiteConfig({ PODR_SITE_ORIGIN: 'http://localhost:9000' }).origin).toBe(
      'http://localhost:9000'
    );
  });

  it.each([
    'podrapp.com',
    'http://podr.example.org',
    'https://podrapp.com/sitemap.xml',
    'https://podrapp.com/?feed=1'
  ])('rejects an origin that is not just an origin: %s', (url) => {
    expect(() => resolveSiteConfig({ PODR_SITE_ORIGIN: url })).toThrow(/PODR_SITE_ORIGIN/);
  });
});

describe('podcast pages', () => {
  it('builds the same ?feed= URL the app puts in the address bar', () => {
    expect(podcastPageUrl('https://podrapp.com', DAILY)).toBe(
      'https://podrapp.com/?feed=https%3A%2F%2Fpodcasts.apple.com%2Fus%2Fpodcast%2Fthe-daily%2Fid1200361736%3Fuo%3D2'
    );
  });

  it('keeps ampersands inside the feed value percent-encoded', () => {
    const loc = podcastPageUrl('https://podrapp.com', 'https://example.com/rss?a=1&b=2');

    expect(loc).toBe(
      'https://podrapp.com/?feed=https%3A%2F%2Fexample.com%2Frss%3Fa%3D1%26b%3D2'
    );
    expect(loc).not.toContain('&b=');
  });

  it('reads Apple page URLs from a top-podcasts payload and skips junk', () => {
    const pages = collectPodcastPages({
      feed: {
        entry: [
          { id: { label: DAILY }, 'im:releaseDate': { label: '2026-10-25T03:00:00-07:00' } },
          { id: { label: `  ${DAILY}  ` } },
          { id: { label: 'not a url' } },
          { id: { label: 'javascript:alert(1)' } },
          null,
          { title: { label: 'no id' } }
        ]
      }
    });

    expect(pages).toEqual([{ feedUrl: DAILY, lastmod: '2026-10-25' }]);
  });

  it('returns no pages for a payload that is not a top-podcasts feed', () => {
    expect(collectPodcastPages(null)).toEqual([]);
    expect(collectPodcastPages({ feed: { entry: 'nope' } })).toEqual([]);
  });
});

/** The distinct hostnames of every <loc> in a sitemap. */
function locHosts(sitemap) {
  return [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).hostname))];
}

describe('sitemap and robots documents', () => {
  const pages = [{ feedUrl: DAILY, lastmod: '2026-10-25' }];

  it('uses the canonical origin for every URL', () => {
    const sitemap = renderSitemap({
      origin: 'https://podrapp.com',
      pages,
      lastmod: '2026-11-01'
    });

    expect(sitemap).toContain('<loc>https://podrapp.com/</loc>');
    expect(sitemap).toContain(`<loc>https://podrapp.com${PRIVACY_PATH}</loc>`);
    expect(sitemap).toContain(
      '<loc>https://podrapp.com/?feed=https%3A%2F%2Fpodcasts.apple.com%2Fus%2Fpodcast%2Fthe-daily%2Fid1200361736%3Fuo%3D2</loc>'
    );
    expect(sitemap).toContain('<lastmod>2026-10-25</lastmod>');
    expect(locHosts(sitemap)).toEqual(['podrapp.com']);
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('points robots.txt at that sitemap', () => {
    expect(renderRobots('https://podrapp.com')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://podrapp.com/sitemap.xml\n'
    );
  });

  it('keeps the privacy path aligned with the page', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/ui/PrivacyPolicy.tsx'),
      'utf8'
    );

    expect(source).toContain(`PRIVACY_PATH = '${PRIVACY_PATH}'`);
  });
});

describe('loadTopPodcasts', () => {
  it('does not call the network for a development build', async () => {
    const fetchImpl = jest.fn();
    const payload = await loadTopPodcasts({
      production: false,
      topPodcastsUrl: 'https://podr.example.org/?q=toppodcasts',
      fallbackData: fallbackTopPodcasts,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(collectPodcastPages(payload)).toHaveLength(3);
  });

  it('uses a successful production response', async () => {
    const live = { feed: { entry: [{ id: { label: DAILY } }] } };
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => live
    }));

    const payload = await loadTopPodcasts({
      production: true,
      topPodcastsUrl: 'https://podr.example.org/?q=toppodcasts&limit=10',
      fallbackData: fallbackTopPodcasts,
      fetchImpl
    });

    expect(payload).toBe(live);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://podr.example.org/?q=toppodcasts&limit=10',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('falls back when the production request fails or has no pages', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ feed: { entry: [] } })
    }));

    const payload = await loadTopPodcasts({
      production: true,
      topPodcastsUrl: 'https://podr.example.org/?q=toppodcasts',
      fallbackData: fallbackTopPodcasts,
      fetchImpl
    });

    expect(collectPodcastPages(payload).map((page) => page.feedUrl)).toEqual(
      fallbackTopPodcasts.feed.entry.map((entry) => entry.id.label)
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('ads.txt publisher id', () => {
  const template = `google.com, ${ADS_TXT_PLACEHOLDER}, DIRECT, f08c47fec0942fa0\n`;

  it('leaves the placeholder when no id is configured', () => {
    expect(resolveAdsConfig({})).toEqual({ publisherId: null });
    expect(applyAdsPublisherId(template, null)).toBe(template);
  });

  it('replaces the placeholder with a real publisher id', () => {
    expect(resolveAdsConfig({ PODR_ADSENSE_PUBLISHER_ID: 'pub-1234567890123456' })).toEqual({
      publisherId: 'pub-1234567890123456'
    });
    expect(applyAdsPublisherId(template, 'pub-1234567890123456')).toBe(
      'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n'
    );
    expect(applyAdsPublisherId(template, 'pub-1234567890123456')).not.toContain(ADS_TXT_PLACEHOLDER);
  });

  it.each(['pub-123', 'ca-pub-1234567890123456', 'PUB-1234567890123456'])(
    'rejects an id that is not pub- and 16 digits: %s',
    (publisherId) => {
      expect(() => resolveAdsConfig({ PODR_ADSENSE_PUBLISHER_ID: publisherId })).toThrow(
        /PODR_ADSENSE_PUBLISHER_ID/
      );
    }
  );
});

describe('search-file hosting', () => {
  const root = path.resolve(__dirname, '../..');
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

  // Cloudflare Pages has no rewrite rule to get wrong: it serves a file that
  // exists in dist/, and answers any other path with index.html for as long
  // as the build ships no 404.html. A catch-all in a _redirects file would
  // replace that with a rule that can shadow robots.txt, ads.txt and the
  // sitemaps, so neither file may appear.
  it('leaves the SPA fallback to Cloudflare Pages so crawler files stay files', () => {
    const shipped = [
      ...fs.readdirSync(path.join(root, 'assets')),
      ...fs.readdirSync(path.join(root, 'deploy/cloudflare'))
    ];

    expect(shipped).toContain('_headers');
    expect(shipped).toContain('ads.txt');
    expect(shipped).not.toContain('404.html');
    expect(shipped).not.toContain('_redirects');

    const webpackConfig = read('webpack.config.js');
    expect(webpackConfig).not.toContain('404.html');
    expect(webpackConfig).not.toContain('_redirects');

    // Pages picks the Content-Type from the file extension. A rule here could
    // only override that for the crawler files.
    expect(read('deploy/cloudflare/_headers')).not.toMatch(/^\s+Content-Type:/im);
  });

  it('keeps the service worker from treating those files as the app shell', () => {
    const sw = read('assets/sw.js');

    expect(sw).toContain("url.pathname === '/robots.txt'");
    expect(sw).toContain("url.pathname === '/ads.txt'");
    expect(sw).toContain("url.pathname === '/sitemap.xml'");
    expect(sw).toContain("url.pathname === '/podr-sitemap.xml'");
  });

  it('emits sitemap.xml, robots.txt, and a rewritten ads.txt', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'podr-sitemap-'));
    const root = path.resolve(__dirname, '../..');
    const assets = path.join(directory, 'assets');
    fs.mkdirSync(assets);
    fs.writeFileSync(path.join(directory, 'entry.js'), 'console.log("podr");\n');
    fs.writeFileSync(
      path.join(assets, 'ads.txt'),
      `google.com, ${ADS_TXT_PLACEHOLDER}, DIRECT, f08c47fec0942fa0\n`
    );

    // Webpack needs Node's setImmediate, which the jsdom test environment does
    // not provide, so the compile runs in a plain Node process.
    const script = `
      'use strict';
      const path = require('path');
      const webpack = require(${JSON.stringify(path.join(root, 'node_modules/webpack'))});
      const { SitemapPlugin } = require(${JSON.stringify(path.join(root, 'config/sitemap.js'))});
      const CopyAssetsPlugin = require(${JSON.stringify(path.join(root, 'webpack-plugins/copy-assets-plugin.js'))});
      const fallbackTopPodcasts = require(${JSON.stringify(path.join(root, 'config/top-podcasts-fallback.js'))});
      const directory = ${JSON.stringify(directory)};
      const daily = ${JSON.stringify(DAILY)};

      webpack({
        mode: 'none',
        entry: path.join(directory, 'entry.js'),
        output: { path: path.join(directory, 'dist'), filename: 'bundle.js' },
        plugins: [
          new CopyAssetsPlugin({
            from: path.join(directory, 'assets'),
            files: ['ads.txt'],
            publisherId: 'pub-1234567890123456'
          }),
          new SitemapPlugin({
            production: true,
            origin: 'https://podrapp.com',
            topPodcastsUrl: 'https://podr.example.org/?q=toppodcasts&limit=10',
            fallbackData: fallbackTopPodcasts,
            fetchImpl: async () => ({
              ok: true,
              json: async () => ({ feed: { entry: [{ id: { label: daily } }] } })
            }),
            now: () => new Date('2026-11-01T00:00:00.000Z')
          })
        ]
      }, (error, stats) => {
        if (error) {
          console.error(error);
          process.exit(1);
        }
        if (stats.hasErrors()) {
          console.error(stats.toJson().errors.map((entry) => entry.message).join('\\n'));
          process.exit(1);
        }
      });
    `;
    fs.writeFileSync(path.join(directory, 'compile.js'), script);

    const result = spawnSync(process.execPath, [path.join(directory, 'compile.js')], {
      encoding: 'utf8'
    });

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({
      status: 0
    });

    const dist = path.join(directory, 'dist');
    const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
    const published = fs.readFileSync(path.join(dist, 'podr-sitemap.xml'), 'utf8');
    const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
    const ads = fs.readFileSync(path.join(dist, 'ads.txt'), 'utf8');

    expect(published).toBe(sitemap);
    expect(sitemap).toContain('https://podrapp.com/?feed=');
    expect(sitemap).toContain('the-daily');
    expect(locHosts(sitemap)).toEqual(['podrapp.com']);
    expect(robots).toContain('Sitemap: https://podrapp.com/sitemap.xml');
    expect(ads).toContain('pub-1234567890123456');
    expect(ads).not.toContain(ADS_TXT_PLACEHOLDER);

    fs.rmSync(directory, { recursive: true, force: true });
  }, 30000);
});
