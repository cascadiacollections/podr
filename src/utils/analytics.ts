export type AnalyticsParameters = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: AnalyticsParameters) => void;
  }
}

export function trackEvent(action: string, params?: AnalyticsParameters): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
}
