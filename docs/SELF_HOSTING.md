# Self-hosting Podr on Debian or FreeBSD

Podr builds to a directory of static files. There is no server runtime, no
serverless function, and no database, so hosting it needs nothing more than a web
server that can serve files, apply a few headers, and fall back to `index.html`
for client-side routes. Netlify is a convenience, not a requirement.

This document covers running Podr on your own Debian or FreeBSD host with free
software only, and configuring analytics that keeps visitor data on your box.
Everything in `deploy/` is a template: read it, adjust the hostname and paths,
and install it.

## What is in `deploy/`

| Path | Purpose |
| --- | --- |
| `deploy/nginx/podr.conf` | nginx server block: TLS, SPA fallback, security headers, cache tiers |
| `deploy/nginx/snippets/podr-security-headers.conf` | The security headers, included by every location in the server block |
| `deploy/caddy/Caddyfile` | The same deployment for Caddy, which provisions TLS itself |
| `deploy/bin/podr-deploy.sh` | Fetches a build artifact and swaps it in atomically; also `rollback` and `list` |
| `deploy/systemd/podr-deploy.{service,timer}` | Debian: run the deploy daily |
| `deploy/debian/default/podr` | Debian: deploy settings, installed as `/etc/default/podr` |
| `deploy/freebsd/periodic/daily/500.podr-deploy` | FreeBSD: run the deploy daily via `periodic(8)` |
| `deploy/freebsd/podr.conf` | FreeBSD: deploy settings, installed as `/usr/local/etc/podr.conf` |

The nginx and Caddy configurations are translations of `netlify.toml`, and they
were verified by serving a real build: same Content-Security-Policy, same
security headers, same three cache tiers, same SPA fallback.

## Build the artifact

Podr needs Node 24 or newer (`engines` in `package.json`, `.node-version`).
Debian stable ships an older Node LTS, so building on the host itself means
installing Node from nodesource, `fnm`, or `nvm`.

The simpler arrangement is to keep building in CI, where Node 24 is already
configured, and give the host only the finished `dist/`. The `Node.js CI`
workflow already uploads it as the `www` artifact.

```sh
yarn install --frozen-lockfile
yarn build:ci
tar -czf podr-dist.tar.gz -C dist .
sha256sum podr-dist.tar.gz > podr-dist.tar.gz.sha256
```

Publish both files anywhere the host can reach over HTTPS. `podr-deploy.sh`
accepts a `.tar.gz` or a `.zip`, and it copes with an archive whose contents sit
one directory down — a GitHub Actions artifact unpacks either way.

### FreeBSD builds

FreeBSD is a good host to *serve* from and a poor one to *build* on right now.
The Heft build compiles SCSS through `@rushstack/heft-sass-plugin`, which depends
on `sass-embedded`, and `sass-embedded` publishes no FreeBSD binary — only
Android, macOS, Linux (glibc and musl), and Windows. `@parcel/watcher` and
`@unrs/resolver`, the other native dependencies in the tree, do ship
`freebsd-x64` builds and are fine.

So build the artifact on Linux (or in a Linux jail) and deploy it to FreeBSD.
Serving has no such constraint: the artifact is just files.

## Deploy

Install the script and its configuration, then run it once by hand.

### Debian

```sh
install -m 755 deploy/bin/podr-deploy.sh /usr/local/bin/podr-deploy.sh
install -m 644 deploy/debian/default/podr /etc/default/podr
$EDITOR /etc/default/podr          # set PODR_ARTIFACT_URL and PODR_CHECKSUM_URL

mkdir -p /srv/podr
podr-deploy.sh                     # first deploy
podr-deploy.sh list
```

Then schedule it, replacing the daily Netlify rebuild:

```sh
install -m 644 deploy/systemd/podr-deploy.service /etc/systemd/system/
install -m 644 deploy/systemd/podr-deploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now podr-deploy.timer
systemctl list-timers podr-deploy.timer
```

### FreeBSD

```sh
install -m 755 deploy/bin/podr-deploy.sh /usr/local/bin/podr-deploy.sh
install -m 644 deploy/freebsd/podr.conf /usr/local/etc/podr.conf
$EDITOR /usr/local/etc/podr.conf   # set PODR_ARTIFACT_URL and PODR_CHECKSUM_URL

mkdir -p /usr/local/www/podr
podr-deploy.sh
```

Schedule it with `periodic(8)`:

```sh
mkdir -p /usr/local/etc/periodic/daily
install -m 755 deploy/freebsd/periodic/daily/500.podr-deploy \
    /usr/local/etc/periodic/daily/
sysrc -f /etc/periodic.conf daily_podr_deploy_enable=YES
```

### How a deploy behaves

Each release is extracted into `$PODR_ROOT/releases/<UTC timestamp>/` and the
`$PODR_ROOT/current` symlink — the web server's document root — is repointed only
after the extraction succeeds. The swap is a rename, so no request ever sees a
missing or half-written document root, and the web server needs no reload.

```sh
podr-deploy.sh list       # installed releases, marking the live one
podr-deploy.sh rollback   # repoint current at the release before it
```

