'use strict';

const webpack = require('webpack');

/**
 * Build-time sitemap.xml and robots.txt.
 *
 * Podcast pages (#154, made linkable in #155) are `/?feed=<feed URL>`. For a
 * top podcast that URL is the Apple Podcasts page the app stores as `feedUrl`.
 * The list is the same top-podcasts payload the page inlines, fetched during a
 * production build and taken from the fallback list otherwise.
 */

/** Keep in step with PRIVACY_PATH in src/ui/PrivacyPolicy.tsx. */
const PRIVACY_PATH = '/privacy';

const PLUGIN_NAME = 'SitemapPlugin';
const HTTP_URL_PATTERN = /^https?:\/\//i;
const RELEASE_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})/;

/**
 * @param {string} value
 * @returns {string}
 */
function xmlEscape(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * The address bar URL the app writes when that podcast is opened.
 * Uses URLSearchParams so the encoding matches `getPageUrl` in the client.
 *
 * @param {string} origin
 * @param {string} feedUrl
 * @returns {string}
 */
function podcastPageUrl(origin, feedUrl) {
  const url = new URL('/', origin);
  url.searchParams.set('feed', feedUrl);
  return url.href;
}

/**
 * @param {unknown} payload
 * @returns {Array<{ feedUrl: string, lastmod?: string }>}
 */
function collectPodcastPages(payload) {
  const entries =
    payload &&
    typeof payload === 'object' &&
    payload.feed &&
    Array.isArray(payload.feed.entry)
      ? payload.feed.entry
      : [];

  const seen = new Set();
  const pages = [];

  for (const entry of entries) {
    const label = entry && entry.id && entry.id.label;

    if (typeof label !== 'string' || !HTTP_URL_PATTERN.test(label.trim())) {
      continue;
    }

    const feedUrl = label.trim();

    if (seen.has(feedUrl)) {
      continue;
    }

    seen.add(feedUrl);

    const release = entry['im:releaseDate'] && entry['im:releaseDate'].label;
    const lastmod =
      typeof release === 'string' ? RELEASE_DATE_PATTERN.exec(release.trim()) : null;

    pages.push(lastmod ? { feedUrl, lastmod: lastmod[1] } : { feedUrl });
  }

  return pages;
}

/**
 * @param {{ loc: string, changefreq: string, priority: string, lastmod?: string }} page
 * @returns {string}
 */
function renderUrl(page) {
  const lines = ['  <url>', `    <loc>${xmlEscape(page.loc)}</loc>`];

  if (page.lastmod) {
    lines.push(`    <lastmod>${xmlEscape(page.lastmod)}</lastmod>`);
  }

  lines.push(`    <changefreq>${page.changefreq}</changefreq>`);
  lines.push(`    <priority>${page.priority}</priority>`);
  lines.push('  </url>');

  return lines.join('\n');
}

/**
 * @param {{ origin: string, pages: Array<{ feedUrl: string, lastmod?: string }>, lastmod?: string }} options
 * @returns {string}
 */
function renderSitemap({ origin, pages, lastmod }) {
  const urls = [
    renderUrl({ loc: `${origin}/`, changefreq: 'daily', priority: '1.0', lastmod }),
    renderUrl({ loc: `${origin}${PRIVACY_PATH}`, changefreq: 'yearly', priority: '0.3' }),
    ...pages.map((page) =>
      renderUrl({
        loc: podcastPageUrl(origin, page.feedUrl),
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: page.lastmod || lastmod
      })
    )
  ];

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls.join('\n')}\n` +
    '</urlset>\n'
  );
}

/**
 * @param {string} origin
 * @returns {string}
 */
function renderRobots(origin) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

/**
 * @param {{ production: boolean, topPodcastsUrl: string, fallbackData: unknown, fetchImpl?: typeof fetch, timeoutMs?: number }} options
 * @returns {Promise<unknown>}
 */
async function loadTopPodcasts({ production, topPodcastsUrl, fallbackData, fetchImpl, timeoutMs = 10000 }) {
  if (!production) {
    return fallbackData;
  }

  const fetchFn = fetchImpl || globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    console.warn('[podr] sitemap: fetch is unavailable; using fallback top podcasts');
    return fallbackData;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(topPodcastsUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (collectPodcastPages(payload).length === 0) {
      throw new Error('response did not include any podcast pages');
    }

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[podr] sitemap: ${message}; using fallback top podcasts`);
    return fallbackData;
  } finally {
    clearTimeout(timer);
  }
}

class SitemapPlugin {
  /**
   * @param {{ production: boolean, origin: string, topPodcastsUrl: string, fallbackData: unknown, fetchImpl?: typeof fetch, timeoutMs?: number, now?: () => Date }} options
   */
  constructor(options) {
    this.production = options.production;
    this.origin = options.origin;
    this.topPodcastsUrl = options.topPodcastsUrl;
    this.fallbackData = options.fallbackData;
    this.fetchImpl = options.fetchImpl;
    this.timeoutMs = options.timeoutMs;
    this.now = options.now || (() => new Date());
  }

  /**
   * @param {import('webpack').Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        async () => {
          const payload = await loadTopPodcasts({
            production: this.production,
            topPodcastsUrl: this.topPodcastsUrl,
            fallbackData: this.fallbackData,
            fetchImpl: this.fetchImpl,
            timeoutMs: this.timeoutMs
          });
          const pages = collectPodcastPages(payload);
          const lastmod = this.now().toISOString().slice(0, 10);
          const sitemap = renderSitemap({ origin: this.origin, pages, lastmod });
          const robots = renderRobots(this.origin);

          emitText(compilation, 'sitemap.xml', sitemap);
          emitText(compilation, 'robots.txt', robots);

          console.log(`[podr] sitemap: ${pages.length} podcast page(s) on ${this.origin}`);
        }
      );
    });
  }
}

/**
 * @param {import('webpack').Compilation} compilation
 * @param {string} name
 * @param {string} text
 */
function emitText(compilation, name, text) {
  const source = new webpack.sources.RawSource(text);

  if (compilation.getAsset(name)) {
    compilation.updateAsset(name, source);
    return;
  }

  compilation.emitAsset(name, source);
}

module.exports = {
  PRIVACY_PATH,
  SitemapPlugin,
  collectPodcastPages,
  loadTopPodcasts,
  podcastPageUrl,
  renderRobots,
  renderSitemap
};
