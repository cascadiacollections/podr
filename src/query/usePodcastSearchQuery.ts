import { Signal } from '@preact/signals';
import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/preact-query';
import { useCallback, useEffect, useState } from 'preact/hooks';

import { APP_CONFIG, IFeed } from '../utils/AppContext';
import { fetchPodcastSearch } from './fetchPodcasts';

/**
 * Search hits for one term. The term travels with the hits so a placeholder
 * from the previous key stays labelled with the query that produced it.
 */
export interface ISearchData {
  readonly term: string;
  readonly feeds: readonly IFeed[];
}

export function searchQueryKey(term: string, limit: number = APP_CONFIG.SEARCH.DEFAULT_LIMIT) {
  return ['search', term, limit] as const;
}

/**
 * Catalog search.
 * Disabled below the minimum length, so a single character never leaves the
 * device. `keepPreviousData` holds the last hits on screen while the next
 * term is in flight. Focus does not refetch: a chart changing under a reader
 * is useful, a result list rearranging itself is not.
 */
export function usePodcastSearchQuery(term: string): UseQueryResult<ISearchData, Error> {
  const trimmed = term.trim();
  const limit = APP_CONFIG.SEARCH.DEFAULT_LIMIT;

  return useQuery({
    queryKey: searchQueryKey(trimmed, limit),
    queryFn: async ({ signal }) => ({
      term: trimmed,
      feeds: await fetchPodcastSearch(trimmed, limit, signal)
    }),
    enabled: trimmed.length >= APP_CONFIG.SEARCH.MIN_QUERY_LENGTH,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false
  });
}

/**
 * Debounces a string. The first value is returned immediately; later values
 * wait, so the field can be controlled without a request per keystroke.
 */
export function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * The term the search query should use.
 * Typing is debounced. Submitting the form applies the term immediately,
 * which is also how a short or empty field clears the results.
 */
export function useSearchTerm(query: Signal<string>) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const raw = query.value;
  const debounced = useDebouncedValue(raw, APP_CONFIG.PERFORMANCE.DEBOUNCE_MS);

  useEffect(() => {
    if (submitted !== null && raw !== submitted) {
      setSubmitted(null);
    }
  }, [raw, submitted]);

  const submit = useCallback((term: string) => {
    query.value = term;
    setSubmitted(term);
  }, [query]);

  return { term: submitted ?? debounced, submit };
}
