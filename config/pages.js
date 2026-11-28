'use strict';

const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/**
 * The HTML documents the build emits.
 *
 * `/` and `/privacy` are real files with their own title, description,
 * canonical, and visible text. `404.html` is the Cloudflare Pages not-found
 * document (a top-level 404.html turns off the SPA fallback) and the file
 * nginx and Caddy serve with status 404.
 *
 * `privacy.html` is what Pages serves at `/privacy`. `privacy/index.html` is
 * what Pages serves at `/privacy/`, and what nginx and Caddy serve for the
 * `/privacy` directory. Both carry the same canonical URL.
 *
 * Asset URLs in the documents are root-absolute. A 404 is returned for paths
 * of any depth, and a relative script URL would 404 with the page.
 */

const ROOT = path.join(__dirname, '..');

const HOME_TITLE = 'Podr | Listen to your favorite podcasts';
const HOME_OG_TITLE = 'Podr: an open source podcast player for the web';
const HOME_OG_DESCRIPTION =
  'Search podcasts, star your favorites, and listen right in the browser. Free and MIT licensed.';

const PRIVACY_DESCRIPTION =
  'How Podr handles favorites stored on your device, podcast lookups, Google Analytics, and advertising cookies, and the choices you have.';
const PRIVACY_OG_DESCRIPTION =
  'What Podr stores on your device, what podcast lookups and Google receive, and how to opt out of analytics and ads.';

const NOT_FOUND_DESCRIPTION = 'That page is not on Podr. Search podcasts and listen from the home page.';

/**
 * Reads a single-quoted string export from a TypeScript source file so the
 * HTML title matches the title the app sets after it loads.
 *
 * @param {string} relativePath
 * @param {string} exportName
 * @returns {string}
 */
function readTsStringExport(relativePath, exportName) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const marker = `export const ${exportName} =`;
  const start = source.indexOf(marker);

  if (start === -1) {
    throw new Error(`${relativePath} is missing ${marker}`);
  }

  const quote = source.indexOf("'", start + marker.length);
  const end = source.indexOf("'", quote + 1);

  if (quote === -1 || end === -1) {
    throw new Error(`${relativePath} export ${exportName} is not a single-quoted one-line string`);
  }

  return source.slice(quote + 1, end);
}

const HOME_DESCRIPTION = readTsStringExport('src/ui/homeCopy.ts', 'HOME_LEDE');
const PRIVACY_TITLE = readTsStringExport('src/ui/PrivacyPolicy.tsx', 'PRIVACY_DOCUMENT_TITLE');
const NOT_FOUND_TITLE = readTsStringExport('src/ui/NotFound.tsx', 'NOT_FOUND_DOCUMENT_TITLE');

/**
 * @param {string} name
 * @returns {string}
 */
function readBody(name) {
  const file = path.join(ROOT, 'assets', 'prerender', name);
  return fs.readFileSync(file, 'utf8').trim();
}

/**
 * @param {string} origin
 * @param {string} canonicalPath
 * @returns {string}
 */
function canonicalUrl(origin, canonicalPath) {
  if (!canonicalPath) {
    return '';
  }

  if (!canonicalPath.startsWith('/')) {
    throw new Error(`canonical path must start with /: ${canonicalPath}`);
  }

  return canonicalPath === '/' ? `${origin}/` : `${origin}${canonicalPath}`;
}

const privacyPage = {
  title: PRIVACY_TITLE,
  description: PRIVACY_DESCRIPTION,
  ogTitle: PRIVACY_TITLE,
  ogDescription: PRIVACY_OG_DESCRIPTION,
  canonicalPath: '/privacy',
  robots: '',
  jsonLd: 'privacy',
  body: readBody('privacy.html')
};

/** @type {Array<{ id: string, filename: string, title: string, description: string, ogTitle: string, ogDescription: string, canonicalPath: string, robots: string, jsonLd: string, body: string }>} */
const PAGES = [
  {
    id: 'home',
    filename: 'index.html',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    ogTitle: HOME_OG_TITLE,
    ogDescription: HOME_OG_DESCRIPTION,
    canonicalPath: '/',
    robots: '',
    jsonLd: 'app',
    body: readBody('home.html')
  },
  { id: 'privacy', filename: 'privacy/index.html', ...privacyPage },
  { id: 'privacy', filename: 'privacy.html', ...privacyPage },
  {
    id: 'not-found',
    filename: '404.html',
    title: NOT_FOUND_TITLE,
    description: NOT_FOUND_DESCRIPTION,
    ogTitle: NOT_FOUND_TITLE,
    ogDescription: NOT_FOUND_DESCRIPTION,
    canonicalPath: '',
    robots: 'noindex',
    jsonLd: '',
    body: readBody('not-found.html')
  }
];

/**
 * @param {{ production: boolean, siteOrigin: string, analyticsSnippet: string, analyticsProvider: string, adsPublisherId: string | null, consentRegions: readonly string[] }} options
 * @returns {HtmlWebpackPlugin[]}
 */
function createHtmlPlugins(options) {
  return PAGES.map(
    (page) =>
      new HtmlWebpackPlugin({
        template: 'assets/index.html',
        filename: page.filename,
        favicon: 'assets/favicon.ico',
        // Root-absolute, so a 404 served at /any/depth still loads the bundles.
        publicPath: '/',
        inject: true,
        analyticsSnippet: options.analyticsSnippet,
        analyticsProvider: options.analyticsProvider,
        siteOrigin: options.siteOrigin,
        adsPublisherId: options.adsPublisherId,
        consentRegions: options.consentRegions,
        title: page.title,
        description: page.description,
        ogTitle: page.ogTitle,
        ogDescription: page.ogDescription,
        canonicalUrl: canonicalUrl(options.siteOrigin, page.canonicalPath),
        robots: page.robots,
        jsonLd: page.jsonLd,
        bodyHtml: page.body,
        minify: options.production
          ? {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              useShortDoctype: true
            }
          : false
      })
  );
}

module.exports = {
  HOME_DESCRIPTION,
  HOME_OG_DESCRIPTION,
  HOME_OG_TITLE,
  HOME_TITLE,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_TITLE,
  PAGES,
  PRIVACY_DESCRIPTION,
  PRIVACY_OG_DESCRIPTION,
  PRIVACY_TITLE,
  canonicalUrl,
  createHtmlPlugins
};
