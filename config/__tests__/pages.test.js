const fs = require('fs');
const path = require('path');

const {
  HOME_DESCRIPTION,
  HOME_TITLE,
  NOT_FOUND_TITLE,
  PAGES,
  PRIVACY_TITLE,
  canonicalUrl
} = require('../pages');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('prerendered documents', () => {
  it('gives /, /privacy, and the 404 document different titles', () => {
    const home = PAGES.find((page) => page.filename === 'index.html');
    const privacy = PAGES.filter((page) => page.id === 'privacy');
    const missing = PAGES.find((page) => page.filename === '404.html');

    expect(home.title).toBe(HOME_TITLE);
    expect(privacy).toHaveLength(2);
    expect(new Set(privacy.map((page) => page.title))).toEqual(new Set([PRIVACY_TITLE]));
    expect(missing.title).toBe(NOT_FOUND_TITLE);
    expect(new Set([home.title, PRIVACY_TITLE, NOT_FOUND_TITLE]).size).toBe(3);
    expect(home.description).not.toBe(privacy[0].description);
    expect(home.description).toBe(HOME_DESCRIPTION);
  });

  it('canonicalizes the home page and the privacy policy without a query string', () => {
    expect(canonicalUrl('https://podrapp.com', '/')).toBe('https://podrapp.com/');
    expect(canonicalUrl('https://podrapp.com', '/privacy')).toBe('https://podrapp.com/privacy');
    expect(canonicalUrl('https://podrapp.com', '')).toBe('');

    const home = PAGES.find((page) => page.id === 'home');
    const privacy = PAGES.find((page) => page.id === 'privacy');
    const missing = PAGES.find((page) => page.id === 'not-found');

    expect(home.canonicalPath).toBe('/');
    expect(privacy.canonicalPath).toBe('/privacy');
    expect(home.canonicalPath).not.toContain('?');
    expect(privacy.canonicalPath).not.toContain('feed');
    expect(missing.canonicalPath).toBe('');
    expect(missing.robots).toBe('noindex');
    expect(home.robots).toBe('');
    expect(privacy.robots).toBe('');
  });

  it('puts a heading and the visible copy in each document body', () => {
    for (const page of PAGES) {
      expect(page.body).toMatch(/<h1[\s>]/);
      expect(page.body.replace(/<[^>]+>/g, '').trim().length).toBeGreaterThan(40);
    }

    const home = PAGES.find((page) => page.id === 'home');
    const privacy = PAGES.find((page) => page.id === 'privacy');
    const missing = PAGES.find((page) => page.id === 'not-found');

    expect(home.body).toContain(HOME_DESCRIPTION);
    expect(home.description).toBe(HOME_DESCRIPTION);
    expect(read('src/ui/homeCopy.ts')).toContain(`'${HOME_DESCRIPTION}'`);
    expect(home.body).toContain('>Podr</span>');
    expect(privacy.title).toBe(PRIVACY_TITLE);
    expect(read('src/ui/PrivacyPolicy.tsx')).toContain(`'${PRIVACY_TITLE}'`);
    expect(read('src/ui/NotFound.tsx')).toContain(`'${NOT_FOUND_TITLE}'`);
    expect(privacy.body).toContain('<h1>Privacy policy</h1>');
    expect(privacy.body).toContain('G-19Z3SPSJPY');
    expect(missing.body).toContain('<h1>Page not found</h1>');
    expect(missing.body).toContain('That page is not on Podr.');
  });

  it('keeps the canonical in the HTML template instead of a feed query script', () => {
    const template = read('assets/index.html');

    expect(template).toContain('rel="canonical"');
    expect(template).toContain('htmlWebpackPlugin.options.canonicalUrl');
    // Lodash escapes <%- and leaves <%= raw. The body has to stay real HTML.
    expect(template).toContain('<%= htmlWebpackPlugin.options.bodyHtml %>');
    expect(template).not.toContain('<%- htmlWebpackPlugin.options.bodyHtml %>');
    expect(template).not.toContain("searchParams.set('feed'");
    expect(template).not.toContain('searchParams.get');
  });
});

describe('unknown paths are 404s', () => {
  it('ships a 404 document and no catch-all redirect', () => {
    expect(PAGES.map((page) => page.filename)).toEqual([
      'index.html',
      'privacy/index.html',
      'privacy.html',
      '404.html'
    ]);

    const shipped = [
      ...fs.readdirSync(path.join(root, 'assets')),
      ...fs.readdirSync(path.join(root, 'deploy/cloudflare'))
    ];

    expect(shipped).toContain('_headers');
    expect(shipped).not.toContain('_redirects');
    expect(read('webpack.config.js')).not.toContain('_redirects');
    expect(read('deploy/cloudflare/_headers')).not.toMatch(/^\s+Content-Type:/im);
  });

  it('tells nginx and Caddy to serve 404.html instead of the home document', () => {
    const nginx = read('deploy/nginx/podr.conf');
    const caddy = read('deploy/caddy/Caddyfile');

    expect(nginx).toContain('error_page 404 /404.html');
    expect(nginx).toContain('try_files $uri $uri/ =404');
    expect(nginx).not.toContain('try_files $uri $uri/ /index.html');

    expect(caddy).toContain('try_files {path} {path}/ {path}.html =404');
    expect(caddy).toContain('rewrite * /404.html');
    expect(caddy).not.toContain('try_files {path} {path}/ /index.html');
  });

  it('keeps the service worker from storing a 404 or the privacy page as the shell', () => {
    const sw = read('assets/sw.js');

    expect(sw).toContain("url.pathname === '/robots.txt'");
    expect(sw).toContain("url.pathname === '/ads.txt'");
    expect(sw).toContain("url.pathname === '/sitemap.xml'");
    expect(sw).toContain("url.pathname === '/podr-sitemap.xml'");
    expect(sw).toContain('response.ok && isAppShellPath(path)');
    expect(sw).toContain("normalizePath(pathname) === '/privacy'");
    expect(sw).toContain('status: 404');
  });
});
