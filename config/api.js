'use strict';

const DEFAULT_API_BASE_URL = 'https://podr-service.cascadiacollections.workers.dev';

/**
 * Resolves the Podr service origin for a build.
 *
 * @param {NodeJS.ProcessEnv} [env] - Defaults to `process.env`
 * @returns {{ baseUrl: string, topPodcastsUrl: string }}
 */
function resolveApiConfig(env = process.env) {
  const configuredUrl = (env.PODR_API_BASE_URL || DEFAULT_API_BASE_URL).trim();

  let parsed;
  try {
    parsed = new URL(configuredUrl);
  } catch {
    throw new Error(`PODR_API_BASE_URL must be an absolute URL, got: ${configuredUrl}`);
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error(
      `PODR_API_BASE_URL must use https (localhost excepted), got: ${configuredUrl}`
    );
  }

  if (parsed.origin === 'null' || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`PODR_API_BASE_URL must be an origin, got: ${configuredUrl}`);
  }

  const baseUrl = parsed.origin;

  return {
    baseUrl,
    topPodcastsUrl: `${baseUrl}/?q=toppodcasts&limit=10`,
  };
}

module.exports = { DEFAULT_API_BASE_URL, resolveApiConfig };
