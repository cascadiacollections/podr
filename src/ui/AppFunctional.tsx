import { effect, signal, Signal } from '@preact/signals';
import { Fragment, h, JSX } from 'preact';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import { trackEvent } from '../utils/analytics';
import { APP_CONFIG, createAppState, EMPTY_ARRAY, IFeed, ITopPodcast } from '../utils/AppContext';
import {
  EMPTY_FEED_DETAILS,
  IFeedDetails,
  parseFeedDetails,
  parseFeedResponse,
  parseStoredFeedItems
} from '../utils/feed';
import { getFeedUrl, getSecureUrl, IResolvedFeed, resolveFeed } from '../utils/helpers';
import { isConstrainedConnection, useOnlineStatus } from '../utils/network';
import { readStoredJson, writeStoredJson } from '../utils/storage';
import { INowPlaying, PlayerBar } from './PlayerBar';
import { PodcastCard } from './PodcastCard';
import { PodcastView } from './PodcastView';
import { IFeedItem } from './Result';
import { Search } from './Search';

declare global {
  interface Window {
    PODR_TOP_PODCASTS?: { feed: { entry: ReadonlyArray<ITopPodcast> } };
  }
}

const BACKGROUND_REFRESH_TIMEOUT = 5000;
const FEED_ERROR_MESSAGE = 'Could not load episodes for this podcast. Please try again.';

/**
 * A feed failure and the underlying cause, shown so a failure can be reported
 * without a devtools console
 */
interface IFeedError {
  readonly message: string;
  readonly reason: string;
}
const OFFLINE_MESSAGE =
  'You are offline. Showing the podcasts and episodes already saved on this device.';

/**
 * Episodes kept in local storage. A feed can return hundreds, and every one of them
 * is parsed again on the next cold start - on a low-power device that parse is felt.
 * The rest are one fetch away.
 */
const MAX_PERSISTED_EPISODES = 60;

/**
 * Characters of each episode description kept in local storage: enough for the
 * two-line summary the list shows, without persisting entire show notes.
 */
const MAX_PERSISTED_DESCRIPTION = 280;

/**
 * Which podcast the loaded episodes belong to, and what its feed says about
 * itself. Kept beside the episodes so neither is ever shown under another
 * podcast's name.
 */
interface IResultsFeed extends IFeedDetails {
  readonly feedUrl: string;
}

const NO_RESULTS_FEED: IResultsFeed = Object.freeze({ ...EMPTY_FEED_DETAILS, feedUrl: '' });

const parseResultsFeed = (value: unknown): IResultsFeed => {
  const feedUrl = (value as { feedUrl?: unknown } | null)?.feedUrl;

  return typeof feedUrl === 'string' && feedUrl
    ? Object.freeze({ ...parseFeedDetails(value), feedUrl })
    : NO_RESULTS_FEED;
};

/**
 * The history entry for an open podcast. Carrying the whole feed lets Back,
 * Forward and a reload reopen it without looking anything up.
 */
interface IPodcastHistoryState {
  readonly podrFeed: IFeed;
  /**
   * Whether the app pushed this entry over a browse entry. A podcast opened from
   * a shared link has no browse entry behind it, and going back from it must not
   * leave the site.
   */
  readonly podrPushed?: boolean;
}

/**
 * The query parameter that makes a podcast linkable: `/?feed=<feed URL>`.
 * A query rather than a path, so every deployment's single-page fallback
 * serves it without new rewrite rules.
 */
const FEED_PARAM = 'feed';

const HTTP_URL_PATTERN = /^https?:\/\//i;

/**
 * The page URL with the podcast parameter set, or removed for the browse view.
 * Other parameters, such as `?debug=`, are kept.
 */
