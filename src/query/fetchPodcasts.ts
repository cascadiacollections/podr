import { APP_CONFIG, IFeed, ITopPodcast } from '../utils/AppContext';
import { IFeedDetails, parseFeedDetails, parseFeedRedirect, parseFeedResponse } from '../utils/feed';
import { getFeedUrl, IResolvedFeed, resolveFeed, toSecureHttpUrl } from '../utils/helpers';
import { IFeedItem } from '../ui/Result';
import { isAbortError, StatusError } from './queryClient';

const WEB_URL_PATTERN = /^https?:\/\//i;

interface ITopChartResponse {
  readonly feed?: {
    readonly entry?: ReadonlyArray<ITopPodcast>;
  };
}

interface ISearchResponse {
  readonly results?: ReadonlyArray<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readTopChart(response: Response): Promise<readonly ITopPodcast[]> {
  if (!response.ok) {
    throw new StatusError(response.status);
  }

  const json = await response.json() as ITopChartResponse;
  return json?.feed?.entry ?? [];
}

async function fetchTopPodcastsFromApi(signal: AbortSignal): Promise<readonly ITopPodcast[]> {
  const response = await fetch(`${APP_CONFIG.API_BASE_URL}/?q=toppodcasts&limit=10`, { signal });
  return readTopChart(response);
}

/**
 * Loads the top chart.
 * The first load uses the static file written at build time, and falls back
 * to the API when that file is missing. A later refresh, when a chart is
 * already cached, asks the API so the numbers can move without waiting for
 * the next deploy.
 */
export async function fetchTopPodcasts(
  signal: AbortSignal,
  hasCachedChart: boolean
): Promise<readonly ITopPodcast[]> {
  if (hasCachedChart) {
    return fetchTopPodcastsFromApi(signal);
  }

  try {
    const response = await fetch('/top-podcasts.json', { signal });
    return await readTopChart(response);
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error('Failed to load static top podcasts data:', error);
    return fetchTopPodcastsFromApi(signal);
  }
}

/**
 * Keeps a search hit only when it has a web address, and runs artwork through
 * the same HTTPS upgrade the rest of the app uses.
 */
function toSearchFeed(entry: unknown): IFeed | null {
  if (!isRecord(entry) || typeof entry.feedUrl !== 'string') {
    return null;
  }

  const feedUrl = toSecureHttpUrl(entry.feedUrl);

  if (!WEB_URL_PATTERN.test(feedUrl)) {
    return null;
  }

  const artistName = typeof entry.artistName === 'string' ? entry.artistName.trim() : '';
  const feed: IFeed = {
    collectionName: typeof entry.collectionName === 'string' ? entry.collectionName : '',
    feedUrl,
    artworkUrl100: toSecureHttpUrl(entry.artworkUrl100),
    artworkUrl600: toSecureHttpUrl(entry.artworkUrl600)
  };

  return artistName ? { ...feed, artistName } : feed;
}

export async function fetchPodcastSearch(
  term: string,
  limit: number,
  signal: AbortSignal
): Promise<readonly IFeed[]> {
  const params = new URLSearchParams([
    ['q', term],
    ['limit', limit.toString()]
  ]);
  const response = await fetch(`${APP_CONFIG.API_BASE_URL}/?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new StatusError(response.status);
  }

  const json = await response.json() as ISearchResponse;
  const results = json?.results ?? [];
  const feeds: IFeed[] = [];

  for (const entry of results) {
    const feed = toSearchFeed(entry);

    if (feed) {
      feeds.push(feed);
    }
  }

  return feeds;
}

/**
 * One podcast's episodes plus the metadata a saved entry can be repaired with.
 * `feedUrl` is where the feed lives now; `requestedUrl` is what the listener opened.
 */
export interface IPodcastFeedData {
  readonly episodes: readonly IFeedItem[];
  readonly details: IFeedDetails;
  readonly feedUrl: string;
  readonly requestedUrl: string;
  readonly resolved: IResolvedFeed;
}

export async function fetchPodcastFeed(feed: IFeed, signal: AbortSignal): Promise<IPodcastFeedData> {
  const resolved = await resolveFeed(feed.feedUrl, signal);
  const response = await fetch(getFeedUrl(resolved.feedUrl), { signal });

  if (!response.ok) {
    throw new StatusError(response.status);
  }

  const payload: unknown = await response.json();
  const episodes = parseFeedResponse(payload);
  const details = parseFeedDetails(payload);
  // A feed that permanently moved is kept under its new address from now on.
  // One saved as an Apple Podcasts page keeps that; it is resolved afresh each time.
  const movedTo = resolved.feedUrl === feed.feedUrl ? parseFeedRedirect(payload) : '';

  return {
    episodes,
    details,
    feedUrl: movedTo || feed.feedUrl,
    requestedUrl: feed.feedUrl,
    resolved
  };
}
