import { h, createContext } from 'preact';
import { Signal, signal } from '@preact/signals';
import { IFeedItem } from '../ui/Result';

// Define types for our context
export interface IFeed {
  readonly collectionName: string;
  readonly feedUrl: string;
  readonly artworkUrl100: string;
  readonly artworkUrl600: string;
}

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

interface AppContextType {
  query: Signal<string>;
  favorited: Signal<Set<IFeed>>;
  results: Signal<ReadonlyArray<IFeedItem>>;
  searchResults: Signal<ReadonlyArray<IFeed>>;
  topResults: Signal<ReadonlyArray<ITopPodcast>>;
}

// Create default values for the context
const defaultContext: AppContextType = {
  query: signal(''),
  favorited: signal(new Set()),
  results: signal([]),
  searchResults: signal([]),
  topResults: signal([])
};

// Create the context
export const AppContext = createContext<AppContextType>(defaultContext);

// Constants used throughout the app
export const Constants = {
  API_BASE_URL: 'https://podr-svc-48579879001.us-west4.run.app',
  LOCAL_STORAGE_FEEDS_KEY: 'podr_feeds',
  LOCAL_STORAGE_RESULTS_KEY: 'podr_results',
  DEFAULT_SEARCH_LIMIT: 14
};