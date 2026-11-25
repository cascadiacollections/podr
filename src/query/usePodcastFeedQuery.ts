import { Signal } from '@preact/signals';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/preact-query';
import { useEffect, useRef } from 'preact/hooks';

import {
  getHistoryFeed,
  getPageUrl,
  IPodcastHistoryState,
  parseResultsFeed,
  toPersistedEpisodes,
  withFeedDetails,
  withResolvedMetadata
} from '../ui/appModel';
import { APP_CONFIG, EMPTY_ARRAY, IFeed } from '../utils/AppContext';
import { EMPTY_FEED_DETAILS, IFeedDetails, parseStoredFeedItems } from '../utils/feed';
import { readStoredJson, writeStoredJson } from '../utils/storage';
import { fetchPodcastFeed, IPodcastFeedData } from './fetchPodcasts';

export const FEED_ERROR_MESSAGE = 'Could not load episodes for this podcast. Please try again.';

export function podcastFeedKey(feedUrl: string) {
  return ['feed', feedUrl] as const;
}

interface IStoredFeed {
  readonly feedUrl: string;
  readonly episodes: IPodcastFeedData['episodes'];
  readonly details: IFeedDetails;
}

function readStoredFeed(): IStoredFeed {
  const stored = parseResultsFeed(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_FEED_KEY, null));
  return {
    feedUrl: stored.feedUrl,
    episodes: parseStoredFeedItems(readStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, EMPTY_ARRAY)),
    details: stored
  };
}

/**
 * The feed the listener opened and the payload that came back describe the
 * same podcast when one address is the other's redirect.
 */
export function feedDataMatches(feed: IFeed, data: IPodcastFeedData): boolean {
  return data.requestedUrl === feed.feedUrl || data.feedUrl === feed.feedUrl;
}

/**
 * Fills a missing name or artwork and follows a permanent move.
 * Returns the same feed when the payload has nothing new.
 */
export function presentFeed(feed: IFeed, data: IPodcastFeedData): IFeed {
  const withMeta = withResolvedMetadata(feed, data.resolved);
  const addressed = data.feedUrl !== withMeta.feedUrl ? { ...withMeta, feedUrl: data.feedUrl } : withMeta;
  return withFeedDetails(addressed, data.details);
}

function rememberFeed(next: IFeed, previousUrl: string, favorited: Signal<ReadonlySet<IFeed>>): void {
  const historyState = window.history.state as IPodcastHistoryState | null;
  const hasMoved = previousUrl !== next.feedUrl;

  if (getHistoryFeed(historyState)?.feedUrl === previousUrl) {
    window.history.replaceState(
      { ...historyState, podrFeed: next },
      '',
      hasMoved ? getPageUrl(next.feedUrl) : undefined
    );
  }

  // The library may already hold the new address too; it keeps one entry
  let replaced = false;
  let changed = false;
  const feeds = Array.from(favorited.value).flatMap((candidate: IFeed) => {
    if (candidate.feedUrl !== previousUrl && candidate.feedUrl !== next.feedUrl) {
      return [candidate];
    }

    changed = true;

    if (replaced) {
      return [];
    }

    replaced = true;
    return [next];
  });

  if (changed) {
    favorited.value = new Set(feeds);
  }
}

/**
 * Episodes for the open podcast.
 * Previous episodes are not kept across a key change: those belong to another
 * show. A failed refresh keeps whatever this show already loaded, which is
 * Query's own behavior when the cache has data. The abort signal cancels the
 * request when the listener goes back.
 *
 * Focus does not refetch: a feed is hundreds of episodes, and downloading it
 * again because the window regained focus hits the service and reparses every
 * description. Reopening the podcast after the cache goes stale still refreshes
 * it, and so does reconnecting. The chart is the query that refreshes on focus.
 */
export function usePodcastFeedQuery(
  selectedFeed: Signal<IFeed | null>,
  favorited: Signal<ReadonlySet<IFeed>>,
  lastOpenedUrl: Signal<string>
): UseQueryResult<IPodcastFeedData, Error> {
  const queryClient = useQueryClient();
  const storedRef = useRef<IStoredFeed | null>(null);

  if (storedRef.current === null) {
    storedRef.current = readStoredFeed();
  }

  const feed = selectedFeed.value;
  const feedUrl = feed?.feedUrl ?? '';
  const stored = storedRef.current;
  const hasStored = Boolean(feedUrl && stored.feedUrl === feedUrl && stored.episodes.length > 0);

  const query = useQuery({
    queryKey: podcastFeedKey(feedUrl),
    queryFn: ({ signal }) => {
      if (!feed) {
        throw new Error('No podcast selected');
      }

      return fetchPodcastFeed(feed, signal);
    },
    enabled: Boolean(feedUrl),
    refetchOnWindowFocus: false,
    initialData: hasStored
      ? {
          episodes: stored.episodes,
          details: stored.feedUrl ? stored.details : EMPTY_FEED_DETAILS,
          feedUrl: stored.feedUrl,
          requestedUrl: feedUrl,
          resolved: { feedUrl: stored.feedUrl }
        }
      : undefined,
    // Saved episodes are shown at once and refreshed in the background
    initialDataUpdatedAt: hasStored ? 0 : undefined
  });

  useEffect(() => {
    const data = query.data;
    const current = selectedFeed.value;

    if (!data || !current || !feedDataMatches(current, data)) {
      return;
    }

    const next = presentFeed(current, data);

    if (next !== current) {
      if (next.feedUrl !== current.feedUrl) {
        // Keep the episodes on screen under the new address, and leave them
        // stale so the new address is actually requested.
        queryClient.setQueryData(
          podcastFeedKey(next.feedUrl),
          { ...data, requestedUrl: next.feedUrl },
          { updatedAt: 0 }
        );
      }

      rememberFeed(next, current.feedUrl, favorited);
      selectedFeed.value = next;
    }

    if (lastOpenedUrl.value !== data.feedUrl) {
      lastOpenedUrl.value = data.feedUrl;
    }

    writeStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_KEY, toPersistedEpisodes(data.episodes));
    writeStoredJson(APP_CONFIG.LOCAL_STORAGE.RESULTS_FEED_KEY, {
      ...data.details,
      feedUrl: data.feedUrl
    });
  }, [favorited, lastOpenedUrl, query.data, queryClient, selectedFeed]);

  return query;
}
