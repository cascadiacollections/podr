import { signal } from '@preact/signals';
import { h, JSX } from 'preact';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import { APP_CONFIG, createAppState, EMPTY_ARRAY, IFeed, ITopPodcast } from '../utils/AppContext';
import { EMPTY_FEED_DETAILS, parseStoredFeedItems } from '../utils/feed';
import { parseStoredFeeds } from '../utils/helpers';
import { isConstrainedConnection, useOnlineStatus } from '../utils/network';
import { readStoredJson } from '../utils/storage';
import { IResultsFeed, OFFLINE_MESSAGE, parseResultsFeed, toFeed, toPersistedEpisodes } from './appModel';
import { BrowseView } from './BrowseView';
import { INowPlaying, PlayerBar } from './PlayerBar';
import { PodcastView } from './PodcastView';
import { PromoBanner } from './PromoBanner';
import { Search } from './Search';
import { SiteFooter } from './SiteFooter';
import { useEpisodePlayer } from './useEpisodePlayer';
import { IFeedError, usePodcastFeed } from './usePodcastFeed';
import { usePodcastLibrary } from './usePodcastLibrary';
import { usePodcastNavigation } from './usePodcastNavigation';
import { usePodcastSearch } from './usePodcastSearch';
import { useStoredSignal } from './useStoredSignal';
import { useTopPodcasts } from './useTopPodcasts';

export const App = (): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const browseScrollRef = useRef(0);
  const documentTitleRef = useRef(document.title);
  const feedRequestId = useRef(0);
  const searchRequestId = useRef(0);
  const feedAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const isOnline = useOnlineStatus();

  const { query, favorited, feeds, results, searchResults, topResults } = useMemo(
    () => createAppState({
      favorited: signal(new Set(parseStoredFeeds(readStoredJson(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, [])))),
      results: signal(parseStoredFeedItems(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, EMPTY_ARRAY))),
    }),
    []
  );

  const { isFeedLoading, isSearching, feedError, selectedFeed, nowPlaying, resultsFeed } = useMemo(
    () => ({
      resultsFeed: signal<IResultsFeed>(parseResultsFeed(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_FEED_KEY, null))),
      isFeedLoading: signal(false),
      isSearching: signal(false),
      feedError: signal<IFeedError | null>(null),
      selectedFeed: signal<IFeed | null>(null),
      nowPlaying: signal<INowPlaying | undefined>(undefined)
    }),
    []
  );

  // Asking for less data is the cheapest optimization available on a metered link
  const preferSmallArtwork = useMemo(() => isConstrainedConnection(), []);

  useStoredSignal(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, feeds);
  useStoredSignal(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, results, toPersistedEpisodes);
  useStoredSignal(APP_CONFIG.LOCAL_STORAGE.RESULTS_FEED_KEY, resultsFeed);
  useTopPodcasts(topResults, preferSmallArtwork);

  useEffect(() => {
    return () => {
      feedAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, []);

  const { tryFetchFeed } = usePodcastFeed(
    { favorited, results, resultsFeed, isFeedLoading, feedError, selectedFeed },
    feedRequestId,
    feedAbortRef
  );
  const onPlayEpisode = useEpisodePlayer(audioRef, selectedFeed, nowPlaying);
  const toggleFavorite = usePodcastLibrary(favorited);
  const { openPodcast, closePodcast } = usePodcastNavigation(
    feeds,
    selectedFeed,
    isFeedLoading,
    feedError,
    browseScrollRef,
    feedRequestId,
    feedAbortRef,
    tryFetchFeed
  );
  const onSearch = usePodcastSearch(query, searchResults, isSearching, searchRequestId, searchAbortRef);

  // Results are listed on the browse view, so a search leaves the podcast
  const onSearchFromAnyView = useCallback((searchQuery: string, limit?: number) => {
    if (searchQuery && selectedFeed.value) {
      closePodcast();
    }

    onSearch(searchQuery, limit);
  }, [closePodcast, onSearch, selectedFeed]);

  const toggleSelectedFavorite = useCallback(() => {
    const feed = selectedFeed.value;

    if (feed) {
      toggleFavorite(feed);
    }
  }, [selectedFeed, toggleFavorite]);

  const favoriteUrls = useMemo(
    () => new Set(feeds.value.map((feed: IFeed) => feed.feedUrl)),
    [feeds.value]
  );

  const selected = selectedFeed.value;
  const selectedName = selected
    ? (resultsFeed.value.feedUrl === selected.feedUrl && resultsFeed.value.title) || selected.collectionName
    : '';

  useEffect(() => {
    const browseTitle = documentTitleRef.current;

    document.title = selectedName ? `${selectedName} · Podr` : browseTitle;
  }, [selectedName]);

  const lastOpenedUrl = resultsFeed.value.feedUrl;
  const isSelectedFavorite = selected ? favoriteUrls.has(selected.feedUrl) : false;
  const topFeeds = useMemo(
    () => topResults.value.map((podcast: ITopPodcast) => toFeed(podcast, preferSmallArtwork)),
    [topResults.value, preferSmallArtwork]
  );

  return (
    <div>
      <header className="app-bar">
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

        <PromoBanner />

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
          <BrowseView
            feeds={feeds.value}
            topFeeds={topFeeds}
            searchResults={searchResults.value}
            query={query.value}
            favoriteUrls={favoriteUrls}
            lastOpenedUrl={lastOpenedUrl}
            onOpen={openPodcast}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      <SiteFooter />

      <PlayerBar audioRef={audioRef} nowPlaying={nowPlaying.value} />
    </div>
  );
}
