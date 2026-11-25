import { useQuery, UseQueryResult } from '@tanstack/preact-query';

import { APP_CONFIG, ITopPodcast } from '../utils/AppContext';
import { fetchTopPodcasts } from './fetchPodcasts';

export const TOP_PODCASTS_KEY = ['top-podcasts'] as const;

interface IPodrWindow extends Window {
  PODR_TOP_PODCASTS?: { feed: { entry: ReadonlyArray<ITopPodcast> } };
}

/**
 * The chart inlined at build time, when the build had a real list rather than
 * the empty fallback.
 */
function inlinedChart(): readonly ITopPodcast[] | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const entries = (window as IPodrWindow).PODR_TOP_PODCASTS?.feed?.entry;
  return entries && entries.length > 0 ? entries : undefined;
}

/**
 * Top podcasts: the build-time copy when there is one, then the static file,
 * then the API. A constrained connection keeps the copy it already has and
 * skips the background refresh.
 */
export function useTopPodcastsQuery(preferSmallArtwork: boolean): UseQueryResult<readonly ITopPodcast[], Error> {
  const inlined = inlinedChart();

  return useQuery({
    queryKey: TOP_PODCASTS_KEY,
    queryFn: ({ signal, client }) => {
      const cached = client.getQueryData<readonly ITopPodcast[]>(TOP_PODCASTS_KEY);
      return fetchTopPodcasts(signal, Boolean(cached && cached.length > 0));
    },
    initialData: inlined,
    // A chart baked into the page is shown at once and treated as stale, so
    // the API refresh replaces the old five-second timer. On a slow link it
    // is treated as fresh and left alone.
    initialDataUpdatedAt: inlined && !preferSmallArtwork ? 0 : undefined,
    staleTime: preferSmallArtwork ? Infinity : APP_CONFIG.PERFORMANCE.CACHE_TTL_MS,
    refetchOnWindowFocus: !preferSmallArtwork,
    refetchOnReconnect: !preferSmallArtwork
  });
}
