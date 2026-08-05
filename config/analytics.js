'use strict';

/**
 * Build-time analytics configuration.
 *
 * Podr ships no analytics by default: an unconfigured build emits no third-party
 * script tag and `trackEvent` becomes a no-op. A deployment opts in through
 * environment variables, and every provider except `gtag` is self-hostable free
 * software, so a self-hosted Podr can keep its usage data on its own box.
 *
 *   PODR_ANALYTICS_PROVIDER  none | gtag | umami | plausible | goatcounter
 *   PODR_ANALYTICS_HOST      Origin of the analytics instance, e.g.
 *                            https://stats.example.org. Required for umami,
 *                            plausible, and goatcounter; ignored for gtag.
 *   PODR_ANALYTICS_SITE_ID   Umami website id, Plausible domain, or GA
 *                            measurement id. Ignored for goatcounter, which
 *                            identifies the site by its host.
 */

const SUPPORTED_PROVIDERS = ['none', 'gtag', 'umami', 'plausible', 'goatcounter'];

const GTAG_HOST = 'https://www.googletagmanager.com';

/**
 * Escapes a value for interpolation into a double-quoted HTML attribute.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} host
 * @returns {string} The host with any trailing slash removed
 */
function normalizeHost(host) {
  return host.replace(/\/+$/, '');
}

/**
 * @param {string} name - Environment variable name, for the error message
 * @param {string} host
 * @returns {string} The normalized origin
 */
function requireHost(name, host) {
  if (!host) {
    throw new Error(
      `${name} is required when PODR_ANALYTICS_PROVIDER selects a self-hosted provider.`
    );
  }

  let parsed;
  try {
    parsed = new URL(host);
  } catch {
    throw new Error(`${name} must be an absolute URL, got: ${host}`);
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error(`${name} must use https (localhost excepted), got: ${host}`);
  }

  return normalizeHost(host);
}

/**
 * @param {string} name - Environment variable name, for the error message
 * @param {string} siteId
 * @returns {string}
 */
function requireSiteId(name, siteId) {
  if (!siteId) {
    throw new Error(`${name} is required for the configured PODR_ANALYTICS_PROVIDER.`);
  }

  return siteId;
}

/**
 * Resolves the analytics configuration for a build.
 *
 * @param {NodeJS.ProcessEnv} [env] - Defaults to `process.env`
 * @returns {{ provider: string, snippet: string, origins: string[] }} The
 * provider name for DefinePlugin, the `<script>` markup to inject into the HTML
 * template, and the origins a deployment's Content-Security-Policy has to allow.
 */
function resolveAnalyticsConfig(env = process.env) {
  const provider = (env.PODR_ANALYTICS_PROVIDER || 'none').trim().toLowerCase();

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(
      `Unknown PODR_ANALYTICS_PROVIDER "${provider}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}.`
    );
  }

  const host = (env.PODR_ANALYTICS_HOST || '').trim();
  const siteId = (env.PODR_ANALYTICS_SITE_ID || '').trim();

  switch (provider) {
    case 'gtag': {
      const measurementId = escapeAttribute(
        requireSiteId('PODR_ANALYTICS_SITE_ID', siteId)
      );

      return {
        provider,
        origins: [GTAG_HOST, 'https://*.google-analytics.com', 'https://*.analytics.google.com'],
        snippet: [
          `<script async src="${GTAG_HOST}/gtag/js?id=${encodeURIComponent(measurementId)}"></script>`,
          '<script>',
          '  window.dataLayer = window.dataLayer || [];',
          '  function gtag(){dataLayer.push(arguments);}',
          "  gtag('js', new Date());",
          `  gtag('config', '${measurementId}');`,
          '</script>',
        ].join('\n    '),
      };
    }

    case 'umami': {
      const origin = requireHost('PODR_ANALYTICS_HOST', host);
      const websiteId = escapeAttribute(requireSiteId('PODR_ANALYTICS_SITE_ID', siteId));

      return {
        provider,
        origins: [origin],
        snippet:
          `<script defer src="${escapeAttribute(origin)}/script.js" ` +
          `data-website-id="${websiteId}"></script>`,
      };
    }

    case 'plausible': {
      const origin = requireHost('PODR_ANALYTICS_HOST', host);
      const domain = escapeAttribute(requireSiteId('PODR_ANALYTICS_SITE_ID', siteId));

      return {
        provider,
        origins: [origin],
        snippet:
          `<script defer data-domain="${domain}" ` +
          `src="${escapeAttribute(origin)}/js/script.js"></script>`,
      };
    }

    case 'goatcounter': {
      const origin = escapeAttribute(requireHost('PODR_ANALYTICS_HOST', host));

      return {
        provider,
        origins: [normalizeHost(host)],
        // GoatCounter counts a pageview on load and needs no site id: the
        // endpoint it reports to identifies the site.
        snippet: `<script data-goatcounter="${origin}/count" async src="${origin}/count.js"></script>`,
      };
    }

    default:
      return { provider: 'none', origins: [], snippet: '' };
  }
}

module.exports = { resolveAnalyticsConfig, SUPPORTED_PROVIDERS };
