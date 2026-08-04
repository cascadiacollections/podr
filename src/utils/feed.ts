import { IFeedItem } from '../ui/Result';

/**
 * Stable empty item list, shared to keep memoized consumers from re-rendering.
 */
const EMPTY_ITEMS: readonly IFeedItem[] = Object.freeze([]);

/**
 * Duration parsing configuration
 */
const SECONDS_PER_MINUTE = 60 as const;
const CLOCK_SEPARATOR = ':' as const;

/**
 * Raised when a feed response cannot be interpreted as a list of episodes.
 *
 * A wrong-but-successful response (an API answering with something other than a
 * feed) must fail loudly - silently treating it as "no episodes" is what made a
 * misrouted request look like an empty podcast.
 */
export class FeedResponseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'FeedResponseError';
    // Restores the prototype chain, which subclassing Error loses when the
    // compiler targets ES5
    Object.setPrototypeOf(this, FeedResponseError.prototype);
  }
}

/**
 * Narrows an unknown value to an indexable record
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Coerces a value to a trimmed string, returning the fallback when absent
 */
function toText(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') {
    return value.trim() || fallback;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  return fallback;
}

/**
 * Parses an episode duration into whole seconds.
 *
 * Feeds report `itunes:duration` inconsistently: seconds as a number, seconds as
 * a string, or a clock value such as "1:02:33" or "42:15". All are accepted.
 * @param value - The raw duration value from the feed
 * @returns Duration in seconds, or 0 when it cannot be determined
 */
export function parseDuration(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  if (!trimmed.includes(CLOCK_SEPARATOR)) {
    const seconds = Number.parseInt(trimmed, 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  }

  // Clock notation: [HH:]MM:SS, most significant part first
  const parts = trimmed.split(CLOCK_SEPARATOR);
  let seconds = 0;

  for (const part of parts) {
    const parsed = Number.parseInt(part, 10);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    seconds = seconds * SECONDS_PER_MINUTE + parsed;
  }

  return seconds;
}

/**
 * Converts a single raw feed entry into a fully populated IFeedItem.
 *
 * Every field is defaulted so downstream components never dereference a missing
 * `enclosure` - feeds routinely omit it on trailer or bonus entries.
 * @param entry - The raw feed entry
 * @param index - Position in the feed, used as a last-resort key
 * @returns A normalized feed item
 */
function toFeedItem(entry: Record<string, unknown>, index: number): IFeedItem {
  const enclosure = isRecord(entry.enclosure) ? entry.enclosure : {};
  const rawTitle = toText(entry.title);
  const title = rawTitle || 'Untitled episode';
  const pubDate = toText(entry.pubDate);
  const link = toText(enclosure.link) || toText(entry.link);
  const identity = rawTitle || pubDate ? `${rawTitle}-${pubDate}` : '';

  return {
    guid: toText(entry.guid) || link || identity || `item-${index}`,
    title,
    description: toText(entry.description),
    pubDate,
    enclosure: {
      link,
      duration: parseDuration(enclosure.duration ?? entry.duration),
    },
  };
}

/**
 * Extracts the raw entry list from a feed response envelope.
 *
 * Handles a bare array, the rss2json `{ status, feed, items }` envelope, and a
 * nested `{ feed: { items } }` shape.
 * @param payload - The parsed JSON response
 * @returns The raw entries, or undefined when no list is present
 */
function findEntries(payload: unknown): readonly unknown[] | undefined {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return undefined;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (isRecord(payload.feed) && Array.isArray(payload.feed.items)) {
    return payload.feed.items;
  }

  return undefined;
}

/**
 * Parses a feed API response into normalized episodes.
 * @param payload - The parsed JSON response from the RSS to JSON API
 * @returns The episodes contained in the response
 * @throws {FeedResponseError} When the response is not a recognizable feed
 */
export function parseFeedResponse(payload: unknown): readonly IFeedItem[] {
  if (isRecord(payload) && toText(payload.status).toLowerCase() === 'error') {
    throw new FeedResponseError(toText(payload.message, 'The feed service reported an error'));
  }

  const entries = findEntries(payload);

  if (!entries) {
    throw new FeedResponseError('Feed response did not contain an episode list');
  }

  if (entries.length === 0) {
    return EMPTY_ITEMS;
  }

  return Object.freeze(entries.filter(isRecord).map(toFeedItem));
}

/**
 * Parses feed items without throwing, for untrusted local data such as a
 * previously persisted episode list.
 * @param payload - The value to interpret as a list of episodes
 * @returns The episodes contained in the value, or an empty list
 */
export function parseStoredFeedItems(payload: unknown): readonly IFeedItem[] {
  try {
    return parseFeedResponse(payload);
  } catch {
    return EMPTY_ITEMS;
  }
}
