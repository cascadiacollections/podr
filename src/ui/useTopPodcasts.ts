import { Signal } from '@preact/signals';
import { useCallback, useEffect } from 'preact/hooks';

import { APP_CONFIG, EMPTY_ARRAY, ITopPodcast } from '../utils/AppContext';
import { readErrorMessage } from '../utils/helpers';
import { trackEvent } from '../utils/analytics';

const BACKGROUND_REFRESH_TIMEOUT = 5000;

declare global {
  interface Window {
    PODR_TOP_PODCASTS?: { feed: { entry: ReadonlyArray<ITopPodcast> } };
  }
}

/**
 * Loads the top-podcast chart: the copy inlined at build time, then the static
 * file, then the API. A background refresh is skipped on a slow connection.
 */
export const useTopPodcasts = (
  topResults: Signal<ReadonlyArray<ITopPodcast>>,
  preferSmallArtwork: boolean
): void => {
  const fetchTopPodcastsFromAPI = useCallback(() => {
    fetch(`${APP_CONFIG.API_BASE_URL}/?q=toppodcasts&limit=10`)
      .then(async (response: Response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const json: { feed?: { entry?: ReadonlyArray<ITopPodcast> } } = await response.json();
        topResults.value = json?.feed?.entry ?? EMPTY_ARRAY;
      })
      .catch((err: unknown) => {
        trackEvent('exception', {
          description: `search_fetch_toppodcasts_${readErrorMessage(err)}`,
          fatal: false
        });
      });
  }, [topResults]);

  useEffect(() => {
    // First check for window variable (inlined at build time). An empty entry list
    // means the build fell back to placeholder data, so keep looking.
    const inlinedEntries = window.PODR_TOP_PODCASTS?.feed?.entry;

    if (inlinedEntries && inlinedEntries.length > 0) {
      topResults.value = inlinedEntries;
    } else {
      fetch('/top-podcasts.json')
        .then(async (response: Response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const json: { feed?: { entry?: ReadonlyArray<ITopPodcast> } } = await response.json();
          topResults.value = json?.feed?.entry ?? EMPTY_ARRAY;
        })
        .catch((err: unknown) => {
          console.error('Failed to load static top podcasts data:', err);
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
};
