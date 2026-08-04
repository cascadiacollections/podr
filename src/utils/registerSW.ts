/**
 * Service worker registration.
 *
 * Registering is what makes the app usable on a flaky connection: the shell,
 * artwork, and the last podcast responses are served from cache when the network
 * is slow or absent. Registration is deliberately deferred until after load so it
 * never competes with the first render for bandwidth.
 */

const SERVICE_WORKER_URL = '/sw.js' as const;

/**
 * Whether this browser can run a service worker in this context.
 * Requires a secure context, which excludes plain-HTTP deployments.
 */
function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    window.isSecureContext
  );
}

/**
 * Registers the service worker once the page has finished loading.
 *
 * Failures are swallowed: offline support is an enhancement, and a browser that
 * refuses to register one (private mode, disabled storage) must still get an app.
 * @returns The registration, or undefined when unsupported or unsuccessful
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!isSupported()) {
    return undefined;
  }

  // Waiting for load keeps registration off the critical path
  if (document.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      window.addEventListener('load', () => resolve(), { once: true });
    });
  }

  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  } catch {
    return undefined;
  }
}

/**
 * Removes any previously installed service worker.
 * Used in development, where a cached shell would mask local changes.
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!isSupported()) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Nothing to clean up
  }
}
