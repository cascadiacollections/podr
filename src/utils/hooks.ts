import { useCallback } from 'preact/hooks';

import { trackEvent as reportEvent } from './analytics';

/**
 * Analytics helpers for component code.
 *
 * Every call routes through the shared reporter in `./analytics`, so the
 * provider these events land in is whatever the build configured - Google
 * Analytics, a self-hosted Umami/Plausible/GoatCounter, or nothing at all.
 */
export function useAnalytics() {
  const trackEvent = useCallback((
    category: string,
    action: string,
    label?: string,
    value?: number
  ) => {
    const eventData: Record<string, unknown> = {
      event_category: category,
      event_label: label,
      transport_type: 'beacon',
    };

    if (value !== undefined) {
      eventData.value = value;
    }

    reportEvent(action, eventData);
  }, []);

  const trackException = useCallback((
    description: string,
    fatal: boolean = false,
    category: string = 'error'
  ) => {
    reportEvent('exception', {
      description,
      fatal,
      event_category: category,
    });
  }, []);

  // Reports that a search happened, never what was searched: search text stays
  // out of analytics, as the privacy policy states
  const trackSearch = useCallback((searchTerm: string, resultsCount?: number) => {
    const eventData: Record<string, unknown> = {
      search_term_length: searchTerm.length,
      transport_type: 'beacon',
    };

    if (resultsCount !== undefined) {
      eventData.results_count = resultsCount;
    }

    reportEvent('search', eventData);
  }, []);

  const trackPerformance = useCallback((
    name: string,
    duration: number,
    category: string = 'performance'
  ) => {
    reportEvent('timing_complete', {
      name,
      value: Math.round(duration),
      event_category: category,
    });
  }, []);

  return {
    trackEvent,
    trackException,
    trackSearch,
    trackPerformance,
  };
}
