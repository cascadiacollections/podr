'use strict';

const webpack = require('webpack');

/**
 * Build-time sitemap.xml and robots.txt.
 *
 * The crawlable documents are `/` and `/privacy`. Podcast links are
 * `/?feed=` on the home document. They are not separate pages, so they are
 * not listed; the home canonical drops the query string.
 *
 * lastmod is never later than the build's UTC date. `/` uses that date.
 * `/privacy` uses the policy's update date when it is not in the future.
 * Keep PRIVACY_LASTMOD in step with LAST_UPDATED in src/ui/PrivacyPolicy.tsx.
 */

/** Keep in step with PRIVACY_PATH in src/ui/PrivacyPolicy.tsx. */
const PRIVACY_PATH = '/privacy';

/** November 13, 2026. Keep in step with LAST_UPDATED in src/ui/PrivacyPolicy.tsx. */
const PRIVACY_LASTMOD = '2026-11-13';

const PLUGIN_NAME = 'SitemapPlugin';
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
 * @param {Date} now
 * @returns {string}
 */
function utcDay(now) {
  return now.toISOString().slice(0, 10);
}

/**
 * A sitemap lastmod in the future is invalid. Dates we cannot read, and dates
 * after the build day, become the build day.
 *
 * @param {string | undefined} value
 * @param {string} today
 * @returns {string}
 */
function clampLastmod(value, today) {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value) || value > today) {
    return today;
  }

  return value;
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
 * @param {{ origin: string, now?: Date, privacyLastmod?: string }} [options]
 * @returns {string}
 */
function renderSitemap({ origin, now = new Date(), privacyLastmod = PRIVACY_LASTMOD } = {}) {
  const today = utcDay(now);
  const urls = [
    renderUrl({ loc: `${origin}/`, changefreq: 'daily', priority: '1.0', lastmod: today }),
    renderUrl({
      loc: `${origin}${PRIVACY_PATH}`,
      changefreq: 'yearly',
      priority: '0.3',
      lastmod: clampLastmod(privacyLastmod, today)
    })
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

class SitemapPlugin {
  /**
   * @param {{ origin: string, now?: () => Date, privacyLastmod?: string }} options
   */
  constructor(options) {
    this.origin = options.origin;
    this.now = options.now || (() => new Date());
    this.privacyLastmod = options.privacyLastmod;
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
          const sitemap = renderSitemap({
            origin: this.origin,
            now: this.now(),
            privacyLastmod: this.privacyLastmod
          });
          const robots = renderRobots(this.origin);

          // sitemap.xml is what robots.txt points at. The same document is
          // also emitted as podr-sitemap.xml: the hosted site used to publish
          // it under that name, and the URL keeps resolving for any crawler
          // that still has it.
          emitText(compilation, 'sitemap.xml', sitemap);
          emitText(compilation, 'podr-sitemap.xml', sitemap);
          emitText(compilation, 'robots.txt', robots);

          console.log(`[podr] sitemap: / and /privacy on ${this.origin}`);
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
  PRIVACY_LASTMOD,
  PRIVACY_PATH,
  SitemapPlugin,
  renderRobots,
  renderSitemap
};
