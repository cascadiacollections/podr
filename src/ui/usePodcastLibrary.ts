import { Signal } from '@preact/signals';
import { useCallback } from 'preact/hooks';

import { trackEvent } from '../utils/analytics';
import { IFeed } from '../utils/AppContext';

/**
 * Adds or removes a podcast from the saved library, matched by feed URL.
 */
export const usePodcastLibrary = (
  favorited: Signal<ReadonlySet<IFeed>>
): ((feed: IFeed) => void) => {
  return useCallback((feed: IFeed): void => {
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
  }, [favorited]);
};
