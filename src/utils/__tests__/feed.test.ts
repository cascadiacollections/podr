import {
  FeedResponseError,
  parseDuration,
  parseFeedDetails,
  parseFeedRedirect,
  parseFeedResponse,
  parseStoredFeedItems,
  toPlainText,
} from '../feed';
import { readHtmlText } from '../htmlText';

/**
 * The Podr service feed envelope for a single well-formed episode.
 * rss2json used to return this shape; the client does not call it.
 */
const serviceFeedResponse = {
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
        duration: 1800,
      },
    },
  ],
};

/**
 * Shape of the Podr worker's OpenAPI schema response, which is what it returns
 * for a request carrying `rss_url` instead of `q`
 */
const openApiSchemaResponse = {
  openapi: '3.0.0',
  info: { title: 'Podr API', version: '1.0.0' },
  paths: { '/': {} },
};

describe('parseFeedResponse', () => {
  it('parses the service feed envelope', () => {
    const items = parseFeedResponse(serviceFeedResponse);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      guid: 'episode-1',
      title: 'Episode 1',
      description: 'The first episode',
      pubDate: '2026-01-15 12:00:00',
      enclosure: {
        link: 'https://example.com/episode-1.mp3',
        duration: 1800,
      },
    });
  });

  it('parses a bare array of items', () => {
    expect(parseFeedResponse(serviceFeedResponse.items)).toHaveLength(1);
  });

  it('parses items nested under feed', () => {
    expect(parseFeedResponse({ feed: { items: serviceFeedResponse.items } })).toHaveLength(1);
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
      items: [{ title: 'Trailer', link: 'https://example.com/trailer' }],
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
    expect(parseFeedResponse({ items: [null, 'nope', serviceFeedResponse.items[0]] })).toHaveLength(
      1
    );
  });

  it('upgrades HTTP enclosures and drops schemes that are not web URLs', () => {
    const [httpItem, scriptItem] = parseFeedResponse({
      items: [
        { guid: 'a', title: 'A', enclosure: { link: 'http://cdn.example.com/a.mp3', duration: 5 } },
        { guid: 'b', title: 'B', enclosure: { link: 'javascript:alert(1)' } },
      ],
    });

    expect(httpItem.enclosure.link).toBe('https://cdn.example.com/a.mp3');
    expect(scriptItem.enclosure.link).toBe('');
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
    expect(parseStoredFeedItems(serviceFeedResponse.items)).toHaveLength(1);
  });

  it('returns an empty list rather than throwing on corrupt data', () => {
    expect(parseStoredFeedItems(undefined)).toEqual([]);
    expect(parseStoredFeedItems({ unexpected: true })).toEqual([]);
  });
});

describe('toPlainText', () => {
  test('drops tags, decodes common references and collapses whitespace', () => {
    expect(
      toPlainText(
        '<p>Hello&nbsp;<a href="x">world</a></p>\n\n<p>Tom &amp; Jerry&#39;s &#x2014; &hellip;</p>'
      )
    ).toBe("Hello world Tom & Jerry's — …");
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
    expect(
      parseFeedDetails({
        status: 'ok',
        feed: {
          title: ' Show ',
          author: 'Maker',
          description: '<b>About</b>',
          image: 'https://e.com/a.jpg',
        },
        items: [],
      })
    ).toEqual({
      title: 'Show',
      author: 'Maker',
      description: 'About',
      image: 'https://e.com/a.jpg',
    });
  });

  test('reads artwork nested as RSS does', () => {
    expect(parseFeedDetails({ feed: { image: { url: 'https://e.com/a.jpg' } } }).image).toBe(
      'https://e.com/a.jpg'
    );
  });

  test('reads bare, previously persisted details', () => {
    expect(parseFeedDetails({ feedUrl: 'u', title: 'Show', author: '', description: '' })).toEqual({
      title: 'Show',
      author: '',
      description: '',
      image: '',
    });
  });

  test('upgrades HTTP artwork and drops every other scheme', () => {
    expect(
      parseFeedDetails({ feed: { title: 'Show', image: 'http://cdn.example.com/a.jpg' } }).image
    ).toBe('https://cdn.example.com/a.jpg');
    expect(parseFeedDetails({ feed: { title: 'Show', image: 'javascript:alert(1)' } }).image).toBe(
      ''
    );
    expect(
      parseFeedDetails({ feed: { image: { url: 'data:image/svg+xml,<svg></svg>' } } }).image
    ).toBe('');
  });

  test('never throws on junk', () => {
    expect(parseFeedDetails(null)).toEqual({ title: '', author: '', description: '', image: '' });
    expect(parseFeedDetails([1, 2])).toEqual({ title: '', author: '', description: '', image: '' });
    expect(parseFeedDetails({ feed: 'nope' })).toEqual({
      title: '',
      author: '',
      description: '',
      image: '',
    });
  });
});

