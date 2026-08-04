import { effect, signal, Signal } from '@preact/signals';
import { Fragment, h, JSX } from 'preact';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import { trackEvent } from '../utils/analytics';
import { APP_CONFIG, createAppState, EMPTY_ARRAY, IFeed, ITopPodcast } from '../utils/AppContext';
import { parseFeedResponse, parseStoredFeedItems } from '../utils/feed';
import { getFeedUrl, getSecureUrl, resolveFeedUrl } from '../utils/helpers';
import { readStoredJson, writeStoredJson } from '../utils/storage';
import { List } from './List';
import { IFeedItem } from './Result';
import { Search } from './Search';

declare global {
  interface Window {
    PODR_TOP_PODCASTS?: { feed: { entry: ReadonlyArray<ITopPodcast> } };
  }
}

// Custom hook for localStorage persistence
const useLocalStorage = <T,>(key: string, value: Signal<T>): Signal<T> => {
  useEffect(() => {
    return effect(() => writeStoredJson(key, value.value));
  }, [key, value]);

  return value;
};

const BACKGROUND_REFRESH_TIMEOUT = 5000;
const FEED_ERROR_MESSAGE = 'Could not load episodes for this podcast. Please try again.';

/**
 * Picks the largest artwork the iTunes top-podcasts feed offers.
 * The feed normally provides three sizes, but the list length is not guaranteed.
 */
const getTopPodcastArtwork = (podcast: ITopPodcast): string => {
  const images = podcast['im:image'];

  if (!images || images.length === 0) {
    return '';
  }

  return images[images.length - 1].label;
};

