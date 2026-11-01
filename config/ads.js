'use strict';

/**
 * Optional build-time substitution for the ads.txt publisher id.
 *
 * The committed file keeps the public placeholder. Set
 * PODR_ADSENSE_PUBLISHER_ID to the AdSense id (pub- and 16 digits) and the
 * production file is rewritten as it is copied into dist/. Unset leaves the
 * placeholder, which AdSense will keep reporting as unauthorized.
 */

const ADS_TXT_PLACEHOLDER = 'pub-XXXXXXXXXXXXXXXX';
const PUBLISHER_ID_PATTERN = /^pub-\d{16}$/;

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ publisherId: string | null }}
 */
function resolveAdsConfig(env = process.env) {
  const publisherId = (env.PODR_ADSENSE_PUBLISHER_ID || '').trim();

  if (!publisherId) {
    return { publisherId: null };
  }

  if (!PUBLISHER_ID_PATTERN.test(publisherId)) {
    throw new Error(
      `PODR_ADSENSE_PUBLISHER_ID must be pub- followed by 16 digits, got: ${publisherId}`
    );
  }

  return { publisherId };
}

/**
 * Replaces the ads.txt placeholder when a publisher id was configured.
 *
 * @param {string} template
 * @param {string | null} publisherId
 * @returns {string}
 */
function applyAdsPublisherId(template, publisherId) {
  if (!publisherId) {
    return template;
  }

  if (!template.includes(ADS_TXT_PLACEHOLDER)) {
    throw new Error(
      `ads.txt has no ${ADS_TXT_PLACEHOLDER} placeholder to replace with the publisher id`
    );
  }

  return template.split(ADS_TXT_PLACEHOLDER).join(publisherId);
}

module.exports = { ADS_TXT_PLACEHOLDER, resolveAdsConfig, applyAdsPublisherId };
