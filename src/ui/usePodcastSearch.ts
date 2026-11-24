import { Signal } from '@preact/signals';
import { useCallback } from 'preact/hooks';

import { trackEvent } from '../utils/analytics';
import { APP_CONFIG, EMPTY_ARRAY, IFeed } from '../utils/AppContext';
import { readErrorMessage, readErrorName } from '../utils/helpers';

/**
 * Searches the podcast catalog. An empty query clears the results.
 * The search text itself is not sent to analytics.
 */
export const usePodcastSearch = (
  query: Signal<string>,
  searchResults: Signal<ReadonlyArray<IFeed>>,
  isSearching: Signal<boolean>,
  searchRequestId: { current: number },
  searchAbortRef: { current: AbortController | null }
): ((searchQuery: string, limit?: number) => void) => {
  return useCallback((searchQuery: string, limit: number = APP_CONFIG.SEARCH.DEFAULT_LIMIT) => {
    query.value = searchQuery;

    searchAbortRef.current?.abort();

    if (!searchQuery || !searchQuery.length) {
      searchResults.value = EMPTY_ARRAY;
      isSearching.value = false;
      return;
    }

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
      .catch((err: unknown) => {
        if (readErrorName(err) === 'AbortError') {
          return;
        }

        trackEvent('exception', {
          description: `search_fetch_${limit}_${readErrorMessage(err)}`,
          fatal: false
        });
      })
      .finally(() => {
        if (requestId === searchRequestId.current) {
          isSearching.value = false;
        }
      });
  }, [isSearching, query, searchAbortRef, searchRequestId, searchResults]);
};
