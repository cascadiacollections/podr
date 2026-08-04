import { computed, effect, signal, Signal } from '@preact/signals';
import { Fragment, h, JSX } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

import { APP_CONFIG, EMPTY_ARRAY, IFeed, ITopPodcast } from '../utils/AppContext';
import { getFeedUrl, getSecureUrl, resolveFeedUrl } from '../utils/helpers';
import { List } from './List';
import { IFeedItem } from './Result';
import { Search } from './Search';

declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, unknown>) => void;
    PODR_TOP_PODCASTS?: { feed: { entry: ReadonlyArray<ITopPodcast> } };
  }
}


type AppSignals = ReturnType<typeof createAppSignals>;

const createAppSignals = () => {
  const favorited = signal<ReadonlySet<IFeed>>(new Set());

  return {
    query: signal<string>(''),
    favorited,
    results: signal<readonly IFeedItem[]>(EMPTY_ARRAY),
    searchResults: signal<readonly IFeed[]>(EMPTY_ARRAY),
    topResults: signal<readonly ITopPodcast[]>(EMPTY_ARRAY),
    feeds: computed(() => Array.from(favorited.value.values()))
  };
};

const usePersistentSignal = <T,>(key: string, value: Signal<T>): Signal<T> => {
  useEffect(() => {
    const savedValue = localStorage.getItem(key);
    if (savedValue) {
      try {
        value.value = JSON.parse(savedValue);
      } catch (e) {
        console.error(`Error parsing localStorage for ${key}:`, e);
      }
    }
  }, [key, value]);

  useEffect(() => {
    return effect(() => {
      localStorage.setItem(key, JSON.stringify(value.value));
    });
  }, [key, value]);

  return value;
};

const usePersistentFavorites = (favorited: Signal<ReadonlySet<IFeed>>): void => {
  useEffect(() => {
    const savedValue = localStorage.getItem(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY);
    if (savedValue) {
      try {
        favorited.value = new Set(JSON.parse(savedValue));
      } catch (e) {
        console.error(`Error parsing localStorage for ${APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY}:`, e);
      }
    }
  }, [favorited]);

  useEffect(() => {
    return effect(() => {
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, JSON.stringify(Array.from(favorited.value.values())));
    });
  }, [favorited]);
};

const getTopPodcastImage = (result: ITopPodcast): string => {
  const images = result['im:image'];
  return images[2]?.label ?? images[images.length - 1]?.label ?? '';
};

const BACKGROUND_REFRESH_TIMEOUT = 5000;
export const App = (): JSX.Element => {
  const appSignalsRef = useRef<AppSignals>();
  if (!appSignalsRef.current) {
    appSignalsRef.current = createAppSignals();
  }

  const { query, favorited, results, searchResults, topResults, feeds } = appSignalsRef.current;
  const audioRef = useRef<HTMLAudioElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  usePersistentFavorites(favorited);
  usePersistentSignal(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, results);

  const fetchTopPodcastsFromAPI = useCallback(() => {
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
  }, [topResults]);

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
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
    if (ENABLE_BACKGROUND_REFRESH) {
      refreshTimeout = setTimeout(() => {
        fetchTopPodcastsFromAPI();
      }, BACKGROUND_REFRESH_TIMEOUT);
    }

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [fetchTopPodcastsFromAPI, topResults]);

  const tryFetchFeed = useCallback(async (feedUrl?: string): Promise<void> => {
    if (!feedUrl) {
      return;
    }

    try {
      // Resolve the feed URL (converts Apple Podcasts URLs to RSS feed URLs)
      const resolvedFeedUrl = await resolveFeedUrl(feedUrl);
      
      // Fetch the feed data
      const response = await fetch(getFeedUrl(resolvedFeedUrl), { cache: 'force-cache' });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const { items: feedResults = EMPTY_ARRAY } = await response.json();
      
      results.value = feedResults;
      localStorage.setItem(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, JSON.stringify(feedResults));
    } catch (err: unknown) {
      // Handle errors from both resolveFeedUrl and fetch
      const error = err as Error;
      window.gtag('event', 'exception', {
        description: `feed_fetch_${feedUrl}_${error.message}`,
        fatal: false
      });
    }
  }, [results]);

  const onSearch = useCallback((searchQuery: string, limit: number = APP_CONFIG.SEARCH.DEFAULT_LIMIT) => {
    window.gtag('event', 'search', {
      'search_term': searchQuery,
      transport: 'beacon'
    });

    query.value = searchQuery;

    if (!searchQuery || !searchQuery.length) {
      searchResults.value = EMPTY_ARRAY;
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
  }, [query, searchResults]);

  const onClick = useCallback((item: IFeedItem) => {
    const url: string = item.enclosure.link;

    window.gtag('event', 'Audio', {
      eventAction: 'play',
      eventLabel: url,
      transport: 'beacon'
    });

    if (audioRef.current) {
      try {
        audioRef.current.src = getSecureUrl(url);
      } catch (err) {
        window.gtag('event', 'exception', {
          description: `audio_url_${(err as Error).message}`,
          fatal: false
        });
      }
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
}, [favorited]);

const unpinFeedUrl = useCallback((feed: IFeed): void => {
  favorited.value = new Set(Array.from(favorited.value).filter(f => f.feedUrl !== feed.feedUrl));
  window.gtag('event', 'Feed', {
    eventAction: 'unfavorite',
    eventLabel: feed.feedUrl,
    transport: 'beacon'
  });
}, [favorited]);

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
      return EMPTY_ARRAY;
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
              src={getTopPodcastImage(result)}
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
