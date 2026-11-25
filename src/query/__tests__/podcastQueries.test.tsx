import { signal } from '@preact/signals';
import { focusManager } from '@tanstack/preact-query';
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/preact-query-persist-client';
import { h } from 'preact';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';

import { APP_CONFIG, IFeed, ITopPodcast } from '../../utils/AppContext';
import { createPodrQueryPersister } from '../persister';
import {
  createPodrQueryClient,
  describeQueryFailure,
  QUERY_CACHE_BUSTER,
  QUERY_GC_TIME,
  shouldRetry,
  StatusError
} from '../queryClient';
import { createTestQueryClient, QueryTestProvider } from '../queryWrapper';
import { usePodcastFeedQuery } from '../usePodcastFeedQuery';
import { usePodcastSearchQuery, useSearchTerm } from '../usePodcastSearchQuery';
import { useTopPodcastsQuery } from '../useTopPodcastsQuery';

const jsonResponse = (data: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data)
  });

const ALPHA = {
  collectionName: 'Alpha Show',
  feedUrl: 'https://example.com/alpha',
  artworkUrl100: 'https://example.com/alpha.jpg',
  artworkUrl600: 'https://example.com/alpha-large.jpg'
};

function SearchProbe({ term }: { readonly term: string }) {
  const query = usePodcastSearchQuery(term);

  return (
    <div>
      <span data-testid="status">{query.status}</span>
      <span data-testid="names">{query.data?.feeds.map((feed: IFeed) => feed.collectionName).join(',')}</span>
      <span data-testid="placeholder">{query.isPlaceholderData ? 'yes' : 'no'}</span>
    </div>
  );
}

function TopProbe() {
  const query = useTopPodcastsQuery(false);
  return <span data-testid="status">{query.fetchStatus}:{query.status}</span>;
}

describe('query client', () => {
  test('turns retry off for tests and skips retries that cannot succeed', () => {
    expect(createTestQueryClient().getDefaultOptions().queries?.retry).toBe(false);
    expect(createPodrQueryClient({ retry: false }).getDefaultOptions().queries?.retry).toBe(false);
    expect(shouldRetry(0, new StatusError(404))).toBe(false);
    expect(shouldRetry(0, new StatusError(500))).toBe(true);
    expect(shouldRetry(3, new StatusError(500))).toBe(false);

    const cancelled = new Error('aborted');
    cancelled.name = 'AbortError';
    expect(shouldRetry(0, cancelled)).toBe(false);

    const notAFeed = new Error('Feed response did not contain an episode list');
    notAFeed.name = 'FeedResponseError';
    expect(shouldRetry(0, notAFeed)).toBe(false);
  });

  test('describes a search failure without the search text', () => {
    expect(describeQueryFailure(['search', 'secret phrase', 14])).toBe('search_fetch_14');
    expect(describeQueryFailure(['feed', 'https://example.com/feed.rss'])).toBe(
      'feed_fetch_https://example.com/feed.rss'
    );
    expect(describeQueryFailure(['top-podcasts'])).toBe('search_fetch_toppodcasts');
  });
});

