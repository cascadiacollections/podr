import { computed, Signal, signal } from '@preact/signals';

declare const PODR_API_BASE_URL: string | undefined;

/**
 * Shared stable empty array for all signal defaults and empty values
 * Using readonly never[] allows assignment to any readonly array type without assertion.
 */
export const EMPTY_ARRAY: readonly never[] = Object.freeze([]);

/**
 * Represents a podcast feed with essential metadata
 */
export interface IFeed {
  readonly collectionName: string;
  readonly feedUrl: string;
  readonly artworkUrl100: string;
  readonly artworkUrl600: string;
  /** Who makes the podcast, shown under its name. Absent on older saved favorites. */
  readonly artistName?: string;
}

/**
 * Represents a top podcast entry from iTunes API
 */
export interface ITopPodcast {
  readonly title: {
    readonly label: string;
  };
  /** The podcast's own name; `title` is "<name> - <artist>" */
  readonly 'im:name'?: {
    readonly label: string;
  };
  readonly 'im:artist'?: {
    readonly label: string;
  };
  readonly id: {
    readonly label: string;
    readonly attributes: {
      readonly 'im:id': string;
    };
  };
  readonly 'im:image': ReadonlyArray<{
    readonly label: string;
  }>;
}

/**
 * Application context type with reactive signals for state management.
 * Charts, search hits, and episodes are server state and live in the query
 * cache. What remains here is the listener's own state.
 */
export interface AppContextType {
  readonly query: Signal<string>;
  readonly favorited: Signal<ReadonlySet<IFeed>>;
  readonly feeds: Signal<ReadonlyArray<IFeed>>;
}

/**
 * Application configuration constants
 */
export const APP_CONFIG = {
  API_BASE_URL:
    (typeof PODR_API_BASE_URL === 'string' && PODR_API_BASE_URL) ||
    'https://podr-service.cascadiacollections.workers.dev',
  LOCAL_STORAGE: {
    FEEDS_KEY: 'podr_feeds',
    RESULTS_KEY: 'podr_results',
    RESULTS_FEED_KEY: 'podr_results_feed',
  },
  SEARCH: {
    DEFAULT_LIMIT: 14,
    MIN_QUERY_LENGTH: 2,
  },
  PERFORMANCE: {
    DEBOUNCE_MS: 300,
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  },
} as const satisfies {
  API_BASE_URL: string;
  LOCAL_STORAGE: {
    FEEDS_KEY: string;
    RESULTS_KEY: string;
    /** Which podcast the persisted episodes belong to, with its details */
    RESULTS_FEED_KEY: string;
  };
  SEARCH: {
    DEFAULT_LIMIT: number;
    MIN_QUERY_LENGTH: number;
  };
  PERFORMANCE: {
    DEBOUNCE_MS: number;
    CACHE_TTL_MS: number;
  };
};

/**
 * Creates default context values with proper type safety
 */
export function createAppState(initialState?: Partial<Pick<AppContextType, 'favorited'>>): AppContextType {
  const favorited = initialState?.favorited ?? signal<ReadonlySet<IFeed>>(new Set());

  return {
    query: signal(''),
    favorited,
    feeds: computed(() => Array.from(favorited.value)),
  } as const;
}
