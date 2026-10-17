import { FeedResponseError, parseDuration, parseFeedResponse, parseStoredFeedItems, parseFeedDetails, toPlainText } from '../feed';

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

describe('toPlainText', () => {
  test('drops tags, decodes common references and collapses whitespace', () => {
    expect(toPlainText('<p>Hello&nbsp;<a href="x">world</a></p>\n\n<p>Tom &amp; Jerry&#39;s &#x2014; &hellip;</p>'))
      .toBe("Hello world Tom & Jerry's — …");
  });

  test('keeps block boundaries as spaces so words do not run together', () => {
    expect(toPlainText('<p>One</p><p>Two</p>line<br/>break')).toBe('One Two line break');
  });

  test('leaves unknown references as written', () => {
    expect(toPlainText('a &unknown; b &#xZZ; c')).toBe('a &unknown; b &#xZZ; c');
  });

  test('returns an empty string for empty input', () => {
    expect(toPlainText('')).toBe('');
  });
});

describe('parseFeedDetails', () => {
  test('reads the feed envelope', () => {
    expect(parseFeedDetails({
      status: 'ok',
      feed: { title: ' Show ', author: 'Maker', description: '<b>About</b>', image: 'https://e.com/a.jpg' },
      items: []
    })).toEqual({ title: 'Show', author: 'Maker', description: 'About', image: 'https://e.com/a.jpg' });
  });

  test('reads artwork nested as RSS does', () => {
    expect(parseFeedDetails({ feed: { image: { url: 'https://e.com/a.jpg' } } }).image)
      .toBe('https://e.com/a.jpg');
  });

  test('reads bare, previously persisted details', () => {
    expect(parseFeedDetails({ feedUrl: 'u', title: 'Show', author: '', description: '' }))
      .toEqual({ title: 'Show', author: '', description: '', image: '' });
  });

  test('never throws on junk', () => {
    expect(parseFeedDetails(null)).toEqual({ title: '', author: '', description: '', image: '' });
    expect(parseFeedDetails([1, 2])).toEqual({ title: '', author: '', description: '', image: '' });
    expect(parseFeedDetails({ feed: 'nope' })).toEqual({ title: '', author: '', description: '', image: '' });
  });
});

describe('toPlainText with hostile markup', () => {
  test('keeps only text from script and nested tag tricks', () => {
    const text = toPlainText('<scr<script>ipt>alert(1)</script>Hi <img src=x onerror=alert(1)>there');

    expect(text).not.toMatch(/<script/i);
    expect(text).not.toMatch(/<img/i);
    expect(text).toContain('Hi there');
  });

  test('passes plain text through without parsing it', () => {
    expect(toPlainText('  Already   plain  ')).toBe('Already plain');
  });
});
