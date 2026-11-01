'use strict';

/**
 * Canonical origin written into sitemap.xml and robots.txt.
 *
 * The hosted site is https://podrapp.com. podr.netlify.app is only the Netlify
 * deploy hostname, and search engines should not be sent there. A self-hosted
 * build sets PODR_SITE_ORIGIN to its own HTTPS origin.
 */

const DEFAULT_SITE_ORIGIN = 'https://podrapp.com';

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ origin: string }}
 */
function resolveSiteConfig(env = process.env) {
  const configured = (env.PODR_SITE_ORIGIN || DEFAULT_SITE_ORIGIN).trim();

  let parsed;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error(`PODR_SITE_ORIGIN must be an absolute URL, got: ${configured}`);
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error(
      `PODR_SITE_ORIGIN must use https (localhost excepted), got: ${configured}`
    );
  }

  if (parsed.origin === 'null' || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`PODR_SITE_ORIGIN must be an origin, got: ${configured}`);
  }

  return { origin: parsed.origin };
}

module.exports = { DEFAULT_SITE_ORIGIN, resolveSiteConfig };
