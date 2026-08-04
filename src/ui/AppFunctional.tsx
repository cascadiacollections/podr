import { effect, signal, Signal } from '@preact/signals';
import { h, JSX } from 'preact';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import { trackEvent } from '../utils/analytics';
import { APP_CONFIG, createAppState, EMPTY_ARRAY, IFeed, ITopPodcast } from '../utils/AppContext';
import { parseFeedResponse, parseStoredFeedItems } from '../utils/feed';
import { getFeedUrl, getSecureUrl, resolveFeedUrl } from '../utils/helpers';
import { isConstrainedConnection, prefersReducedMotion, useOnlineStatus } from '../utils/network';
import { readStoredJson, writeStoredJson } from '../utils/storage';
import { List } from './List';
import { INowPlaying, PlayerBar } from './PlayerBar';
import { PodcastCard } from './PodcastCard';
import { IFeedItem } from './Result';
import { Search } from './Search';

declare global {
  interface Window {
    PODR_TOP_PODCASTS?: { feed: { entry: ReadonlyArray<ITopPodcast> } };
  }
}

const BACKGROUND_REFRESH_TIMEOUT = 5000;
const FEED_ERROR_MESSAGE = 'Could not load episodes for this podcast. Please try again.';
const OFFLINE_MESSAGE =
  'You are offline. Showing the podcasts and episodes already saved on this device.';

/**
 * Episodes kept in local storage. A feed can return hundreds, and every one of them
 * is parsed again on the next cold start - on a low-power device that parse is felt.
 * The rest are one fetch away.
 */
const MAX_PERSISTED_EPISODES = 60;

/**
 * Cards whose artwork loads eagerly: roughly the first row on a phone, so the top
 * of a grid is never blank while the rest streams in lazily.
 */
const EAGER_ARTWORK_COUNT = 3;

/**
 * Placeholder cards shown while the first set of top podcasts arrives
 */
const SKELETON_CARDS: ReadonlyArray<number> = Object.freeze([0, 1, 2, 3, 4, 5]);

// Custom hook for localStorage persistence
const useLocalStorage = <T,>(
  key: string,
  value: Signal<T>,
  project?: (value: T) => unknown
): Signal<T> => {
  useEffect(() => {
    return effect(() => writeStoredJson(key, project ? project(value.value) : value.value));
  }, [key, value, project]);

  return value;
};

/**
 * Trims the episode list before it is persisted, dropping the descriptions the UI
 * never renders.
 */
const toPersistedEpisodes = (items: ReadonlyArray<IFeedItem>): ReadonlyArray<unknown> =>
  items.slice(0, MAX_PERSISTED_EPISODES).map((item: IFeedItem) => ({
    guid: item.guid,
    title: item.title,
    pubDate: item.pubDate,
    enclosure: item.enclosure
  }));

/**
 * Picks artwork from an iTunes top-podcasts entry: the largest available, or the
 * smallest when the connection is constrained.
 * The feed normally offers three sizes, but the list length is not guaranteed.
 */
const getTopPodcastArtwork = (podcast: ITopPodcast, preferSmall: boolean): string => {
  const images = podcast['im:image'];

  if (!images || images.length === 0) {
    return '';
  }

  return preferSmall ? images[0].label : images[images.length - 1].label;
};

/**
 * Presents a top podcast as a feed so a single card component serves every grid.
 * `feedUrl` is the podcast's Apple Podcasts page, resolved to RSS when opened.
 */
const toFeed = (podcast: ITopPodcast, preferSmall: boolean): IFeed => {
  const artwork = getTopPodcastArtwork(podcast, preferSmall);

  return {
    collectionName: podcast.title.label,
    feedUrl: podcast.id.label,
    artworkUrl100: artwork,
    artworkUrl600: artwork
  };
};

