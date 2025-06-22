import { computed, effect, signal, Signal } from '@preact/signals';
import { Fragment, h, JSX } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

import { APP_CONFIG, IFeed, ITopPodcast } from '../utils/AppContext';
import { getFeedUrl, getSecureUrl } from '../utils/helpers';
import { List } from './List';
import { IFeedItem } from './Result';
import { Search } from './Search';

declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, unknown>) => void;
    PODR_TOP_PODCASTS?: { feed: { entry: ReadonlyArray<ITopPodcast> } };
  }
}


// Single stable empty array for all empty signal defaults
const EMPTY_ARRAY: readonly unknown[] = Object.freeze([]);

const query = signal<string>('');
const favorited = signal<ReadonlySet<IFeed>>(new Set());
const results = signal<readonly IFeedItem[]>(
  (() => {
    const raw = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY);
    try {
      return raw ? JSON.parse(raw) : EMPTY_ARRAY as readonly IFeedItem[];
    } catch {
      return EMPTY_ARRAY as readonly IFeedItem[];
    }
  })()
);
const searchResults = signal<readonly IFeed[]>(EMPTY_ARRAY as readonly IFeed[]);
const topResults = signal<readonly ITopPodcast[]>(EMPTY_ARRAY as readonly ITopPodcast[]);

// Computed values
const feeds = computed(() => Array.from(favorited.value.values()));

// Custom hook for localStorage persistence
const useLocalStorage = <T,>(key: string, value: Signal<T>): Signal<T> => {
  useEffect(() => {
    const savedValue = localStorage.getItem(key);
    if (savedValue) {
      try {
        if (key === APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY) {
          favorited.value = new Set(JSON.parse(savedValue));
        } else {
          value.value = JSON.parse(savedValue);
        }
      } catch (e) {
        console.error(`Error parsing localStorage for ${key}:`, e);
      }
    }
  }, [key]);

  effect(() => {
    if (key === APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY) {
      localStorage.setItem(key, JSON.stringify(Array.from(favorited.value.values())));
    } else {
      localStorage.setItem(key, JSON.stringify(value.value));
    }
  });
  return value;
};

// Custom hook for API requests
const useFetch = <T,>(url: string, options?: RequestInit): { data: T | null; error: Error | null; isLoading: boolean } => {
  const data = signal<T | null>(null);
  const error = signal<Error | null>(null);
  const isLoading = signal(false);

  useEffect(() => {
    const fetchData = async () => {
      isLoading.value = true;
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const result = await response.json();
        data.value = result;
      } catch (err) {
        error.value = err as Error;
        window.gtag('event', 'exception', {
          description: `fetch_error_${url}_${(err as Error).message}`,
          fatal: false
        });
      } finally {
        isLoading.value = false;
      }
    };

    if (url) {
      fetchData();
    }
  }, [url]);

  return { data: data.value, error: error.value, isLoading: isLoading.value };
};

