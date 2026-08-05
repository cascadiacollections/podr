export type AnalyticsParameters = Record<string, unknown>;

/**
 * Analytics providers Podr knows how to emit events to.
 *
 * Everything except `gtag` is self-hostable free software, so a Podr deployment
 * can report usage without handing visitor data to a third party. `none`
 * disables reporting outright and is the default for an unconfigured build.
 */
export type AnalyticsProvider = 'none' | 'gtag' | 'umami' | 'plausible' | 'goatcounter';

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: AnalyticsParameters) => void;
    umami?: { track: (name: string, data?: AnalyticsParameters) => void };
    plausible?: (name: string, options?: { props?: AnalyticsParameters }) => void;
    goatcounter?: {
      count: (vars: { path: string; title?: string; event: boolean }) => void;
    };
  }
}

/**
 * Build-time provider selection, injected by webpack's DefinePlugin from the
 * PODR_ANALYTICS_PROVIDER environment variable. When it is unset or unknown the
 * provider is detected from whichever analytics global the page loaded, which
 * keeps builds that inject a snippet by other means working.
 */
declare const PODR_ANALYTICS_PROVIDER: string | undefined;

const CONFIGURED_PROVIDER: string =
  (typeof PODR_ANALYTICS_PROVIDER === 'string' && PODR_ANALYTICS_PROVIDER) || '';

const KNOWN_PROVIDERS: readonly AnalyticsProvider[] = [
  'none',
  'gtag',
  'umami',
  'plausible',
  'goatcounter',
] as const;

function isKnownProvider(value: string): value is AnalyticsProvider {
  return (KNOWN_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Detects the provider from the globals present on the page.
 *
 * `gtag` is probed first so a page that still carries the Google snippet keeps
 * its existing behavior.
 */
function detectProvider(): AnalyticsProvider {
  if (typeof window === 'undefined') {
    return 'none';
  }

  if (typeof window.gtag === 'function') {
    return 'gtag';
  }

  if (typeof window.umami?.track === 'function') {
    return 'umami';
  }

  if (typeof window.plausible === 'function') {
    return 'plausible';
  }

  if (typeof window.goatcounter?.count === 'function') {
    return 'goatcounter';
  }

  return 'none';
}

/**
 * Resolves the active provider: the build-time selection when one was
 * configured, otherwise whatever the page actually loaded.
 *
 * @returns The provider `trackEvent` will dispatch to
 */
export function getAnalyticsProvider(): AnalyticsProvider {
  if (CONFIGURED_PROVIDER && isKnownProvider(CONFIGURED_PROVIDER)) {
    return CONFIGURED_PROVIDER;
  }

  return detectProvider();
}

/**
 * Reports an event to the configured analytics provider.
 *
 * Reporting is best-effort: an unconfigured build, a blocked script, or a
 * provider that throws must never break the interaction that triggered it.
 *
 * @param action - Event name
 * @param params - Optional event parameters. GoatCounter has no parameter
 * concept and records the event name only.
 */
export function trackEvent(action: string, params?: AnalyticsParameters): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    switch (getAnalyticsProvider()) {
      case 'gtag':
        window.gtag?.('event', action, params);
        return;
      case 'umami':
        window.umami?.track(action, params);
        return;
      case 'plausible':
        window.plausible?.(action, params ? { props: params } : undefined);
        return;
      case 'goatcounter':
        window.goatcounter?.count({ path: action, title: action, event: true });
        return;
      default:
        return;
    }
  } catch {
    // Analytics is never load-bearing.
  }
}
