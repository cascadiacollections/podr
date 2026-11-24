import { IFeed, ITopPodcast } from '../utils/AppContext';
import { EMPTY_FEED_DETAILS, IFeedDetails, parseFeedDetails } from '../utils/feed';
import { IResolvedFeed } from '../utils/helpers';
import { IFeedItem } from './Result';

export const OFFLINE_MESSAGE =
  'You are offline. Showing the podcasts and episodes already saved on this device.';

/**
 * Episodes kept in local storage. A feed can return hundreds, and every one of them
 * is parsed again on the next cold start - on a low-power device that parse is felt.
 * The rest are one fetch away.
 */
const MAX_PERSISTED_EPISODES = 60;

/**
 * Characters of each episode description kept in local storage: enough for the
 * two-line summary the list shows, without persisting entire show notes.
 */
const MAX_PERSISTED_DESCRIPTION = 280;

/**
 * Which podcast the loaded episodes belong to, and what its feed says about
 * itself. Kept beside the episodes so neither is ever shown under another
 * podcast's name.
 */
export interface IResultsFeed extends IFeedDetails {
  readonly feedUrl: string;
}

const NO_RESULTS_FEED: IResultsFeed = Object.freeze({ ...EMPTY_FEED_DETAILS, feedUrl: '' });

export const parseResultsFeed = (value: unknown): IResultsFeed => {
  const feedUrl = (value as { feedUrl?: unknown } | null)?.feedUrl;

  return typeof feedUrl === 'string' && feedUrl
    ? Object.freeze({ ...parseFeedDetails(value), feedUrl })
    : NO_RESULTS_FEED;
};

/**
 * The history entry for an open podcast. Carrying the whole feed lets Back,
 * Forward and a reload reopen it without looking anything up.
 */
export interface IPodcastHistoryState {
  readonly podrFeed: IFeed;
  /**
   * Whether the app pushed this entry over a browse entry. A podcast opened from
   * a shared link has no browse entry behind it, and going back from it must not
   * leave the site.
   */
  readonly podrPushed?: boolean;
}

/**
 * The query parameter that makes a podcast linkable: `/?feed=<feed URL>`.
 * A query rather than a path, so every deployment's single-page fallback
 * serves it without new rewrite rules.
 */
const FEED_PARAM = 'feed';

const HTTP_URL_PATTERN = /^https?:\/\//i;

/**
 * The page URL with the podcast parameter set, or removed for the browse view.
 * Other parameters, such as `?debug=`, are kept.
 */
export const getPageUrl = (feedUrl?: string): string => {
  const url = new URL(window.location.href);

  if (feedUrl) {
    url.searchParams.set(FEED_PARAM, feedUrl);
  } else {
    url.searchParams.delete(FEED_PARAM);
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * The feed a shared link points at, if it names a web URL
 */
export const getLinkedFeedUrl = (): string | null => {
  const feedUrl = new URLSearchParams(window.location.search).get(FEED_PARAM)?.trim();

  return feedUrl && HTTP_URL_PATTERN.test(feedUrl) ? feedUrl : null;
};

/**
 * Fills a feed's missing name, artwork and maker from what the feed says about
 * itself - all a podcast opened from a link has to go on. Returns the original
 * feed when nothing is missing.
 */
export const withFeedDetails = (feed: IFeed, details: IFeedDetails): IFeed => {
  const needsName = !feed.collectionName || HTTP_URL_PATTERN.test(feed.collectionName);
  const collectionName = needsName && details.title ? details.title : feed.collectionName;
  const artworkUrl100 = feed.artworkUrl100 || details.image;
  const artistName = feed.artistName || details.author || undefined;

  if (
    collectionName === feed.collectionName &&
    artworkUrl100 === feed.artworkUrl100 &&
    artistName === feed.artistName
  ) {
    return feed;
  }

  return {
    ...feed,
    collectionName,
    artworkUrl100,
    artworkUrl600: feed.artworkUrl600 || details.image,
    artistName
  };
};

export const getHistoryFeed = (state: unknown): IFeed | null => {
  const feed = (state as Partial<IPodcastHistoryState> | null)?.podrFeed;

  return feed && typeof feed.feedUrl === 'string' && feed.feedUrl ? feed : null;
};

export const scrollToPosition = (top: number): void => {
  try {
    window.scrollTo({ top, behavior: 'auto' });
  } catch {
    // Not every environment implements scrolling; position is a nicety
  }
};

/**
 * Trims the episode list before it is persisted, keeping only as much of each
 * description as the list's summary shows.
 */
export const toPersistedEpisodes = (items: ReadonlyArray<IFeedItem>): ReadonlyArray<unknown> =>
  items.slice(0, MAX_PERSISTED_EPISODES).map((item: IFeedItem) => ({
    guid: item.guid,
    title: item.title,
    pubDate: item.pubDate,
    description: item.description.length > MAX_PERSISTED_DESCRIPTION
      ? `${item.description.slice(0, MAX_PERSISTED_DESCRIPTION).trimEnd()}…`
      : item.description,
    enclosure: item.enclosure
  }));

/**
 * Picks artwork from an iTunes top-podcasts entry: the largest available, or the
 * smallest when the connection is constrained.
 * The feed normally offers three sizes, but the list length is not guaranteed.
 */
const getTopPodcastArtwork = (podcast: ITopPodcast, preferSmall: boolean): string => {
  const images = podcast['im:image'];

  if (!images || images.length === 0) {
    return '';
  }

  return preferSmall ? images[0].label : images[images.length - 1].label;
};

/**
 * Whether a feed is missing the metadata the UI needs to present it.
 *
 * Builds before the card redesign saved favorites with the Apple Podcasts URL as
 * the name and no artwork at all, which renders as a broken image labelled with a
 * URL. Resolving the feed supplies both, so those entries can be repaired in place.
 */
const needsMetadata = (feed: IFeed): boolean =>
  !feed.artworkUrl100 || /^https?:\/\//i.test(feed.collectionName);

/**
 * Fills in a feed's missing name and artwork from a resolution result, keeping
 * `feedUrl` so the entry's identity - and its place in the library - is unchanged.
 * Returns the original feed when there is nothing to repair.
 */
export const withResolvedMetadata = (feed: IFeed, resolved: IResolvedFeed): IFeed => {
  if (!needsMetadata(feed)) {
    return feed;
  }

  const collectionName = resolved.collectionName ?? feed.collectionName;
  const artwork = resolved.artworkUrl ?? feed.artworkUrl100;

  if (collectionName === feed.collectionName && artwork === feed.artworkUrl100) {
    return feed;
  }

  return {
    collectionName,
    feedUrl: feed.feedUrl,
    artworkUrl100: artwork,
    artworkUrl600: resolved.artworkUrl ?? feed.artworkUrl600
  };
};

/**
 * Presents a top podcast as a feed so a single card component serves every grid.
 * `feedUrl` is the podcast's Apple Podcasts page, resolved to RSS when opened.
 */
export const toFeed = (podcast: ITopPodcast, preferSmall: boolean): IFeed => {
  const artwork = getTopPodcastArtwork(podcast, preferSmall);

  return {
    // The title is "<name> - <artist>"; the separate fields read better on a card
    collectionName: podcast['im:name']?.label || podcast.title.label,
    feedUrl: podcast.id.label,
    artworkUrl100: artwork,
    artworkUrl600: artwork,
    artistName: podcast['im:artist']?.label
  };
};
