# Hosting podrapp.com on Cloudflare Pages

The hosted site is moving from Netlify to Cloudflare Pages. Until the
`podrapp.com` DNS records point at Pages, Netlify stays the production host and
`netlify.toml` stays in the repository as the rollback path.

## Project settings

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `yarn install --production=false --frozen-lockfile && yarn build:ci && cp deploy/cloudflare/_headers dist/_headers` |
| Build output directory | `dist` |

Environment variables, for both production and preview, mirror
`[build.environment]` in `netlify.toml`: `NODE_VERSION`, `NODE_ENV`,
`NODE_OPTIONS`, `YARN_ENABLE_IMMUTABLE_INSTALLS`, `PODR_ANALYTICS_PROVIDER` and
`PODR_ANALYTICS_SITE_ID`. `SKIP_DEPENDENCY_INSTALL=1` stops Pages running its
own `yarn install` before the build command, which installs the dependencies
itself.

## What differs from Netlify

- **Headers** live in `deploy/cloudflare/_headers`. The build command copies the
  file into `dist/` rather than webpack emitting it, so a Netlify build never
  sees it and does not apply the headers twice. A test in
  `config/__tests__/securityHeaders.test.js` keeps its security headers
  identical to `netlify.toml`.
- **Client-side routes** need no rule. Pages serves `index.html` for a path
  with no matching file as long as `dist/` has no `404.html`.
- **`/sitemap.xml`** needs no rewrite. Pages has no sitemap plugin to overwrite
  the file the build writes.
- **Long-lived caching** applies to the content-hashed bundles only. The
  `netlify.toml` rule for `/*.@(js|css|...)` never matched on Netlify, so the
  live site has always revalidated every file; Pages keeps that behaviour for
  unhashed files such as the icons.
- **`/index.html`** redirects to `/`. Pages does this for every `.html` URL.
- **Prerendering for crawlers** has no Pages equivalent. Crawlers that do not
  run JavaScript receive the app shell.
