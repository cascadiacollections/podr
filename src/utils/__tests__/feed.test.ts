import { FeedResponseError, parseDuration, parseFeedResponse, parseStoredFeedItems } from '../feed';

/**
 * The rss2json envelope for a single well-formed episode
 */
const rss2jsonResponse = {
  status: 'ok',
  feed: { title: 'Test Podcast' },
  items: [
    {
      guid: 'episode-1',
      title: 'Episode 1',
      description: 'The first episode',
      pubDate: '2026-01-15 12:00:00',
      enclosure: {
        link: 'https://example.com/episode-1.mp3',
        duration: 1800
      }
    }
  ]
};

/**
 * Shape of the Podr worker's OpenAPI schema response, which is what it returns
 * for a request carrying `rss_url` instead of `q`
 */
const openApiSchemaResponse = {
  openapi: '3.0.0',
  info: { title: 'Podr API', version: '1.0.0' },
  paths: { '/': {} }
};

describe('parseFeedResponse', () => {
  it('parses the rss2json envelope', () => {
    const items = parseFeedResponse(rss2jsonResponse);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      guid: 'episode-1',
      title: 'Episode 1',
      description: 'The first episode',
      pubDate: '2026-01-15 12:00:00',
      enclosure: {
        link: 'https://example.com/episode-1.mp3',
        duration: 1800
      }
    });
  });

  it('parses a bare array of items', () => {
    expect(parseFeedResponse(rss2jsonResponse.items)).toHaveLength(1);
  });

  it('parses items nested under feed', () => {
    expect(parseFeedResponse({ feed: { items: rss2jsonResponse.items } })).toHaveLength(1);
  });

  it('returns an empty list for a feed with no episodes', () => {
    expect(parseFeedResponse({ status: 'ok', items: [] })).toEqual([]);
  });

  it('throws instead of silently returning no episodes for a non-feed response', () => {
    // Regression guard: a 200 response from the wrong endpoint used to parse as
    // zero episodes, leaving the Episodes list empty with no error reported
    expect(() => parseFeedResponse(openApiSchemaResponse)).toThrow(FeedResponseError);
    expect(() => parseFeedResponse(openApiSchemaResponse)).toThrow(
      'Feed response did not contain an episode list'
    );
  });

  it('throws for an error envelope, preferring the reported message', () => {
    expect(() => parseFeedResponse({ status: 'error', message: 'Feed not found' })).toThrow(
      'Feed not found'
    );
  });

  it('throws for null and non-object payloads', () => {
    expect(() => parseFeedResponse(null)).toThrow(FeedResponseError);
    expect(() => parseFeedResponse('not json')).toThrow(FeedResponseError);
  });

  it('defaults every field of an entry that is missing its enclosure', () => {
    const [item] = parseFeedResponse({
      items: [{ title: 'Trailer', link: 'https://example.com/trailer' }]
    });

    expect(item.enclosure).toEqual({ link: 'https://example.com/trailer', duration: 0 });
    expect(item.guid).toBe('https://example.com/trailer');
    expect(item.description).toBe('');
    expect(item.pubDate).toBe('');
  });

  it('falls back to a placeholder title and a positional guid', () => {
    const [item] = parseFeedResponse({ items: [{}] });

    expect(item.title).toBe('Untitled episode');
    expect(item.guid).toBe('item-0');
    expect(item.enclosure.link).toBe('');
  });

  it('skips entries that are not objects', () => {
    expect(parseFeedResponse({ items: [null, 'nope', rss2jsonResponse.items[0]] })).toHaveLength(1);
  });
});

describe('parseDuration', () => {
  it('accepts seconds as a number', () => {
    expect(parseDuration(1800)).toBe(1800);
  });

  it('accepts seconds as a string', () => {
    expect(parseDuration('1800')).toBe(1800);
  });

  it('accepts MM:SS clock notation', () => {
    expect(parseDuration('42:15')).toBe(2535);
  });

  it('accepts HH:MM:SS clock notation', () => {
    expect(parseDuration('1:02:33')).toBe(3753);
  });

  it('returns zero for missing or unusable values', () => {
    expect(parseDuration(undefined)).toBe(0);
    expect(parseDuration('')).toBe(0);
    expect(parseDuration('unknown')).toBe(0);
    expect(parseDuration(-5)).toBe(0);
    expect(parseDuration(Number.NaN)).toBe(0);
  });
});

describe('parseStoredFeedItems', () => {
  it('parses a persisted episode list', () => {
    expect(parseStoredFeedItems(rss2jsonResponse.items)).toHaveLength(1);
  });

  it('returns an empty list rather than throwing on corrupt data', () => {
    expect(parseStoredFeedItems(undefined)).toEqual([]);
    expect(parseStoredFeedItems({ unexpected: true })).toEqual([]);
  });
});
