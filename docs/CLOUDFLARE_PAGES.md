# Hosting podrapp.com on Cloudflare Pages

The hosted site is the Cloudflare Pages project `podr`. Pages is connected to
this repository through its GitHub integration: a push to `main` builds and
deploys production, and other branches of this repository get a preview
deployment. Nothing in GitHub Actions uploads the site.

The payload of top podcasts is inlined at build time, so the site is also
rebuilt once a day. `.github/workflows/daily-build.yml` does that by calling a
Pages deploy hook, stored as the repository secret
`CLOUDFLARE_PAGES_DEPLOY_HOOK`. Running that workflow by hand is the way to
redeploy production without a commit.

## Project settings

The settings live in the Pages project, not in this repository.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `yarn install --production=false --frozen-lockfile && yarn build:ci && cp deploy/cloudflare/_headers dist/_headers` |
| Build output directory | `dist` |

Environment variables, for both production and preview:

| Variable | Value | Why |
| --- | --- | --- |
| `NODE_VERSION` | `24` | Matches `.node-version` and `engines` in `package.json` |
| `NODE_ENV` | `production` | |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | |
| `YARN_ENABLE_IMMUTABLE_INSTALLS` | `false` | |
| `PODR_ANALYTICS_PROVIDER` | `gtag` | Analytics is opt-in per deployment (`config/analytics.js`) |
| `PODR_ANALYTICS_SITE_ID` | `G-19Z3SPSJPY` | |
| `SKIP_DEPENDENCY_INSTALL` | `1` | Stops Pages running its own `yarn install` before the build command, which installs the dependencies itself |

## How the site is served

- **Headers** live in `deploy/cloudflare/_headers`. The build command copies
  the file into `dist/`; webpack does not emit it. A test in
  `config/__tests__/securityHeaders.test.js` keeps its security headers in
  step with the self-hosted nginx and Caddy configurations in `deploy/`.
  Anything only the hosted site allows (Google Analytics, AdSense, the hosted
  API origin, HSTS preload) is declared in that test.
- **`/` and `/privacy` are files.** The build emits `index.html`,
  `privacy.html`, and `privacy/index.html`, each with its own title,
  description, canonical, and visible text. `privacy.html` is what Pages
  serves at `/privacy` (`/privacy.html` redirects there). `privacy/index.html`
  is what Pages serves at `/privacy/`. Podcast links are `/?feed=` on `/`, so
  they are the home document; their canonical is `https://podrapp.com/` with
  no query string. Do not add a catch-all `_redirects` rule: it would turn
  unknown paths back into 200s and can shadow `robots.txt`, `ads.txt`, and
  the sitemaps.
- **Unknown paths return 404.** A top-level `404.html` disables the Pages SPA
  fallback, so a path with no file is that document with status 404 rather
  than the home page. The app still opens a `/?feed=` link, because that URL's
  path is `/`.
- **`/sitemap.xml`, `/robots.txt` and `/ads.txt`** are files in `dist/` and are
  served as such, with the Content-Type Pages derives from the extension.
  The sitemap lists `/` and `/privacy` only.
- **Long-lived caching** applies to the content-hashed bundles only. Everything
  else, including the service worker, the manifest and the icons, gets the
  Pages default of `public, max-age=0, must-revalidate`.
- **`/index.html`** redirects to `/`. Pages does this for every `.html` URL.
- **Crawlers that do not run JavaScript** receive the prerendered text inside
  `#root`. The app replaces that node when it starts.

## History

podrapp.com was hosted on Netlify until 2026-11-26. Two things from that setup
were not carried over, on purpose:

- A forced rewrite of `/sitemap.xml` to `/podr-sitemap.xml`, which worked
  around a Netlify sitemap plugin that overwrote the built file. The build
  still emits `podr-sitemap.xml` so that URL keeps resolving.
- A build-ignore script that skipped site builds when a push changed only
  package publishing metadata under `packages/`. Pages builds every push to
  `main`; build watch paths in the project settings are the equivalent if
  that is wanted again.
