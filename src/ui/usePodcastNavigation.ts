import { Signal } from '@preact/signals';
import { useCallback, useEffect } from 'preact/hooks';

import { IFeed } from '../utils/AppContext';
import {
  getHistoryFeed,
  getLinkedFeedUrl,
  getPageUrl,
  IPodcastHistoryState,
  scrollToPosition
} from './appModel';
import { IFeedError } from './usePodcastFeed';

export interface IPodcastNavigation {
  readonly openPodcast: (feed: IFeed) => void;
  readonly closePodcast: () => void;
  readonly showBrowse: () => void;
}

/**
 * Moves between the browse grid and one podcast, using the browser history so
 * Back, Forward, reload, and a shared `?feed=` link all land in the same place.
 */
export const usePodcastNavigation = (
  feeds: Signal<ReadonlyArray<IFeed>>,
  selectedFeed: Signal<IFeed | null>,
  isFeedLoading: Signal<boolean>,
  feedError: Signal<IFeedError | null>,
  browseScrollRef: { current: number },
  feedRequestId: { current: number },
  feedAbortRef: { current: AbortController | null },
  tryFetchFeed: (feed: IFeed) => Promise<void>
): IPodcastNavigation => {
  const openPodcast = useCallback((feed: IFeed) => {
    browseScrollRef.current = window.scrollY;

    window.history.pushState(
      { podrFeed: feed, podrPushed: true } satisfies IPodcastHistoryState,
      '',
      getPageUrl(feed.feedUrl)
    );

    void tryFetchFeed(feed);
    scrollToPosition(0);
  }, [browseScrollRef, tryFetchFeed]);

  const showBrowse = useCallback(() => {
    feedRequestId.current++;
    feedAbortRef.current?.abort();
    isFeedLoading.value = false;
    feedError.value = null;
    selectedFeed.value = null;
    scrollToPosition(browseScrollRef.current);
  }, [browseScrollRef, feedAbortRef, feedError, feedRequestId, isFeedLoading, selectedFeed]);

  const closePodcast = useCallback(() => {
    if ((window.history.state as IPodcastHistoryState | null)?.podrPushed) {
      // popstate below finishes the job, exactly as the browser's Back would
      window.history.back();
    } else {
      window.history.replaceState(null, '', getPageUrl());
      showBrowse();
    }
  }, [showBrowse]);

  useEffect(() => {
    const restored = getHistoryFeed(window.history.state);
    const linkedFeedUrl = restored ? null : getLinkedFeedUrl();

    if (restored) {
      void tryFetchFeed(restored);
    } else if (linkedFeedUrl) {
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
  }, [feeds, showBrowse, tryFetchFeed]);

  return { openPodcast, closePodcast, showBrowse };
};
