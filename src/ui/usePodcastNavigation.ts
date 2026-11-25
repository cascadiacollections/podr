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

export interface IPodcastNavigation {
  readonly openPodcast: (feed: IFeed) => void;
  readonly closePodcast: () => void;
  readonly showBrowse: () => void;
}

/**
 * Moves between the browse grid and one podcast, using the browser history so
 * Back, Forward, reload, and a shared `?feed=` link all land in the same place.
 * Opening a podcast only selects it. The episode query runs from that selection
 * and is cancelled when the selection is cleared.
 */
export const usePodcastNavigation = (
  feeds: Signal<ReadonlyArray<IFeed>>,
  selectedFeed: Signal<IFeed | null>,
  browseScrollRef: { current: number }
): IPodcastNavigation => {
  const showBrowse = useCallback(() => {
    selectedFeed.value = null;
    scrollToPosition(browseScrollRef.current);
  }, [browseScrollRef, selectedFeed]);

  const openPodcast = useCallback((feed: IFeed) => {
    browseScrollRef.current = window.scrollY;

    window.history.pushState(
      { podrFeed: feed, podrPushed: true } satisfies IPodcastHistoryState,
      '',
      getPageUrl(feed.feedUrl)
    );

    selectedFeed.value = feed;
    scrollToPosition(0);
  }, [browseScrollRef, selectedFeed]);

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
      selectedFeed.value = restored;
    } else if (linkedFeedUrl) {
      const linked: IFeed = feeds.value.find((feed: IFeed) => feed.feedUrl === linkedFeedUrl) ?? {
        collectionName: '',
        feedUrl: linkedFeedUrl,
        artworkUrl100: '',
        artworkUrl600: ''
      };

      window.history.replaceState({ podrFeed: linked } satisfies IPodcastHistoryState, '');
      selectedFeed.value = linked;
    }

    const onPopState = (event: PopStateEvent): void => {
      const feed = getHistoryFeed(event.state);

      if (feed) {
        selectedFeed.value = feed;
        scrollToPosition(0);
      } else {
        showBrowse();
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [feeds, selectedFeed, showBrowse]);

  return { openPodcast, closePodcast, showBrowse };
};