`PODR_KEEP` (default 5) old releases are retained for rollback; older ones are
pruned after each successful deploy.

Set `PODR_CHECKSUM_URL`. Without it the artifact is trusted on the strength of
TLS alone, and a mistaken or tampered upload deploys silently.

## Serve

Both configurations serve from `$PODR_ROOT/current` and assume the hostname
`podr.example.org`. Change both.

### nginx on Debian

```sh
apt install nginx-full          # gzip_static needs nginx-full or nginx-extras
install -m 644 deploy/nginx/snippets/podr-security-headers.conf /etc/nginx/snippets/
install -m 644 deploy/nginx/podr.conf /etc/nginx/sites-available/podr
ln -sf /etc/nginx/sites-available/podr /etc/nginx/sites-enabled/podr
$EDITOR /etc/nginx/sites-available/podr
nginx -t && systemctl reload nginx
```

TLS with certbot: `apt install python3-certbot-nginx && certbot --nginx -d podr.example.org`.

### nginx on FreeBSD

```sh
pkg install nginx
```

Copy the same two files to `/usr/local/etc/nginx/` (the snippet into
`/usr/local/etc/nginx/snippets/`), include `podr.conf` from `nginx.conf`, and
replace the `/etc/nginx` prefix in the `include` lines with `/usr/local/etc/nginx`.
Set `root` to `/usr/local/www/podr/current` to match `PODR_ROOT`, and use
`acme.sh` or `security/py-certbot` for certificates.

`gzip_static` serves the `.gz` files webpack already emitted rather than
compressing on every request. Confirm your nginx has the module:

```sh
nginx -V 2>&1 | grep -o with-http_gzip_static_module
```

If it does not, delete the `gzip_static` lines — nothing else depends on them.

### Caddy

```sh
apt install caddy          # Debian
pkg install caddy          # FreeBSD
```

Install `deploy/caddy/Caddyfile` as `/etc/caddy/Caddyfile` (Debian) or
`/usr/local/etc/caddy/Caddyfile` (FreeBSD), edit the hostname and root, then
`caddy validate --config <path>` and reload. Caddy obtains and renews
certificates itself, so there is no certbot step.

### Jails and containers

Nothing here needs privileges beyond writing `$PODR_ROOT`. A FreeBSD jail with
nginx and the deploy script, or a Debian container with the same, is a complete
Podr deployment. `podr-deploy.service` is already confined with `ProtectSystem=strict`
and `ReadWritePaths=/srv/podr`.

## Analytics without a third party

Analytics is opt-in at build time and **off by default**: an unconfigured build
injects no analytics script and `trackEvent` becomes a no-op, so a default Podr
build makes no third-party requests for telemetry at all.

Three environment variables select a provider (see `config/analytics.js`):

| Variable | Meaning |
| --- | --- |
| `PODR_ANALYTICS_PROVIDER` | `none` (default), `umami`, `plausible`, `goatcounter`, or `gtag` |
| `PODR_ANALYTICS_HOST` | Origin of your instance, e.g. `https://stats.example.org`. Required for the self-hosted providers; must be HTTPS unless it is localhost |
| `PODR_ANALYTICS_SITE_ID` | Umami website id, Plausible domain, or GA measurement id. Not used by GoatCounter |

[Umami](https://umami.is/), [Plausible](https://plausible.io/self-hosted-web-analytics),
and [GoatCounter](https://www.goatcounter.com/) are all self-hostable free
software. `gtag` remains available for the hosted podrapp.com deployment, which
sets it in `netlify.toml`.

```sh
PODR_ANALYTICS_PROVIDER=umami \
PODR_ANALYTICS_HOST=https://stats.example.org \
PODR_ANALYTICS_SITE_ID=b3f1... \
  yarn build:ci
```

A misconfiguration fails the build rather than shipping a broken snippet — a
provider with no host, a non-HTTPS host, or a missing site id all stop the build
with a message naming the variable.

The build prints the origin your Content-Security-Policy has to allow:

```
[podr] analytics provider: umami (Content-Security-Policy must allow https://stats.example.org)
```

Add that origin to both `script-src` and `connect-src` in whichever server
configuration you installed. The shipped configurations list no analytics origin,
matching the tracker-free default.

## Replacing the remaining hosted services

Two runtime dependencies are still hosted elsewhere, and neither is addressed by
this document:

- **`podr-service.cascadiacollections.workers.dev`** — a Cloudflare Worker
  proxying iTunes search, top podcasts, and podcast detail. Configured in
  `APP_CONFIG.API_BASE_URL` (`src/utils/AppContext.tsx`) and in the build-time
  inliner (`config/api-inliner.json`, `webpack.config.js`).
- **`api.rss2json.com`** — feed conversion, with a key inlined in
  `src/utils/helpers.ts`.

Both are small enough to replace with one service on the same Debian host or
FreeBSD jail that serves the site, which would also retire the inlined key.
Tracked in [#133](https://github.com/cascadiacollections/podr/issues/133). Until
then, the `connect-src` in the shipped server configurations lists both origins.