describe('parseFeedRedirect', () => {
  test('reads where a feed has permanently moved', () => {
    expect(
      parseFeedRedirect({
        status: 'ok',
        feed: {
          url: 'https://old.example.com/rss',
          redirectedUrl: ' https://new.example.com/rss ',
        },
        items: [],
      })
    ).toBe('https://new.example.com/rss');
  });

  test('is empty when the feed has not moved, as older services report', () => {
    expect(parseFeedRedirect({ status: 'ok', feed: { url: 'https://e.com/rss' }, items: [] })).toBe(
      ''
    );
    expect(parseFeedRedirect({ status: 'ok', items: [] })).toBe('');
  });

  test('ignores anything that is not a web address', () => {
    expect(parseFeedRedirect({ feed: { redirectedUrl: 'javascript:alert(1)' } })).toBe('');
    expect(parseFeedRedirect({ feed: { redirectedUrl: 42 } })).toBe('');
    expect(parseFeedRedirect(null)).toBe('');
    expect(parseFeedRedirect({ feed: 'nope' })).toBe('');
  });
});

/**
 * The text DOMParser would produce. Independent of `toPlainText`, so a faster
 * reader cannot pass by being compared with itself.
 */
function domPlainText(value: string): string {
  if (!value) {
    return '';
  }

  let text = value;

  if (/[<&]/.test(text)) {
    const blockBoundary = /<(?:br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi;
    text =
      new DOMParser().parseFromString(text.replace(blockBoundary, ' $&'), 'text/html').body
        .textContent ?? '';
  }

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Show notes the way a host's CMS writes them: paragraphs, links, lists, and
 * the character references those tools emit. Sized like a long episode, not a
 * one-line blurb.
 */
function showNotes(paragraphs: number, episode: number): string {
  const parts: string[] = [];

  for (let index = 0; index < paragraphs; index += 1) {
    parts.push('<!-- wp:paragraph -->');
    parts.push(
      `<p>In minute ${index + 12}, the host &amp; the guest talk about &#8217;shipping&#8217; ` +
        `<a href="https://example.com/ep/${index}?q=1&amp;ref=show">a small tool</a> ` +
        `that keeps notes &mdash; and why &ldquo;later&rdquo; is a trap. Episode ${episode}.</p>`
    );
    parts.push('<!-- /wp:paragraph -->');

    if (index % 4 === 0) {
      parts.push(
        '<h3>Links</h3><ul><li><a href="https://example.com/a">Docs</a></li>' +
          '<li>Source &amp; issues</li></ul>'
      );
    }

    if (index % 5 === 0) {
      parts.push(
        '<p>Sponsor read: visit <strong>Example &amp; Co.</strong><br/>' +
          'Use code <em>POD</em>. Caf&eacute; &ntilde;.</p>'
      );
    }
  }

  return parts.join('\n');
}

describe('toPlainText with hostile markup', () => {
  test('keeps only text from script and nested tag tricks', () => {
    const text = toPlainText(
      '<scr<script>ipt>alert(1)</script>Hi <img src=x onerror=alert(1)>there'
    );

    expect(text).not.toMatch(/<script/i);
    expect(text).not.toMatch(/<img/i);
    expect(text).toContain('Hi there');
    expect(text).toBe(
      domPlainText('<scr<script>ipt>alert(1)</script>Hi <img src=x onerror=alert(1)>there')
    );
  });

  test('drops script and style contents, which a document puts in the head', () => {
    expect(toPlainText('<script>alert(1)</script>Shown as text')).toBe('Shown as text');
    expect(toPlainText('<style>p{color:red}</style>Hi')).toBe('Hi');
    expect(toPlainText('<script>alert(1)</script>Shown as text')).toBe(
      domPlainText('<script>alert(1)</script>Shown as text')
    );
  });

  test('passes plain text through without parsing it', () => {
    expect(toPlainText('  Already   plain  ')).toBe('Already plain');
  });

  test('leaves a bare ampersand as text', () => {
    expect(toPlainText('Tom & Jerry')).toBe('Tom & Jerry');
    expect(toPlainText('Tom &amp Jerry')).toBe('Tom & Jerry');
  });

  test('matches the document parser for markup it reads itself and markup it refuses', () => {
    const samples = [
      '<p>Hello&nbsp;<a href="x">world</a></p>\n\n<p>Tom &amp; Jerry&#39;s &#x2014; &hellip;</p>',
      '<p>One</p><p>Two</p>line<br/>break',
      'a &unknown; b &#xZZ; c',
      'a < b and a <3 cats',
      '<!-- secret --><p>Visible</p>',
      '<!-- <br> hidden --><p>Shown</p>',
      '<a href="foo>bar">link</a>',
      '<a href="https://ex.com?a=1&amp;b=2">t</a>',
      '<img alt="picture" src=x onerror=alert(1)>after',
      '<a href="javascript:alert(1)">click</a>',
      '<p title="</p>">x</p>',
      '&ampere; unit',
      '&notit; x',
      '&#39; &#x2014; &#x80; &#0; &#xD800; &#x110000; &#x81;',
      '<noscript><b>No</b></noscript>Yes',
      '<textarea>a &amp; b</textarea>',
      '<iframe>frame text</iframe>After',
      '<svg><text>icon</text></svg>Tail',
      '<template><p>Hidden</p></template>Shown',
      '<>empty</>',
      '<p>Unclosed paragraph',
      'caf&eacute; &ntilde; &uuml;',
      '<div><ul><li>A</li><li>B</li></ul></div>',
      'before<table><tr><td>a</td><td>b</td></tr></table>after',
      showNotes(6, 1),
    ];

    for (const sample of samples) {
      expect(toPlainText(sample)).toBe(domPlainText(sample));
    }
  });

  test('matches the document parser on generated fragments', () => {
    let seed = 0xdecaf;
    const random = (): number => {
      seed = (seed + 0x6d2b79f5) | 0;
      let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
    const words = ['host', 'guest', 'notes', 'and', 'the', 'show', 'later', 'tool'];
    const tags = ['p', 'div', 'span', 'em', 'strong', 'b', 'i', 'li', 'blockquote', 'h3', 'a'];
    const entities = [
      'amp',
      'nbsp',
      'rsquo',
      'ldquo',
      'rdquo',
      'mdash',
      'eacute',
      'ntilde',
      'hellip',
    ];

    for (let index = 0; index < 40; index += 1) {
      const chunks: string[] = [];
      const count = 1 + Math.floor(random() * 6);

      for (let piece = 0; piece < count; piece += 1) {
        if (random() < 0.2) {
          chunks.push('<!-- note -->');
        }

        const tag = tags[Math.floor(random() * tags.length)];
        const word = words[Math.floor(random() * words.length)];
        const entity = entities[Math.floor(random() * entities.length)];
        const href = tag === 'a' ? ' href="https://example.com/a?x=1&amp;y=2"' : '';
        chunks.push(`<${tag}${href}>${word} &${entity}; ${word}</${tag}>`);

        if (random() < 0.3) {
          chunks.push('<br/>');
        }
      }

      const html = chunks.join(random() < 0.5 ? '\n' : '');
      expect(toPlainText(html)).toBe(domPlainText(html));
    }
  });

  test('reads a long show-notes description without building a document', () => {
    const notes = showNotes(40, 7);
    const expected = domPlainText(notes);
    expect(notes.length).toBeGreaterThan(10_000);
    const parseFromString = jest.spyOn(DOMParser.prototype, 'parseFromString');
    parseFromString.mockClear();

    try {
      const text = toPlainText(notes);

      expect(text).toBe(expected);
      expect(text).toContain('Episode 7');
      expect(text).toContain('Caf\u00e9');
      expect(text).not.toMatch(/<[a-z]/i);
      expect(parseFromString).not.toHaveBeenCalled();
      // The tail is still there: the scan does not stop at the two lines on screen.
      expect(text.endsWith('Episode 7.')).toBe(true);
    } finally {
      parseFromString.mockRestore();
    }
  });

  test('refuses script, style and svg instead of guessing their text', () => {
    expect(readHtmlText('<script>alert(1)</script>Shown')).toBeNull();
    expect(readHtmlText('<style>p{}</style>Hi')).toBeNull();
    expect(readHtmlText('<svg><text>icon</text></svg>')).toBeNull();
    expect(readHtmlText('<p>Ordinary</p>')).toBe('Ordinary');
  });

  test('caches a description so a second read does not parse it again', () => {
    const notes = `<svg><text>cached-${showNotes(2, 9)}</text></svg>`;
    const expected = domPlainText(notes);
    const parseFromString = jest.spyOn(DOMParser.prototype, 'parseFromString');
    parseFromString.mockClear();

    try {
      expect(toPlainText(notes)).toBe(expected);
      const calls = parseFromString.mock.calls.length;
      expect(calls).toBeGreaterThan(0);
      expect(toPlainText(notes)).toBe(expected);
      expect(parseFromString).toHaveBeenCalledTimes(calls);
    } finally {
      parseFromString.mockRestore();
    }
  });
});

describe('description parsing is deferred until the text is read', () => {
  test('does not parse episode descriptions while reading the feed', () => {
    const parseFromString = jest.spyOn(DOMParser.prototype, 'parseFromString');
    parseFromString.mockClear();

    const items = parseFeedResponse({
      items: [
        { guid: 'a', title: 'A', description: '<svg><text>One</text></svg>' },
        { guid: 'b', title: 'B', description: '<svg><text>Two</text></svg>' },
      ],
    });

    try {
      expect(parseFromString).not.toHaveBeenCalled();
      expect(items[0].description).toBe('One');
      expect(parseFromString).toHaveBeenCalledTimes(1);
      // The same episode's notes are already plain text.
      expect(items[0].description).toBe('One');
      expect(parseFromString).toHaveBeenCalledTimes(1);
      expect(items[1].description).toBe('Two');
      expect(parseFromString).toHaveBeenCalledTimes(2);
    } finally {
      parseFromString.mockRestore();
    }
  });

  test('does not parse a podcast description until the page reads it', () => {
    const parseFromString = jest.spyOn(DOMParser.prototype, 'parseFromString');
    parseFromString.mockClear();

    const details = parseFeedDetails({
      feed: { title: 'Show', description: '<svg><text>About the show</text></svg>' },
    });

    try {
      expect(parseFromString).not.toHaveBeenCalled();
      expect(details.description).toBe('About the show');
      expect(parseFromString).toHaveBeenCalledTimes(1);
    } finally {
      parseFromString.mockRestore();
    }
  });

  test('still treats markup that leaves no text as an empty description', () => {
    expect(parseFeedDetails({ feed: { description: '<br>' } })).toEqual({
      title: '',
      author: '',
      description: '',
      image: '',
    });
  });

  test('keeps the whole plain-text notes, not a clipped prefix', () => {
    const [item] = parseFeedResponse({
      items: [
        {
          title: 'Long',
          description: `<p>${'word '.repeat(80)}UNIQUE_TAIL</p>`,
        },
      ],
    });

    expect(item.description.endsWith('UNIQUE_TAIL')).toBe(true);
    expect(item.description).not.toContain('<p>');
  });
});