const BACKGROUND_REFRESH_TIMEOUT = 5000;
export const App = (): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  useLocalStorage(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, feeds);
  useLocalStorage(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, results);

  // Fetch top podcasts - uses inlined window variable or static file for initial render, then optionally updates from API
  useEffect(() => {
    // First check for window variable (inlined at build time)
    if (window.PODR_TOP_PODCASTS && window.PODR_TOP_PODCASTS.feed && window.PODR_TOP_PODCASTS.feed.entry) {
      topResults.value = window.PODR_TOP_PODCASTS.feed.entry;
    } else {
      // Fall back to static JSON file
      fetch('/top-podcasts.json')
        .then(async (response: Response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const json: { feed: { entry: ReadonlyArray<ITopPodcast> } } = await response.json();
          topResults.value = json.feed.entry;
        })
        .catch((err: Error) => {
          console.error('Failed to load static top podcasts data:', err);
          // On failure to load static data, fall back to API
          fetchTopPodcastsFromAPI();
        });
    }

    // Optionally refresh data from API after initial load
    const ENABLE_BACKGROUND_REFRESH = true; // Could be an environment variable in the future
    if (ENABLE_BACKGROUND_REFRESH) {
      setTimeout(() => {
        fetchTopPodcastsFromAPI();
      }, BACKGROUND_REFRESH_TIMEOUT);
    }
  }, []);

  // Function to fetch top podcasts from API
  const fetchTopPodcastsFromAPI = () => {
    fetch(`${APP_CONFIG.API_BASE_URL}/?q=toppodcasts&limit=10`)
      .then(async (response: Response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const json: { feed: { entry: ReadonlyArray<ITopPodcast> } } = await response.json();
        topResults.value = json.feed.entry;
      })
      .catch((err: Error) => {
        window.gtag('event', 'exception', {
          description: `search_fetch_toppodcasts_${err.message}`,
          fatal: false
        });
      });
  };

  const tryFetchFeed = useCallback(async (feedUrl?: string): Promise<void> => {
    if (!feedUrl) {
      return;
    }

    return fetch(getFeedUrl(feedUrl), { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(({ items: feedResults = [] }) => {
        results.value = feedResults;
        localStorage.setItem(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, JSON.stringify(feedResults));
      })
      .catch((err: Error) => {
        window.gtag('event', 'exception', {
          description: `feed_fetch_${feedUrl}_${err.message}`,
          fatal: false
        });
      });
  }, []);

  const onSearch = useCallback((searchQuery: string, limit: number = APP_CONFIG.SEARCH.DEFAULT_LIMIT) => {
    window.gtag('event', 'search', {
      'search_term': searchQuery,
      transport: 'beacon'
    });

    query.value = searchQuery;

    if (!searchQuery || !searchQuery.length) {
      searchResults.value = [];
      return;
    }

    const queryParams: URLSearchParams = new URLSearchParams([
      ['q', searchQuery],
      ['limit', limit.toString()]
    ]);

    fetch(`${APP_CONFIG.API_BASE_URL}/?${queryParams.toString()}`)
      .then(async (response: Response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const json: { results: ReadonlyArray<IFeed> } = await response.json();
        searchResults.value = json.results;
      })
      .catch((err: Error) => {
        window.gtag('event', 'exception', {
          description: `search_fetch_${limit}_${searchQuery}_${err.message}`,
          fatal: false
        });
      });
  }, []);

  const onClick = useCallback((item: IFeedItem) => {
    const url: string = item.enclosure.link;

    window.gtag('event', 'Audio', {
      eventAction: 'play',
      eventLabel: url,
      transport: 'beacon'
    });

    if (audioRef.current) {
      audioRef.current.src = getSecureUrl(url);
    }
  }, []);

const pinFeedUrl = useCallback((feed: IFeed | string): void => {
  favorited.value = (() => {
    if (typeof feed === 'string') {
      const simpleFeed: IFeed = {
        collectionName: feed,
        feedUrl: feed,
        artworkUrl100: '',
        artworkUrl600: ''
      };
      window.gtag('event', 'Feed', {
        eventAction: 'favorite',
        eventLabel: feed,
        transport: 'beacon'
      });
      return new Set([...favorited.value, simpleFeed]);
    } else {
      window.gtag('event', 'Feed', {
        eventAction: 'favorite',
        eventLabel: feed.feedUrl,
        transport: 'beacon'
      });
      return new Set([...favorited.value, feed]);
    }
  })();
}, []);

const unpinFeedUrl = useCallback((feed: IFeed): void => {
  favorited.value = new Set(Array.from(favorited.value).filter(f => f.feedUrl !== feed.feedUrl));
  window.gtag('event', 'Feed', {
    eventAction: 'unfavorite',
    eventLabel: feed.feedUrl,
    transport: 'beacon'
  });
}, []);

  // Hoisted handlers for JSX to avoid inline arrow functions
  const handleSearchResultClick = useCallback((feedUrl: string) => {
    tryFetchFeed(feedUrl);
  }, [tryFetchFeed]);

  const handleSearchResultDblClick = useCallback((feed: IFeed) => {
    pinFeedUrl(feed);
  }, [pinFeedUrl]);

  const handleTopPodcastClick = useCallback(async (itunesId: string) => {
    const feedResults = await fetch(`${APP_CONFIG.API_BASE_URL}/?q=${itunesId}`).then(async (response: Response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    }).catch((err: Error) => {
      window.gtag('event', 'exception', {
        description: `fetch_podcast_${itunesId}_${err.message}`,
        fatal: false
      });
      return { results: [] };
    });

    if (feedResults?.results?.length > 0) {
      const feedUrl = feedResults.results[0].feedUrl;
      tryFetchFeed(feedUrl);
    }
  }, [tryFetchFeed]);

  const handleTopPodcastDblClick = useCallback((feedId: string) => {
    pinFeedUrl(feedId);
  }, [pinFeedUrl]);

  const handleFavoriteClick = useCallback((feedUrl: string) => {
    tryFetchFeed(feedUrl);
  }, [tryFetchFeed]);

  const handleFavoriteDblClick = useCallback((feed: IFeed) => {
    unpinFeedUrl(feed);
  }, [unpinFeedUrl]);

  return (
    <div ref={mainContainerRef}>
      <h1>
        <a href='/'>Podr</a>
      </h1>
      <Search onSearch={onSearch} />
      { searchResults.value.length > 0 ?
        <div ref={searchResultsRef}>
          <h2 className="section-header">Results for "{query.value}"</h2>
          <div className="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
            {searchResults.value.map((result: IFeed) => (
              <img
                key={result.collectionName}
                src={result.artworkUrl100}
                height={100}
                width={100}
                className='img-fluid rounded-3'
                alt={result.collectionName}
                onClick={() => handleSearchResultClick(result.feedUrl)}
                onDblClick={() => handleSearchResultDblClick(result)}
                aria-label={`Favorite ${result.collectionName}`} />
            ))}
          </div>
        </div> : null
      }
      <Fragment>
        <h2 className="section-header">Top podcasts</h2>
        <div className="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
          {topResults.value && topResults.value.map((result: ITopPodcast) => (
            <img
              key={result.title.label}
              src={result['im:image'][2].label}
              height={100}
              width={100}
              className='img-fluid rounded-3'
              alt={result.title.label}
              onClick={() => handleTopPodcastClick(result.id.attributes['im:id'])}
              onDblClick={() => handleTopPodcastDblClick(result.id.label)}
              aria-label={`Favorite ${result.title.label}`} />
          ))}
        </div>
      </Fragment>
      <h2 className="section-header">Favorites</h2>
      <div className="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
      {feeds.value.map((result) => (
        <img
          key={result.collectionName}
          src={result.artworkUrl100}
          height={100}
          width={100}
          className='img-fluid rounded-3'
          alt={result.collectionName}
          onClick={() => handleFavoriteClick(result.feedUrl)}
          onDblClick={() => handleFavoriteDblClick(result)}
          draggable={false}
        />
      ))}
      </div>
      <h2 className="section-header">Episodes</h2>
      <List results={results.value} onClick={onClick} />
      <audio
        ref={audioRef}
        autoPlay
        controls
        preload='auto'
        aria-label="Podcast episode player"
      />
    </div>
  );
};