export const App = (): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const episodesRef = useRef<HTMLElement>(null);
  const isOnline = useOnlineStatus();

  const { query, favorited, feeds, results, searchResults, topResults } = useMemo(
    () => createAppState({
      favorited: signal(new Set(readStoredJson<IFeed[]>(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, []))),
      results: signal(parseStoredFeedItems(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, EMPTY_ARRAY))),
    }),
    []
  );

  // Presentation state, kept local to the component rather than in shared app state
  const { isFeedLoading, isSearching, feedError, selectedFeed, nowPlaying } = useMemo(
    () => ({
      isFeedLoading: signal(false),
      isSearching: signal(false),
      feedError: signal<string | null>(null),
      selectedFeed: signal<IFeed | null>(null),
      nowPlaying: signal<INowPlaying | undefined>(undefined)
    }),
    []
  );

  // Identifies the newest request of each kind so a slower earlier one cannot win
  const feedRequestId = useRef(0);
  const searchRequestId = useRef(0);
  const feedAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Asking for less data is the cheapest optimization available on a metered link
  const preferSmallArtwork = useMemo(() => isConstrainedConnection(), []);

  useLocalStorage(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, feeds);
  useLocalStorage(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, results, toPersistedEpisodes);

  // Abandon in-flight requests when the app goes away
  useEffect(() => {
    return () => {
      feedAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, []);

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

    // The background refresh is a nicety. On a metered or slow connection the
    // already-loaded data is good enough and the request is skipped entirely.
    if (preferSmallArtwork) {
      return undefined;
    }

    const refreshTimer = window.setTimeout(fetchTopPodcastsFromAPI, BACKGROUND_REFRESH_TIMEOUT);
    return () => window.clearTimeout(refreshTimer);
  }, [fetchTopPodcastsFromAPI, preferSmallArtwork, topResults]);

  const tryFetchFeed = useCallback(async (feed: IFeed): Promise<void> => {
    if (!feed.feedUrl) {
      return;
    }

    const requestId = ++feedRequestId.current;
    const isCurrentRequest = (): boolean => requestId === feedRequestId.current;

    // Stop the previous feed request from spending bandwidth nobody is waiting on
    feedAbortRef.current?.abort();
    const controller = new AbortController();
    feedAbortRef.current = controller;

    selectedFeed.value = feed;
    isFeedLoading.value = true;
    feedError.value = null;

    try {
      // Resolve the feed URL (converts Apple Podcasts URLs to RSS feed URLs)
      const resolvedFeedUrl = await resolveFeedUrl(feed.feedUrl);

      // Fetch the feed data
      const response = await fetch(getFeedUrl(resolvedFeedUrl), { signal: controller.signal });

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

      // A superseded request is expected, not a failure worth reporting
      if (error.name === 'AbortError') {
        return;
      }

      // Leave any previously loaded episodes in place rather than clearing them
      if (isCurrentRequest()) {
        feedError.value = FEED_ERROR_MESSAGE;
      }

      trackEvent('exception', {
        description: `feed_fetch_${feed.feedUrl}_${error.message}`,
        fatal: false
      });
    } finally {
      if (isCurrentRequest()) {
        isFeedLoading.value = false;
      }
    }
  }, []);

  const onSearch = useCallback((searchQuery: string, limit: number = APP_CONFIG.SEARCH.DEFAULT_LIMIT) => {
    query.value = searchQuery;

    searchAbortRef.current?.abort();

    if (!searchQuery || !searchQuery.length) {
      searchResults.value = EMPTY_ARRAY;
      isSearching.value = false;
      return;
    }

    trackEvent('search', {
      'search_term': searchQuery,
      transport: 'beacon'
    });

    const requestId = ++searchRequestId.current;
    const controller = new AbortController();
    searchAbortRef.current = controller;
    isSearching.value = true;

    const queryParams: URLSearchParams = new URLSearchParams([
      ['q', searchQuery],
      ['limit', limit.toString()]
    ]);

    fetch(`${APP_CONFIG.API_BASE_URL}/?${queryParams.toString()}`, { signal: controller.signal })
      .then(async (response: Response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const json: { results?: ReadonlyArray<IFeed> } = await response.json();

        if (requestId !== searchRequestId.current) {
          return;
        }

        searchResults.value = json?.results ?? EMPTY_ARRAY;
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') {
          return;
        }

        trackEvent('exception', {
          description: `search_fetch_${limit}_${searchQuery}_${err.message}`,
          fatal: false
        });
      })
      .finally(() => {
        if (requestId === searchRequestId.current) {
          isSearching.value = false;
        }
      });
  }, []);

  const onPlayEpisode = useCallback((item: IFeedItem) => {
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

    const podcast = selectedFeed.value;

    nowPlaying.value = {
      guid: item.guid,
      title: item.title,
      podcastName: podcast?.collectionName ?? '',
      artworkUrl: podcast?.artworkUrl100 ?? ''
    };

    if (audioRef.current) {
      audioRef.current.src = getSecureUrl(url);
      // Playback begins from the click that chose the episode, which is also what
      // mobile browsers require of a player that does not autoplay
      void audioRef.current.play?.()?.catch(() => undefined);
    }
  }, []);

  const toggleFavorite = useCallback((feed: IFeed): void => {
    const pinned = Array.from(favorited.value);
    // Favorites are a Set of objects, so identical feeds from separate fetches are
    // distinct references - compare on feedUrl instead
    const withoutFeed = pinned.filter((candidate: IFeed) => candidate.feedUrl !== feed.feedUrl);
    const wasFavorite = withoutFeed.length !== pinned.length;

    favorited.value = new Set(wasFavorite ? withoutFeed : [...pinned, feed]);

    trackEvent('Feed', {
      eventAction: wasFavorite ? 'unfavorite' : 'favorite',
      eventLabel: feed.feedUrl,
      transport: 'beacon'
    });
  }, []);

  const openPodcast = useCallback((feed: IFeed) => {
    void tryFetchFeed(feed);

    // The episode list sits below the grids, so bring it into view rather than
    // leaving the listener wondering whether the click registered
    episodesRef.current?.scrollIntoView?.({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start'
    });
  }, [tryFetchFeed]);

  const toggleSelectedFavorite = useCallback(() => {
    const feed = selectedFeed.value;

    if (feed) {
      toggleFavorite(feed);
    }
  }, [toggleFavorite]);

  const favoriteUrls = useMemo(
    () => new Set(feeds.value.map((feed: IFeed) => feed.feedUrl)),
    [feeds.value]
  );

  const selected = selectedFeed.value;
  const isSelectedFavorite = selected ? favoriteUrls.has(selected.feedUrl) : false;
  const topFeeds = useMemo(
    () => topResults.value.map((podcast: ITopPodcast) => toFeed(podcast, preferSmallArtwork)),
    [topResults.value, preferSmallArtwork]
  );
  const episodeCount = results.value.length;
  // A first visit leads with discovery; once the library has entries it leads instead
  const hasLibrary = feeds.value.length > 0;

  const librarySection = (
    <section className="section" aria-labelledby="library-heading">
      <div className="section__header">
        <h2 className="section__title" id="library-heading">Your library</h2>
        {feeds.value.length > 0 ? (
          <span className="section__count">{feeds.value.length}</span>
        ) : null}
      </div>
      {feeds.value.length > 0 ? (
        <ul className="card-grid">
          {feeds.value.map((result: IFeed, index: number) => (
            <PodcastCard
              key={result.feedUrl}
              feed={result}
              onOpen={openPodcast}
              onToggleFavorite={toggleFavorite}
              isFavorite
              isCurrent={selected?.feedUrl === result.feedUrl}
              lazy={index >= EAGER_ARTWORK_COUNT}
            />
          ))}
        </ul>
      ) : (
        <div className="empty-state empty-state--compact">
          <p>Nothing saved yet.</p>
          <p className="empty-message">Star a podcast to keep it here, ready to open offline.</p>
        </div>
      )}
    </section>
  );

  const discoverSection = (
    <section className="section" aria-labelledby="top-podcasts-heading">
      <div className="section__header">
        <h2 className="section__title" id="top-podcasts-heading">Top podcasts</h2>
      </div>
      {topFeeds.length > 0 ? (
        <ul className="card-grid">
          {topFeeds.map((feed: IFeed, index: number) => (
            <PodcastCard
              key={feed.feedUrl}
              feed={feed}
              onOpen={openPodcast}
              onToggleFavorite={toggleFavorite}
              isFavorite={favoriteUrls.has(feed.feedUrl)}
              isCurrent={selected?.feedUrl === feed.feedUrl}
              lazy={index >= EAGER_ARTWORK_COUNT}
            />
          ))}
        </ul>
      ) : (
        <ul className="card-grid">
          {SKELETON_CARDS.map((placeholder: number) => (
            <li className="podcast-card" key={placeholder} aria-hidden="true">
              <div className="skeleton skeleton--card" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      <header className="app-bar">
        {/* The site name is the document's top-level heading, not just a link */}
        <h1 className="app-brand-heading">
          <a className="app-brand" href="/">
            <span className="app-brand__mark" aria-hidden="true">🎧</span>
            <span>Podr</span>
          </a>
        </h1>
        <Search onSearch={onSearch} querySignal={query} isLoading={isSearching.value} />
      </header>

      <main className="app-main">
        {!isOnline ? (
          <p className="notice notice--offline" role="status">{OFFLINE_MESSAGE}</p>
        ) : null}

        {searchResults.value.length > 0 ? (
          <section className="section" aria-labelledby="search-results-heading">
            <div className="section__header">
              <h2 className="section__title" id="search-results-heading">
                Results for “{query.value}”
              </h2>
              <span className="section__count">{searchResults.value.length}</span>
            </div>
            <ul className="card-grid">
              {searchResults.value.map((result: IFeed, index: number) => (
                <PodcastCard
                  key={result.feedUrl}
                  feed={result}
                  onOpen={openPodcast}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favoriteUrls.has(result.feedUrl)}
                  isCurrent={selected?.feedUrl === result.feedUrl}
                  lazy={index >= EAGER_ARTWORK_COUNT}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {hasLibrary ? librarySection : discoverSection}
        {hasLibrary ? discoverSection : librarySection}

        <section className="section" aria-labelledby="episodes-heading" ref={episodesRef}>
          <div className="section__header">
            <h2 className="section__title" id="episodes-heading">Episodes</h2>
            {episodeCount > 0 ? <span className="section__count">{episodeCount}</span> : null}
          </div>

          {selected ? (
            <div className="now-playing">
              <img
                className="now-playing__artwork"
                src={selected.artworkUrl100}
                width={64}
                height={64}
                alt=""
                decoding="async"
              />
              <div className="now-playing__text">
                <div className="now-playing__title">{selected.collectionName}</div>
                <div className="now-playing__meta">
                  {isFeedLoading.value
                    ? 'Loading episodes…'
                    : `${episodeCount} ${episodeCount === 1 ? 'episode' : 'episodes'}`}
                </div>
              </div>
              <button
                type="button"
                className={isSelectedFavorite ? 'icon-button icon-button--active' : 'icon-button'}
                onClick={toggleSelectedFavorite}
                aria-pressed={isSelectedFavorite}
              >
                <span aria-hidden="true">{isSelectedFavorite ? '★' : '☆'}</span>
                <span className="visually-hidden">
                  {isSelectedFavorite
                    ? `Remove ${selected.collectionName} from your library`
                    : `Add ${selected.collectionName} to your library`}
                </span>
              </button>
            </div>
          ) : null}

          {feedError.value ? (
            <p className="notice notice--error" role="alert">
              {isOnline ? feedError.value : OFFLINE_MESSAGE}
            </p>
          ) : null}

          <List
            results={results.value}
            onClick={onPlayEpisode}
            isLoading={isFeedLoading.value}
            currentGuid={nowPlaying.value?.guid}
          />
        </section>
      </main>

      <PlayerBar audioRef={audioRef} nowPlaying={nowPlaying.value} />
    </div>
  );
};
