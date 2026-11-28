const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { ADS_TXT_PLACEHOLDER, applyAdsPublisherId, resolveAdsConfig } = require('../ads');
const {
  PRIVACY_LASTMOD,
  PRIVACY_PATH,
  renderRobots,
  renderSitemap
} = require('../sitemap');
const { DEFAULT_SITE_ORIGIN, resolveSiteConfig } = require('../site');

/** Every <loc> in a sitemap, in order. */
function locs(sitemap) {
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

/** Every <lastmod> in a sitemap, in order. */
function lastmods(sitemap) {
  return [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
}

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

describe('sitemap and robots documents', () => {
  const now = new Date('2026-11-28T00:00:00.000Z');

  it('lists only the home page and the privacy policy', () => {
    const sitemap = renderSitemap({ origin: 'https://podrapp.com', now });

    expect(locs(sitemap)).toEqual([
      'https://podrapp.com/',
      `https://podrapp.com${PRIVACY_PATH}`
    ]);
    expect(sitemap).not.toContain('?feed=');
    expect(sitemap).not.toContain('feed=');
    expect(lastmods(sitemap)).toEqual(['2026-11-28', PRIVACY_LASTMOD]);
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(locs(sitemap).every((loc) => new URL(loc).search === '')).toBe(true);
  });

  it('never emits a lastmod after the build day', () => {
    const sitemap = renderSitemap({
      origin: 'https://podrapp.com',
      now: new Date('2026-01-15T12:00:00.000Z'),
      privacyLastmod: '2099-12-02'
    });

    expect(lastmods(sitemap)).toEqual(['2026-01-15', '2026-01-15']);
    expect(sitemap).not.toContain('2099');
    expect(sitemap).not.toContain('?feed=');
  });

  it('replaces a privacy date that is not a day', () => {
    const sitemap = renderSitemap({
      origin: 'https://podrapp.com',
      now,
      privacyLastmod: 'November 13, 2026'
    });

    expect(lastmods(sitemap)).toEqual(['2026-11-28', '2026-11-28']);
  });

  it('points robots.txt at that sitemap', () => {
    expect(renderRobots('https://podrapp.com')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://podrapp.com/sitemap.xml\n'
    );
  });

  it('keeps the privacy path and update date aligned with the page', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/ui/PrivacyPolicy.tsx'),
      'utf8'
    );

    expect(source).toContain(`PRIVACY_PATH = '${PRIVACY_PATH}'`);
    expect(source).toContain("const LAST_UPDATED = 'November 13, 2026'");
    expect(PRIVACY_LASTMOD).toBe('2026-11-13');
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

describe('sitemap emission', () => {
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
      const directory = ${JSON.stringify(directory)};

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
            origin: 'https://podrapp.com',
            now: () => new Date('2026-11-28T00:00:00.000Z')
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
    expect(locs(sitemap)).toEqual(['https://podrapp.com/', 'https://podrapp.com/privacy']);
    expect(sitemap).not.toContain('?feed=');
    expect(lastmods(sitemap).every((day) => day <= '2026-11-28')).toBe(true);
    expect(robots).toContain('Sitemap: https://podrapp.com/sitemap.xml');
    expect(ads).toContain('pub-1234567890123456');
    expect(ads).not.toContain(ADS_TXT_PLACEHOLDER);

    fs.rmSync(directory, { recursive: true, force: true });
  }, 30000);
});