describe('podcast queries', () => {
  beforeEach(() => {
    localStorage.clear();
    (window.gtag as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('searches only once the term reaches the minimum length', async () => {
    global.fetch = jest.fn().mockImplementation(() => jsonResponse({ results: [ALPHA] }));

    const { rerender } = render(<SearchProbe term="a" />, { wrapper: QueryTestProvider });

    await act(async () => {
      await Promise.resolve();
    });
    expect(global.fetch).not.toHaveBeenCalled();

    rerender(<SearchProbe term="ab" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, { signal?: AbortSignal }];
    expect(url).toContain('q=ab');
    expect(url).toContain('limit=14');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  test('keeps the previous hits on screen while the next term loads', async () => {
    let resolveBeta: (_result: unknown) => void = () => undefined;
    const beta = new Promise((resolve) => {
      resolveBeta = resolve;
    });

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('q=beta')) {
        return beta;
      }

      return jsonResponse({ results: [ALPHA] });
    });

    const { rerender } = render(<SearchProbe term="alpha" />, { wrapper: QueryTestProvider });

    await waitFor(() => {
      expect(screen.getByTestId('names')).toHaveTextContent('Alpha Show');
    });

    rerender(<SearchProbe term="beta" />);

    await waitFor(() => {
      expect(screen.getByTestId('placeholder')).toHaveTextContent('yes');
    });
    expect(screen.getByTestId('names')).toHaveTextContent('Alpha Show');

    resolveBeta({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        results: [{ ...ALPHA, collectionName: 'Beta Show', feedUrl: 'https://example.com/beta' }]
      })
    });

    await waitFor(() => {
      expect(screen.getByTestId('names')).toHaveTextContent('Beta Show');
    });
    expect(screen.getByTestId('placeholder')).toHaveTextContent('no');
  });

  test('reports a failed search through the shared reporter, without the term', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('catalog down'));

    render(<SearchProbe term="secret phrase" />, { wrapper: QueryTestProvider });

    await waitFor(() => {
      expect(window.gtag).toHaveBeenCalledWith('event', 'exception', expect.objectContaining({
        description: 'search_fetch_14_catalog down',
        fatal: false
      }));
    });

    expect(JSON.stringify((window.gtag as jest.Mock).mock.calls)).not.toContain('secret phrase');
  });

  test('does not retry a failed chart request', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    global.fetch = jest.fn().mockRejectedValue(new Error('down'));

    render(<TopProbe />, { wrapper: QueryTestProvider });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The static file fails and the chart falls through to the API once.
    // That second request is the fallback, not a retry.
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toBe('/top-podcasts.json');
    expect(String((global.fetch as jest.Mock).mock.calls[1][0])).toContain('q=toppodcasts');
  });

  test('restores a query cache saved to localStorage', async () => {
    const persister = createPodrQueryPersister();
    const saved = createPodrQueryClient({ retry: false });
    saved.setQueryData(['top-podcasts'], [{ title: { label: 'Saved Show' } }]);

    await persistQueryClientSave({
      queryClient: saved,
      persister,
      buster: QUERY_CACHE_BUSTER
    });

    expect(localStorage.getItem('podr_query_cache')).toContain('Saved Show');

    const restored = createPodrQueryClient({ retry: false });
    await persistQueryClientRestore({
      queryClient: restored,
      persister,
      maxAge: QUERY_GC_TIME,
      buster: QUERY_CACHE_BUSTER
    });

    expect(restored.getQueryData(['top-podcasts'])).toEqual([{ title: { label: 'Saved Show' } }]);
  });

  test('debounces typing and applies a submit immediately', () => {
    jest.useFakeTimers();
    const query = signal('');

    function Probe() {
      const { term, submit } = useSearchTerm(query);
      return (
        <div>
          <span data-testid="term">{term}</span>
          <button type="button" onClick={() => submit('now')}>submit</button>
        </div>
      );
    }

    render(<Probe />);

    act(() => {
      query.value = 'hello';
    });
    expect(screen.getByTestId('term').textContent).toBe('');

    act(() => {
      jest.advanceTimersByTime(APP_CONFIG.PERFORMANCE.DEBOUNCE_MS);
    });
    expect(screen.getByTestId('term').textContent).toBe('hello');

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(screen.getByTestId('term').textContent).toBe('now');
  });

  test('does not refetch an open feed when the window regains focus', async () => {
    const selected = signal<IFeed | null>(SHOW);
    const favorited = signal<ReadonlySet<IFeed>>(new Set());
    const lastOpened = signal('');

    function Probe() {
      const query = usePodcastFeedQuery(selected, favorited, lastOpened);
      return (
        <span data-testid="feed-status" data-updated={String(query.dataUpdatedAt)}>
          {query.fetchStatus}:{query.status}
        </span>
      );
    }

    global.fetch = jest.fn().mockImplementation(() => jsonResponse({
      status: 'ok',
      items: [{
        guid: 'e1',
        title: 'Episode',
        description: 'Notes',
        pubDate: '2026-01-01',
        enclosure: { link: 'https://example.com/episode.mp3', duration: 60 }
      }]
    }));

    render(<Probe />, { wrapper: QueryTestProvider });

    await waitFor(() => {
      expect(screen.getByTestId('feed-status')).toHaveTextContent('idle:success');
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('/feed?');

    const updatedAt = Number(screen.getByTestId('feed-status').getAttribute('data-updated'));
    expect(updatedAt).toBeGreaterThan(0);
    const now = agePastStaleTime(updatedAt);

    try {
      await regainFocus();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('feed-status')).toHaveTextContent('idle:success');
    } finally {
      now.mockRestore();
      focusManager.setFocused(undefined);
    }
  });

  test('refetches the chart when the window regains focus after it is stale', async () => {
    function Probe() {
      const query = useTopPodcastsQuery(false);
      return (
        <span data-testid="chart-status" data-updated={String(query.dataUpdatedAt)}>
          {query.fetchStatus}:{query.status}
        </span>
      );
    }

    global.fetch = jest.fn().mockImplementation(() => jsonResponse({
      feed: { entry: [CHART_ENTRY] }
    }));

    render(<Probe />, { wrapper: QueryTestProvider });

    await waitFor(() => {
      expect(screen.getByTestId('chart-status')).toHaveTextContent('idle:success');
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toBe('/top-podcasts.json');

    const updatedAt = Number(screen.getByTestId('chart-status').getAttribute('data-updated'));
    expect(updatedAt).toBeGreaterThan(0);
    const now = agePastStaleTime(updatedAt);

    try {
      await regainFocus();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
      expect(String((global.fetch as jest.Mock).mock.calls[1][0])).toContain('q=toppodcasts');
    } finally {
      now.mockRestore();
      focusManager.setFocused(undefined);
    }
  });
});

const SHOW: IFeed = {
  collectionName: 'Open Show',
  feedUrl: 'https://example.com/show.rss',
  artworkUrl100: 'https://example.com/show-100.jpg',
  artworkUrl600: 'https://example.com/show-600.jpg'
};

const CHART_ENTRY: ITopPodcast = {
  title: { label: 'Chart Show' },
  id: {
    label: 'https://podcasts.apple.com/us/podcast/chart-show/id1',
    attributes: { 'im:id': '1' }
  },
  'im:image': [{ label: 'https://example.com/chart.png' }]
};

/**
 * Makes cached data stale without waiting out the real five minute window.
 */
function agePastStaleTime(updatedAt: number): jest.SpyInstance {
  return jest.spyOn(Date, 'now').mockReturnValue(updatedAt + APP_CONFIG.PERFORMANCE.CACHE_TTL_MS + 1);
}

/**
 * TanStack listens for focus and refetches stale queries that opted in.
 * The refetch itself starts on the microtask after the focus notification.
 */
async function regainFocus(): Promise<void> {
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}
