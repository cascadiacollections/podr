import { h, createContext } from 'preact';
import { Signal, signal } from '@preact/signals';
import { IFeedItem } from '../ui/Result';

/**
 * Represents a podcast feed with essential metadata
 */
export interface IFeed {
  readonly collectionName: string;
  readonly feedUrl: string;
  readonly artworkUrl100: string;
  readonly artworkUrl600: string;
}

/**
 * Represents a top podcast entry from iTunes API
 */
export interface ITopPodcast {
  readonly title: {
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
 * Application context type with reactive signals for state management
 */
export interface AppContextType {
  readonly query: Signal<string>;
  readonly favorited: Signal<ReadonlySet<IFeed>>;
  readonly results: Signal<ReadonlyArray<IFeedItem>>;
  readonly searchResults: Signal<ReadonlyArray<IFeed>>;
  readonly topResults: Signal<ReadonlyArray<ITopPodcast>>;
}

/**
 * Application configuration constants
 */
export const APP_CONFIG = {
  API_BASE_URL: 'https://podr-svc-48579879001.us-west4.run.app',
  LOCAL_STORAGE: {
    FEEDS_KEY: 'podr_feeds',
    RESULTS_KEY: 'podr_results',
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
function createDefaultContext(): AppContextType {
  return {
    query: signal(''),
    favorited: signal<ReadonlySet<IFeed>>(new Set()),
    results: signal<ReadonlyArray<IFeedItem>>([]),
    searchResults: signal<ReadonlyArray<IFeed>>([]),
    topResults: signal<ReadonlyArray<ITopPodcast>>([]),
  } as const;
}

/**
 * Application context for managing global state with signals
 */
export const AppContext = createContext<AppContextType>(createDefaultContext());

/**
 * @deprecated Use APP_CONFIG instead. This will be removed in a future version.
 */
export const Constants = {
  API_BASE_URL: APP_CONFIG.API_BASE_URL,
  LOCAL_STORAGE_FEEDS_KEY: APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY,
  LOCAL_STORAGE_RESULTS_KEY: APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY,
  DEFAULT_SEARCH_LIMIT: APP_CONFIG.SEARCH.DEFAULT_LIMIT,
} as const;