export const App = (): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const { query, favorited, feeds, results, searchResults, topResults } = useMemo(
    () => createAppState({
      favorited: signal(new Set(readStoredJson<IFeed[]>(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, []))),
      results: signal(parseStoredFeedItems(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, EMPTY_ARRAY))),
    }),
    []
  );

  // Feed request status, kept local to the component rather than in shared state
  const { isFeedLoading, feedError } = useMemo(
    () => ({
      isFeedLoading: signal(false),
      feedError: signal<string | null>(null)
    }),
    []
  );

  // Identifies the newest feed request so slower earlier ones cannot overwrite it
  const feedRequestId = useRef(0);

  useLocalStorage(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, feeds);
  useLocalStorage(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, results);

  const fetchTopPodcastsFromAPI = useCallback(() => {
    fetch(`${APP_CONFIG.API_BASE_URL}/?q=toppodcasts&limit=10`)
      .then(async (response: Response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const json: { feed?: { entry?: ReadonlyArray<ITopPodcast> } } = await response.json();
        topResults.value = json?.feed?.entry ?? EMPTY_ARRAY;
      })
      .catch((err: Error) => {
        trackEvent('exception', {
          description: `search_fetch_toppodcasts_${err.message}`,
          fatal: false
        });
      });
  }, [topResults]);

  // Fetch top podcasts - uses inlined window variable or static file for initial render, then optionally updates from API
  useEffect(() => {
    // First check for window variable (inlined at build time). An empty entry list
    // means the build fell back to placeholder data, so keep looking.
    const inlinedEntries = window.PODR_TOP_PODCASTS?.feed?.entry;

    if (inlinedEntries && inlinedEntries.length > 0) {
      topResults.value = inlinedEntries;
    } else {
      // Fall back to static JSON file
      fetch('/top-podcasts.json')
        .then(async (response: Response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const json: { feed?: { entry?: ReadonlyArray<ITopPodcast> } } = await response.json();
          topResults.value = json?.feed?.entry ?? EMPTY_ARRAY;
        })
        .catch((err: Error) => {
          console.error('Failed to load static top podcasts data:', err);
          // On failure to load static data, fall back to API
          fetchTopPodcastsFromAPI();
        });
    }

    // Optionally refresh data from API after initial load
    const refreshTimer = window.setTimeout(fetchTopPodcastsFromAPI, BACKGROUND_REFRESH_TIMEOUT);
    return () => window.clearTimeout(refreshTimer);
  }, [fetchTopPodcastsFromAPI, topResults]);

  const tryFetchFeed = useCallback(async (feedUrl?: string): Promise<void> => {
    if (!feedUrl) {
      return;
    }

    const requestId = ++feedRequestId.current;
    const isCurrentRequest = (): boolean => requestId === feedRequestId.current;

    isFeedLoading.value = true;
    feedError.value = null;

    try {
      // Resolve the feed URL (converts Apple Podcasts URLs to RSS feed URLs)
      const resolvedFeedUrl = await resolveFeedUrl(feedUrl);

      // Fetch the feed data
      const response = await fetch(getFeedUrl(resolvedFeedUrl));

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Throws when the response is not a feed, so a wrong-but-successful
      // response surfaces as an error rather than an empty episode list
      const feedResults = parseFeedResponse(await response.json());

      // A newer request has since started; its results win
      if (!isCurrentRequest()) {
        return;
      }

      results.value = feedResults;
    } catch (err: unknown) {
      // Handle errors from resolveFeedUrl, fetch, and response parsing
      const error = err as Error;

      // Leave any previously loaded episodes in place rather than clearing them
      if (isCurrentRequest()) {
        feedError.value = FEED_ERROR_MESSAGE;
      }

      trackEvent('exception', {
        description: `feed_fetch_${feedUrl}_${error.message}`,
        fatal: false
      });
    } finally {
      if (isCurrentRequest()) {
        isFeedLoading.value = false;
      }
    }
  }, []);

  const onSearch = useCallback((searchQuery: string, limit: number = APP_CONFIG.SEARCH.DEFAULT_LIMIT) => {
    trackEvent('search', {
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
        trackEvent('exception', {
          description: `search_fetch_${limit}_${searchQuery}_${err.message}`,
          fatal: false
        });
      });
  }, []);

  const onClick = useCallback((item: IFeedItem) => {
    const url: string = item.enclosure.link;

    // Entries such as trailers or notes can arrive without playable audio
    if (!url) {
      trackEvent('exception', {
        description: `audio_missing_enclosure_${item.guid}`,
        fatal: false
      });
      return;
    }

    trackEvent('Audio', {
      eventAction: 'play',
      eventLabel: url,
      transport: 'beacon'
    });

    if (audioRef.current) {
      audioRef.current.src = getSecureUrl(url);
    }
  }, []);

  const pinFeed = useCallback((feed: IFeed): void => {
    const pinned = Array.from(favorited.value);

    // Favorites are a Set of objects, so identical feeds from separate fetches are
    // distinct references - deduplicate on feedUrl instead
    if (pinned.some((existing: IFeed) => existing.feedUrl === feed.feedUrl)) {
      return;
    }

    favorited.value = new Set([...pinned, feed]);

    trackEvent('Feed', {
      eventAction: 'favorite',
      eventLabel: feed.feedUrl,
      transport: 'beacon'
    });
  }, []);

  const unpinFeed = useCallback((feed: IFeed): void => {
    favorited.value = new Set(
      Array.from(favorited.value).filter((existing: IFeed) => existing.feedUrl !== feed.feedUrl)
    );

    trackEvent('Feed', {
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
    pinFeed(feed);
  }, [pinFeed]);

  const handleTopPodcastClick = useCallback(async (itunesId: string) => {
    const feedResults = await fetch(`${APP_CONFIG.API_BASE_URL}/?q=${itunesId}`).then(async (response: Response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    }).catch((err: Error) => {
      trackEvent('exception', {
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

  // Pin a top podcast with its real title and artwork; its Apple Podcasts page URL
  // is resolved to an RSS feed URL when the favorite is opened
  const handleTopPodcastDblClick = useCallback((podcast: ITopPodcast) => {
    const artwork = getTopPodcastArtwork(podcast);

    pinFeed({
      collectionName: podcast.title.label,
      feedUrl: podcast.id.label,
      artworkUrl100: artwork,
      artworkUrl600: artwork
    });
  }, [pinFeed]);

  const handleFavoriteClick = useCallback((feedUrl: string) => {
    tryFetchFeed(feedUrl);
  }, [tryFetchFeed]);

  const handleFavoriteDblClick = useCallback((feed: IFeed) => {
    unpinFeed(feed);
  }, [unpinFeed]);

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
              key={result.id.attributes['im:id']}
              src={getTopPodcastArtwork(result)}
              height={100}
              width={100}
              className='img-fluid rounded-3'
              alt={result.title.label}
              onClick={() => handleTopPodcastClick(result.id.attributes['im:id'])}
              onDblClick={() => handleTopPodcastDblClick(result)}
              aria-label={`Favorite ${result.title.label}`} />
          ))}
        </div>
      </Fragment>
      <h2 className="section-header">Favorites</h2>
      <div className="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
      {feeds.value.map((result) => (
        <img
          key={result.feedUrl}
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
      {feedError.value ?
        <p className="feed-error" role="alert">{feedError.value}</p> : null
      }
      <List results={results.value} onClick={onClick} isLoading={isFeedLoading.value} />
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
