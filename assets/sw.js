/* eslint-env serviceworker */
'use strict';

/**
 * Podr service worker.
 *
 * Hand written rather than generated: the caching rules are the interesting part
 * and they are short. Cache names carry a build id derived from the emitted asset
 * names, so a new deploy retires every previous cache.
 *
 * Strategies, by what the request is for:
 *   navigation      network first, falling back to the cached app shell
 *   app assets      stale while revalidate (instant paint, refreshed in background)
 *   podcast APIs    network first, falling back to the last good response
 *   artwork         cache first, in a size-capped cache
 *   audio           never cached (episodes are large; the browser handles ranges)
 */

/**
 * Filled in at build time by CopyAssetsPlugin. The fallbacks keep this file
 * runnable as-is (an unbuilt copy caches the shell and nothing else).
 */
const PRECACHE_ASSETS = self.__PODR_PRECACHE__ || [];
const CACHE_VERSION = self.__PODR_BUILD_ID__ || 'dev';
const SHELL_CACHE = `podr-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `podr-assets-${CACHE_VERSION}`;
const DATA_CACHE = `podr-data-${CACHE_VERSION}`;
const IMAGE_CACHE = `podr-images-${CACHE_VERSION}`;

const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, DATA_CACHE, IMAGE_CACHE];

/**
 * Cached up front so a cold, offline start still renders the app
 */
const SHELL_URLS = ['/', '/index.html', '/top-podcasts.json', '/site.webmanifest'];

/**
 * Upper bound on cached artwork entries. Podcast art is small but unbounded in
 * count, and eviction on a phone should not be left to chance.
 */
const MAX_IMAGE_ENTRIES = 120;

/**
 * Hosts whose responses are podcast data worth keeping for offline reads
 */
const DATA_HOSTS = [
  'api.rss2json.com',
  'itunes.apple.com',
  'podr-service.cascadiacollections.workers.dev'
];

/**
 * Extensions treated as immutable, content-hashed app assets
 */
const ASSET_PATTERN = /\.(?:js|css|woff2?|ttf|png|svg|ico|webp)$/i;

const AUDIO_PATTERN = /\.(?:mp3|m4a|aac|ogg|opus|wav|mp4|m4v)(?:$|\?)/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      // Individually, so one missing file cannot fail the whole install
      await Promise.all(
        SHELL_URLS.map((url) => shell.add(new Request(url, { cache: 'reload' })).catch(() => undefined))
      );

      // The bundle is precached by hashed name, so an offline visit does not
      // depend on what the HTTP cache happens to have retained
      const assets = await caches.open(ASSET_CACHE);
      await Promise.all(
        PRECACHE_ASSETS.map((url) => assets.add(new Request(url, { cache: 'reload' })).catch(() => undefined))
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('podr-') && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * Trims a cache to its newest entries. Cache order is insertion order, so
 * dropping from the front removes the least recently added.
 * @param {string} cacheName
 * @param {number} maxEntries
 */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length <= maxEntries) {
    return;
  }

  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

/**
 * Serves from cache immediately and refreshes the entry in the background.
 * @param {Request} request
 * @param {string} cacheName
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    return cached;
  }

  const response = await network;

  if (response) {
    return response;
  }

  return Response.error();
}

/**
 * Prefers the network so data stays fresh, but falls back to the last good
 * response so a flaky connection still renders something.
 * @param {Request} request
 * @param {string} cacheName
 * @returns {Promise<Response>}
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
}

/**
 * Serves from cache when present, otherwise fetches and stores.
 * @param {Request} request
 * @param {string} cacheName
 * @returns {Promise<Response>}
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response && (response.ok || response.type === 'opaque')) {
    await cache.put(request, response.clone());
    await trimCache(cacheName, MAX_IMAGE_ENTRIES);
  }

  return response;
}

/**
 * Network first with the app shell as the offline fallback
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('/index.html', response.clone());
    return response;
  } catch (error) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = (await cache.match('/index.html')) || (await cache.match('/'));

    if (cached) {
      return cached;
    }

    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Range requests and audio streams are left to the browser
  if (request.headers.has('range') || AUDIO_PATTERN.test(url.pathname)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (DATA_HOSTS.includes(url.hostname)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname === '/top-podcasts.json') {
      event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
      return;
    }

    if (ASSET_PATTERN.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    }
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
