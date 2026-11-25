import { Query, QueryCache, QueryClient, QueryKey } from '@tanstack/preact-query';

import { trackEvent } from '../utils/analytics';
import { APP_CONFIG } from '../utils/AppContext';
import { readErrorMessage, readErrorName } from '../utils/helpers';

/**
 * How long a cached query is kept, in memory and in localStorage.
 * Matches the persister's max age so a restored chart or feed is not
 * discarded on the next launch. The longest timeout the platform can
 * schedule is about 24 days, and a day is plenty for a podcast chart.
 */
export const QUERY_GC_TIME = 24 * 60 * 60 * 1000;

/** localStorage key for the persisted query cache. Distinct from `podr_feeds`. */
export const QUERY_CACHE_KEY = 'podr_query_cache';

/** Bump to drop caches written by an older shape of the query data. */
export const QUERY_CACHE_BUSTER = '1';

const RETRY_LIMIT = 3;

/**
 * A failed HTTP response. `status` lets the retry policy skip 4xx, which will
 * not succeed by trying again.
 */
export class StatusError extends Error {
  public readonly status: number;

  public constructor(status: number) {
    super(`HTTP error! Status: ${status}`);
    this.name = 'StatusError';
    this.status = status;
  }
}

/**
 * Cancellations are how a newer search or a closed podcast stops the request
 * it replaced. They are not failures and must not be reported or retried.
 */
export function isAbortError(error: unknown): boolean {
  const name = readErrorName(error);
  return name === 'AbortError' || name === 'CancelledError';
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Built-in exponential backoff (`1s`, `2s`, `4s`, capped at 30s) still applies.
 * This only decides whether another attempt is worth making.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= RETRY_LIMIT || isAbortError(error)) {
    return false;
  }

  // A payload that is not a feed will not become one on the next try
  if (error.name === 'FeedResponseError') {
    return false;
  }

  const status = statusOf(error);
  return status === undefined || status < 400 || status >= 500;
}

/**
 * Analytics description for a failed query.
 * Search text stays out of it: the privacy policy says a search is reported
 * by the fact it happened, never by what was typed.
 */
export function describeQueryFailure(queryKey: QueryKey): string {
  const kind = String(queryKey[0] ?? 'query');

  if (kind === 'search') {
    return `search_fetch_${String(queryKey[2] ?? '')}`;
  }

  if (kind === 'feed') {
    return `feed_fetch_${String(queryKey[1] ?? '')}`;
  }

  if (kind === 'top-podcasts') {
    return 'search_fetch_toppodcasts';
  }

  return kind;
}

function reportQueryError(error: Error, query: Query<unknown, unknown, unknown>): void {
  if (isAbortError(error)) {
    return;
  }

  trackEvent('exception', {
    description: `${describeQueryFailure(query.queryKey)}_${readErrorMessage(error)}`,
    fatal: false
  });
}

export interface IQueryClientOptions {
  /** Tests pass `false` so a failure settles instead of backing off. */
  readonly retry?: boolean;
}

/**
 * One client for the app. Server state lives here; subscriptions and the
 * player stay in signals.
 */
export function createPodrQueryClient(options?: IQueryClientOptions): QueryClient {
  const retry = options?.retry ?? process.env.NODE_ENV !== 'test';

  return new QueryClient({
    queryCache: new QueryCache({ onError: reportQueryError }),
    defaultOptions: {
      queries: {
        retry: retry ? shouldRetry : false,
        gcTime: QUERY_GC_TIME,
        staleTime: APP_CONFIG.PERFORMANCE.CACHE_TTL_MS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true
      }
    }
  });
}
