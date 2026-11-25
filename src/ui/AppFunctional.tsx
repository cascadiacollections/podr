import { signal } from '@preact/signals';
import { h, JSX } from 'preact';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import { PodrQueryProvider } from '../query/QueryProvider';
import { FEED_ERROR_MESSAGE, feedDataMatches, presentFeed, usePodcastFeedQuery } from '../query/usePodcastFeedQuery';
import { usePodcastSearchQuery, useSearchTerm } from '../query/usePodcastSearchQuery';
import { useTopPodcastsQuery } from '../query/useTopPodcastsQuery';
import { APP_CONFIG, createAppState, EMPTY_ARRAY, IFeed, ITopPodcast } from '../utils/AppContext';
import { EMPTY_FEED_DETAILS } from '../utils/feed';
import { parseStoredFeeds, readErrorMessage } from '../utils/helpers';
import { isConstrainedConnection, useOnlineStatus } from '../utils/network';
import { readStoredJson } from '../utils/storage';
import { OFFLINE_MESSAGE, parseResultsFeed, toFeed } from './appModel';
import { BrowseView } from './BrowseView';
import { INowPlaying, PlayerBar } from './PlayerBar';
import { PodcastView } from './PodcastView';
import { PromoBanner } from './PromoBanner';
import { Search } from './Search';
import { SiteFooter } from './SiteFooter';
import { useEpisodePlayer } from './useEpisodePlayer';
import { usePodcastLibrary } from './usePodcastLibrary';
import { usePodcastNavigation } from './usePodcastNavigation';
import { useStoredSignal } from './useStoredSignal';

const NO_EPISODES = EMPTY_ARRAY;

export const App = (): JSX.Element => (
  <PodrQueryProvider>
    <AppShell />
  </PodrQueryProvider>
);

const AppShell = (): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const browseScrollRef = useRef(0);
  const documentTitleRef = useRef(document.title);
  const isOnline = useOnlineStatus();

  const { query, favorited, feeds } = useMemo(
    () => createAppState({
      favorited: signal(new Set(parseStoredFeeds(readStoredJson(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, []))))
    }),
    []
  );

  const { selectedFeed, nowPlaying, lastOpenedUrl } = useMemo(
    () => ({
      selectedFeed: signal<IFeed | null>(null),
      nowPlaying: signal<INowPlaying | undefined>(undefined),
      lastOpenedUrl: signal(parseResultsFeed(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_FEED_KEY, null)).feedUrl)
    }),
    []
  );

  // Asking for less data is the cheapest optimization available on a metered link
  const preferSmallArtwork = useMemo(() => isConstrainedConnection(), []);

  useStoredSignal(APP_CONFIG.LOCAL_STORAGE.FEEDS_KEY, feeds);

  const topQuery = useTopPodcastsQuery(preferSmallArtwork);
  const { openPodcast, closePodcast } = usePodcastNavigation(feeds, selectedFeed, browseScrollRef);
  const { term: searchTerm, submit: submitSearch } = useSearchTerm(query);
  const searchQuery = usePodcastSearchQuery(searchTerm);
  const feedQuery = usePodcastFeedQuery(selectedFeed, favorited, lastOpenedUrl);
  const onPlayEpisode = useEpisodePlayer(audioRef, selectedFeed, nowPlaying);
  const toggleFavorite = usePodcastLibrary(favorited);

  // Results are listed on the browse view, so a search leaves the podcast
  const onSearchFromAnyView = useCallback((searchQueryText: string) => {
    if (searchQueryText && selectedFeed.value) {
      closePodcast();
    }

    submitSearch(searchQueryText);
  }, [closePodcast, selectedFeed, submitSearch]);

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
  const feedData = feedQuery.data;
  const feedReady = Boolean(selected && feedData && feedDataMatches(selected, feedData));
  const viewFeed = feedReady && selected && feedData ? presentFeed(selected, feedData) : selected;
  const details = feedReady && feedData ? feedData.details : EMPTY_FEED_DETAILS;
  const episodes = feedReady && feedData ? feedData.episodes : NO_EPISODES;
  const selectedName = viewFeed
    ? details.title || viewFeed.collectionName
    : '';

  useEffect(() => {
    const browseTitle = documentTitleRef.current;
    document.title = selectedName ? `${selectedName} · Podr` : browseTitle;
  }, [selectedName]);

  const openedUrl = lastOpenedUrl.value;
  const isSelectedFavorite = viewFeed
    ? favoriteUrls.has(viewFeed.feedUrl) || (selected ? favoriteUrls.has(selected.feedUrl) : false)
    : false;
  const topFeeds = useMemo(
    () => (topQuery.data ?? []).map((podcast: ITopPodcast) => toFeed(podcast, preferSmallArtwork)),
    [preferSmallArtwork, topQuery.data]
  );

  const searchTermActive = searchTerm.trim().length >= APP_CONFIG.SEARCH.MIN_QUERY_LENGTH;
  const searchFeeds = searchTermActive ? (searchQuery.data?.feeds ?? []) : [];
  const searchHeading = searchQuery.data?.term ?? searchTerm.trim();
  const feedError = feedQuery.isError
    ? (isOnline
        ? { message: FEED_ERROR_MESSAGE, reason: readErrorMessage(feedQuery.error) }
        : { message: OFFLINE_MESSAGE })
    : undefined;

  return (
    <div>
      <header className="app-bar">
        <h1 className="app-brand-heading">
          <a className="app-brand" href="/">
            <span className="app-brand__mark" aria-hidden="true">🎧</span>
            <span>Podr</span>
          </a>
        </h1>
        <Search
          onSearch={onSearchFromAnyView}
          querySignal={query}
          isLoading={searchTermActive && searchQuery.isFetching}
        />
      </header>

      <main className="app-main">
        {!isOnline ? (
          <p className="notice notice--offline" role="status">{OFFLINE_MESSAGE}</p>
        ) : null}

        <PromoBanner />

        {viewFeed ? (
          <PodcastView
            feed={viewFeed}
            details={details}
            episodes={episodes}
            isLoading={feedQuery.isFetching}
            isFavorite={isSelectedFavorite}
            error={feedError}
            currentGuid={nowPlaying.value?.guid}
            onBack={closePodcast}
            onToggleFavorite={toggleSelectedFavorite}
            onPlay={onPlayEpisode}
          />
        ) : (
          <BrowseView
            feeds={feeds.value}
            topFeeds={topFeeds}
            searchResults={searchFeeds}
            query={searchHeading}
            favoriteUrls={favoriteUrls}
            lastOpenedUrl={openedUrl}
            onOpen={openPodcast}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      <SiteFooter />

      <PlayerBar audioRef={audioRef} nowPlaying={nowPlaying.value} />
    </div>
  );
};