const getPageUrl = (feedUrl?: string): string => {
  const url = new URL(window.location.href);

  if (feedUrl) {
    url.searchParams.set(FEED_PARAM, feedUrl);
  } else {
    url.searchParams.delete(FEED_PARAM);
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * The feed a shared link points at, if it names a web URL
 */
const getLinkedFeedUrl = (): string | null => {
  const feedUrl = new URLSearchParams(window.location.search).get(FEED_PARAM)?.trim();

  return feedUrl && HTTP_URL_PATTERN.test(feedUrl) ? feedUrl : null;
};

/**
 * Fills a feed's missing name, artwork and maker from what the feed says about
 * itself - all a podcast opened from a link has to go on. Returns the original
 * feed when nothing is missing.
 */
const withFeedDetails = (feed: IFeed, details: IFeedDetails): IFeed => {
  const needsName = !feed.collectionName || HTTP_URL_PATTERN.test(feed.collectionName);
  const collectionName = needsName && details.title ? details.title : feed.collectionName;
  const artworkUrl100 = feed.artworkUrl100 || details.image;
  const artistName = feed.artistName || details.author || undefined;

  if (
    collectionName === feed.collectionName &&
    artworkUrl100 === feed.artworkUrl100 &&
    artistName === feed.artistName
  ) {
    return feed;
  }

  return {
    ...feed,
    collectionName,
    artworkUrl100,
    artworkUrl600: feed.artworkUrl600 || details.image,
    artistName
  };
};

const getHistoryFeed = (state: unknown): IFeed | null => {
  const feed = (state as Partial<IPodcastHistoryState> | null)?.podrFeed;

  return feed && typeof feed.feedUrl === 'string' && feed.feedUrl ? feed : null;
};

const scrollToPosition = (top: number): void => {
  try {
    window.scrollTo({ top, behavior: 'auto' });
  } catch {
    // Not every environment implements scrolling; position is a nicety
  }
};

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
 * Trims the episode list before it is persisted, keeping only as much of each
 * description as the list's summary shows.
 */
const toPersistedEpisodes = (items: ReadonlyArray<IFeedItem>): ReadonlyArray<unknown> =>
  items.slice(0, MAX_PERSISTED_EPISODES).map((item: IFeedItem) => ({
    guid: item.guid,
    title: item.title,
    pubDate: item.pubDate,
    description: item.description.length > MAX_PERSISTED_DESCRIPTION
      ? `${item.description.slice(0, MAX_PERSISTED_DESCRIPTION).trimEnd()}…`
      : item.description,
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
 * Whether a feed is missing the metadata the UI needs to present it.
 *
 * Builds before the card redesign saved favorites with the Apple Podcasts URL as
 * the name and no artwork at all, which renders as a broken image labelled with a
 * URL. Resolving the feed supplies both, so those entries can be repaired in place.
 */
const needsMetadata = (feed: IFeed): boolean =>
  !feed.artworkUrl100 || /^https?:\/\//i.test(feed.collectionName);

/**
 * Fills in a feed's missing name and artwork from a resolution result, keeping
 * `feedUrl` so the entry's identity - and its place in the library - is unchanged.
 * Returns the original feed when there is nothing to repair.
 */
const withResolvedMetadata = (feed: IFeed, resolved: IResolvedFeed): IFeed => {
  if (!needsMetadata(feed)) {
    return feed;
  }

  const collectionName = resolved.collectionName ?? feed.collectionName;
  const artwork = resolved.artworkUrl ?? feed.artworkUrl100;

  if (collectionName === feed.collectionName && artwork === feed.artworkUrl100) {
    return feed;
  }

  return {
    collectionName,
    feedUrl: feed.feedUrl,
    artworkUrl100: artwork,
    artworkUrl600: resolved.artworkUrl ?? feed.artworkUrl600
  };
};

/**
 * Presents a top podcast as a feed so a single card component serves every grid.
 * `feedUrl` is the podcast's Apple Podcasts page, resolved to RSS when opened.
 */
const toFeed = (podcast: ITopPodcast, preferSmall: boolean): IFeed => {
  const artwork = getTopPodcastArtwork(podcast, preferSmall);

  return {
    // The title is "<name> - <artist>"; the separate fields read better on a card
    collectionName: podcast['im:name']?.label || podcast.title.label,
    feedUrl: podcast.id.label,
    artworkUrl100: artwork,
    artworkUrl600: artwork,
    artistName: podcast['im:artist']?.label
  };
};

export const App = (): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Where the browse view was scrolled to when a podcast was opened
  const browseScrollRef = useRef(0);
  // The page's own title, put back when the listener returns to browsing
  const documentTitleRef = useRef(document.title);
  const isOnline = useOnlineStatus();

  const { query, favorited, feeds, results, searchResults, topResults } = useMemo(
    () => createAppState({
      favorited: signal(new Set(readStoredJson<IFeed[]>(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, []))),
      results: signal(parseStoredFeedItems(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, EMPTY_ARRAY))),
    }),
    []
  );

  // Presentation state, kept local to the component rather than in shared app state
  const { isFeedLoading, isSearching, feedError, selectedFeed, nowPlaying, resultsFeed } = useMemo(
    () => ({
      resultsFeed: signal<IResultsFeed>(
        parseResultsFeed(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_FEED_KEY, null))
      ),
      isFeedLoading: signal(false),
      isSearching: signal(false),
      feedError: signal<IFeedError | null>(null),
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
  useLocalStorage(APP_CONFIG.LOCAL_STORAGE.RESULTS_FEED_KEY, resultsFeed);

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

  /**
   * Puts a better-described copy of the open podcast everywhere the old one is
   * kept: the view, the library, and the history entry
   */
  const applyRepairedFeed = useCallback((repaired: IFeed): void => {
    selectedFeed.value = repaired;

    const state = window.history.state as IPodcastHistoryState | null;

    if (getHistoryFeed(state)?.feedUrl === repaired.feedUrl) {
      window.history.replaceState({ ...state, podrFeed: repaired }, '');
    }

    favorited.value = new Set(
      Array.from(favorited.value).map((candidate: IFeed) =>
        candidate.feedUrl === repaired.feedUrl ? repaired : candidate
      )
    );
  }, []);

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

    // Episodes kept from another podcast must not appear under this one's name.
    // Those of the same podcast stay, so a reopen - or an offline one - is instant.
    if (resultsFeed.value.feedUrl !== feed.feedUrl) {
      results.value = EMPTY_ARRAY;
      resultsFeed.value = { ...EMPTY_FEED_DETAILS, feedUrl: feed.feedUrl };
    }

    try {
      // Resolve the feed URL (converts Apple Podcasts URLs to RSS feed URLs)
      const resolved = await resolveFeed(feed.feedUrl);

      // Resolution is the only place a podcast saved by an older build can learn
      // its own name and artwork
      const repaired = withResolvedMetadata(feed, resolved);

      if (repaired !== feed) {
        applyRepairedFeed(repaired);
      }

      // Fetch the feed data
      const response = await fetch(getFeedUrl(resolved.feedUrl), { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Throws when the response is not a feed, so a wrong-but-successful
      // response surfaces as an error rather than an empty episode list
      const payload: unknown = await response.json();
      const feedResults = parseFeedResponse(payload);

      // A newer request has since started; its results win
      if (!isCurrentRequest()) {
        return;
      }

      const details = parseFeedDetails(payload);

      results.value = feedResults;
      resultsFeed.value = { ...details, feedUrl: feed.feedUrl };

      // A podcast opened from a link learns its name and artwork here
      const current = selectedFeed.value;

      if (current?.feedUrl === feed.feedUrl) {
        const completed = withFeedDetails(current, details);

        if (completed !== current) {
          applyRepairedFeed(completed);
        }
      }
    } catch (err: unknown) {
      // Handle errors from resolveFeedUrl, fetch, and response parsing
      const error = err as Error;

      // A superseded request is expected, not a failure worth reporting
      if (error.name === 'AbortError') {
        return;
      }

      // Leave any previously loaded episodes in place rather than clearing them
      if (isCurrentRequest()) {
        feedError.value = { message: FEED_ERROR_MESSAGE, reason: error.message };
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
    browseScrollRef.current = window.scrollY;

    // A history entry per podcast, so the browser's Back returns to browsing
    window.history.pushState(
      { podrFeed: feed, podrPushed: true } satisfies IPodcastHistoryState,
      '',
      getPageUrl(feed.feedUrl)
    );

    void tryFetchFeed(feed);
    scrollToPosition(0);
  }, [tryFetchFeed]);

  /**
   * Leaves the podcast view without touching history; the caller decides
   * whether an entry is being popped or never existed
   */
  const showBrowse = useCallback(() => {
    // Nobody is waiting on that feed any more
    feedRequestId.current++;
    feedAbortRef.current?.abort();
    isFeedLoading.value = false;
    feedError.value = null;
    selectedFeed.value = null;
    scrollToPosition(browseScrollRef.current);
  }, []);

  const closePodcast = useCallback(() => {
    if ((window.history.state as IPodcastHistoryState | null)?.podrPushed) {
      // popstate below finishes the job, exactly as the browser's Back would
      window.history.back();
    } else {
      // Opened from a link: there is no browse entry to return to, so this
      // entry becomes one
      window.history.replaceState(null, '', getPageUrl());
      showBrowse();
    }
  }, [showBrowse]);

  // Results are listed on the browse view, so a search leaves the podcast
  const onSearchFromAnyView = useCallback((searchQuery: string, limit?: number) => {
    if (searchQuery && selectedFeed.value) {
      closePodcast();
    }

    onSearch(searchQuery, limit);
  }, [closePodcast, onSearch]);

  // Back, Forward and reload move between browsing and a podcast
  useEffect(() => {
    const restored = getHistoryFeed(window.history.state);
    const linkedFeedUrl = restored ? null : getLinkedFeedUrl();

    if (restored) {
      void tryFetchFeed(restored);
    } else if (linkedFeedUrl) {
      // A shared link carries only the feed URL. A podcast already known here
      // opens complete; any other is filled in from its own feed.
      const linked: IFeed = feeds.value.find((feed: IFeed) => feed.feedUrl === linkedFeedUrl) ?? {
        collectionName: '',
        feedUrl: linkedFeedUrl,
        artworkUrl100: '',
        artworkUrl600: ''
      };

      window.history.replaceState({ podrFeed: linked } satisfies IPodcastHistoryState, '');
      void tryFetchFeed(linked);
    }

    const onPopState = (event: PopStateEvent): void => {
      const feed = getHistoryFeed(event.state);

      if (feed) {
        void tryFetchFeed(feed);
        scrollToPosition(0);
      } else {
        showBrowse();
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [tryFetchFeed, showBrowse]);

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
  // The tab, history and any shared link's preview name the open podcast
  const selectedName = selected
    ? (resultsFeed.value.feedUrl === selected.feedUrl && resultsFeed.value.title) || selected.collectionName
    : '';

  useEffect(() => {
    const browseTitle = documentTitleRef.current;

    document.title = selectedName ? `${selectedName} · Podr` : browseTitle;
  }, [selectedName]);

  // Marked in the grids, so returning from a podcast shows where you were
  const lastOpenedUrl = resultsFeed.value.feedUrl;
  const isSelectedFavorite = selected ? favoriteUrls.has(selected.feedUrl) : false;
  const topFeeds = useMemo(
    () => topResults.value.map((podcast: ITopPodcast) => toFeed(podcast, preferSmallArtwork)),
    [topResults.value, preferSmallArtwork]
  );
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
              isCurrent={lastOpenedUrl === result.feedUrl}
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
              isCurrent={lastOpenedUrl === feed.feedUrl}
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
        <Search onSearch={onSearchFromAnyView} querySignal={query} isLoading={isSearching.value} />
      </header>

      <main className="app-main">
        {!isOnline ? (
          <p className="notice notice--offline" role="status">{OFFLINE_MESSAGE}</p>
        ) : null}

        {selected ? (
          <PodcastView
            feed={selected}
            details={resultsFeed.value.feedUrl === selected.feedUrl ? resultsFeed.value : EMPTY_FEED_DETAILS}
            episodes={results.value}
            isLoading={isFeedLoading.value}
            isFavorite={isSelectedFavorite}
            error={feedError.value
              ? isOnline ? feedError.value : { message: OFFLINE_MESSAGE }
              : undefined}
            currentGuid={nowPlaying.value?.guid}
            onBack={closePodcast}
            onToggleFavorite={toggleSelectedFavorite}
            onPlay={onPlayEpisode}
          />
        ) : (
          <Fragment>
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
                      isCurrent={lastOpenedUrl === result.feedUrl}
                      lazy={index >= EAGER_ARTWORK_COUNT}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {hasLibrary ? librarySection : discoverSection}
            {hasLibrary ? discoverSection : librarySection}
          </Fragment>
        )}
      </main>

      <PlayerBar audioRef={audioRef} nowPlaying={nowPlaying.value} />
    </div>
  );
};
