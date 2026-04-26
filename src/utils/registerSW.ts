/**
 * Register the Workbox-generated service worker emitted at /sw.js.
 *
 * Only registers in production builds because the dev server doesn't emit a
 * service worker and a stale SW from a previous prod visit would intercept
 * dev requests.
 */
export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Lightweight update detection. We use skipWaiting + clientsClaim in
        // the Workbox config, so a new SW will activate on the next page load
        // automatically; surface a console hint for now.
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // eslint-disable-next-line no-console
              console.info('[Podr] New version available; reload to update.');
            }
          });
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[Podr] Service worker registration failed:', err);
      });
  });
}
