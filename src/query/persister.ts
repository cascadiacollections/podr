import { removeOldestQuery } from '@tanstack/preact-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Persister } from '@tanstack/query-persist-client-core';

import { toPersistedEpisodes } from '../ui/appModel';
import { IFeedItem } from '../ui/Result';
import { QUERY_CACHE_KEY } from './queryClient';

interface IPersistableFeed {
  readonly episodes: readonly IFeedItem[];
  readonly feedUrl: string;
  readonly requestedUrl: string;
}

function isPersistableFeed(data: unknown): data is IPersistableFeed {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const candidate = data as Partial<IPersistableFeed>;
  return Array.isArray(candidate.episodes) && typeof candidate.feedUrl === 'string';
}

/**
 * Episode lists are the bulky part of the cache. The on-screen list only shows
 * a short summary, so the copy written to disk is trimmed the same way the
 * last-opened feed always was. The in-memory cache is left intact.
 */
export function trimPersistedQueryData(data: unknown): unknown {
  if (!isPersistableFeed(data)) {
    return data;
  }

  const oversized = data.episodes.length > 60
    || data.episodes.some((episode: IFeedItem) => episode.description.length > 280);

  if (!oversized) {
    return data;
  }

  return {
    ...data,
    episodes: toPersistedEpisodes(data.episodes)
  };
}

/**
 * Persists successful queries to localStorage so a reload, including one that
 * starts offline, can paint the last chart, search, and feeds immediately.
 * A full disk drops the oldest query and retries rather than failing the save.
 */
export function createPodrQueryPersister(): Persister {
  return createAsyncStoragePersister({
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
    key: QUERY_CACHE_KEY,
    throttleTime: 1000,
    retry: removeOldestQuery
  });
}
