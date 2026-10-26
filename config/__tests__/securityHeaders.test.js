/**
 * Keeps the three hand-written copies of Podr's security headers in step:
 *
 *   netlify.toml                                    the hosted podrapp.com site
 *   deploy/nginx/snippets/podr-security-headers.conf
 *   deploy/caddy/Caddyfile
 *
 * Nothing else ties them together, and drift fails quietly: an origin added to
 * one connect-src surfaces on the other deployments as a broken feature rather
 * than a failed build (cascadiacollections/podr#140).
 *
 * The two shipped server configs must match exactly. netlify.toml may differ from
 * them only by the allowances declared below, and each allowance has to still be
 * in use, so the list cannot quietly outlive the reason for it.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

/**
 * Sources only the hosted site allows, by CSP directive. A self-hosted build
 * talks to its own same-origin API and ships no analytics by default.
 */
/**
 * Google AdSense, its ad vendors and the Funding Choices consent prompt. Ads run
 * on podrapp.com only.
 */
const ADSENSE_SOURCES = [
  'https://pagead2.googlesyndication.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://adservice.google.com',
  'https://fundingchoicesmessages.google.com',
];

const NETLIFY_ONLY_SOURCES = {
  'script-src': [
    // Google Analytics (gtag), configured for podrapp.com only.
    'https://www.googletagmanager.com',
    ...ADSENSE_SOURCES,
  ],
  'img-src': ADSENSE_SOURCES,
  'connect-src': [
    // The hosted Podr API; self-hosted builds serve it same-origin.
    'https://podr-service.cascadiacollections.workers.dev',
    // Google Analytics collect endpoints.
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    ...ADSENSE_SOURCES,
  ],
  'frame-src': [
    ...ADSENSE_SOURCES,
    // Ad creatives render in frames served from these two.
    'https://googleads.g.doubleclick.net',
    'https://tpc.googlesyndication.com',
  ],
};

/**
 * Whole header values allowed to differ on the hosted site, as
 * [netlify value, server value].
 */
const NETLIFY_ONLY_VALUES = {
  // podrapp.com is on the HSTS preload list. The server configs leave "preload"
  // out on purpose: it is a commitment a self-hoster has to opt into.
  'Strict-Transport-Security': [
    'max-age=31536000; includeSubDomains; preload',
    'max-age=31536000; includeSubDomains',
  ],
};

/** The [headers.values] of the `for = "/*"` block in netlify.toml. */
function netlifyHeaders(toml) {
  const block = toml
    .split(/^\[\[headers\]\]$/m)
    .find((section) => /^\s*for = "\/\*"$/m.test(section));
  if (!block) throw new Error('netlify.toml has no [[headers]] block for "/*"');
  const values = block.split(/^\s*\[headers\.values\]$/m)[1];
  return Object.fromEntries(
    [...values.matchAll(/^\s*([A-Za-z-]+) = "([^"]*)"$/gm)].map((m) => [m[1], m[2]])
  );
}

/** Every `add_header Name "value" always;` in the nginx snippet. */
function nginxHeaders(conf) {
  return Object.fromEntries(
    [...conf.matchAll(/^add_header ([A-Za-z-]+) "([^"]*)" always;$/gm)].map((m) => [m[1], m[2]])
  );
}

/** The `header { ... }` block of the Caddyfile, minus header removals. */
function caddyHeaders(caddyfile) {
  const block = caddyfile.match(/^\theader \{\n([\s\S]*?)^\t\}$/m);
  if (!block) throw new Error('Caddyfile has no header { } block');
  return Object.fromEntries(
    [...block[1].matchAll(/^\t\t([A-Za-z-]+) "([^"]*)"$/gm)].map((m) => [m[1], m[2]])
  );
}

/** Parses a CSP into { directive: sorted sources }. */
function parseCsp(policy) {
  const directives = {};
  for (const part of policy.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives[name] = [...sources].sort();
  }
  return directives;
}

const netlify = netlifyHeaders(read('netlify.toml'));
const nginx = nginxHeaders(read('deploy/nginx/snippets/podr-security-headers.conf'));
const caddy = caddyHeaders(read('deploy/caddy/Caddyfile'));

describe('security header parity', () => {
  it('parses a CSP and a full header set from every file', () => {
    for (const headers of [netlify, nginx, caddy]) {
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(Object.keys(headers).length).toBeGreaterThanOrEqual(7);
    }
  });

  it('ships identical headers in the nginx and Caddy configs', () => {
    expect({
      ...caddy,
      'Content-Security-Policy': parseCsp(caddy['Content-Security-Policy']),
    }).toEqual({
      ...nginx,
      'Content-Security-Policy': parseCsp(nginx['Content-Security-Policy']),
    });
  });

  it('sets the same headers on Netlify as on the servers', () => {
    expect(Object.keys(netlify).sort()).toEqual(Object.keys(nginx).sort());
  });

  it('matches the server headers on Netlify except for declared values', () => {
    for (const [name, value] of Object.entries(nginx)) {
      if (name === 'Content-Security-Policy') continue;
      const expected = NETLIFY_ONLY_VALUES[name] ? NETLIFY_ONLY_VALUES[name][0] : value;
      expect([name, netlify[name]]).toEqual([name, expected]);
      if (NETLIFY_ONLY_VALUES[name]) {
        expect([name, value]).toEqual([name, NETLIFY_ONLY_VALUES[name][1]]);
      }
    }
  });

  it('matches the server CSP on Netlify except for declared sources', () => {
    const server = parseCsp(nginx['Content-Security-Policy']);
    const hosted = parseCsp(netlify['Content-Security-Policy']);

    expect(Object.keys(hosted).sort()).toEqual(Object.keys(server).sort());
    for (const directive of Object.keys(server)) {
      const allowed = NETLIFY_ONLY_SOURCES[directive] || [];
      const extra = hosted[directive].filter((source) => !server[directive].includes(source));
      const missing = server[directive].filter((source) => !hosted[directive].includes(source));

      expect({ directive, missing }).toEqual({ directive, missing: [] });
      expect({ directive, undeclared: extra.filter((s) => !allowed.includes(s)) }).toEqual({
        directive,
        undeclared: [],
      });
    }
  });

  it('declares only allowances netlify.toml still uses', () => {
    const hosted = parseCsp(netlify['Content-Security-Policy']);
    for (const [directive, sources] of Object.entries(NETLIFY_ONLY_SOURCES)) {
      for (const source of sources) {
        expect({ directive, source, used: hosted[directive].includes(source) }).toEqual({
          directive,
          source,
          used: true,
        });
      }
    }
  });
});
