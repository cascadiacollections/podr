import { h } from 'preact';
import { fireEvent, render, screen, waitFor } from '@testing-library/preact';

import { App } from '../AppFunctional';

/**
 * A favorite that is restored from localStorage, giving the test something to click
 */
const STORED_FEED = {
  collectionName: 'My Show',
  feedUrl: 'https://example.com/feed.rss',
  artworkUrl100: 'https://example.com/artwork-100.jpg',
  artworkUrl600: 'https://example.com/artwork-600.jpg'
};

/**
 * An episode list persisted by an earlier successful fetch
 */
const STORED_EPISODE = {
  guid: 'cached-1',
  title: 'Cached Episode',
  description: 'Loaded before the app was reopened',
  pubDate: '2026-01-01 09:00:00',
  enclosure: {
    link: 'https://example.com/cached.mp3',
    duration: 600
  }
};

const TOP_PODCASTS_RESPONSE = { feed: { entry: [] } };

/**
 * What the Podr worker returns for a request that carries no `q` parameter:
 * its OpenAPI schema, with a 200 status
 */
const OPENAPI_SCHEMA_RESPONSE = {
  openapi: '3.0.0',
  info: { title: 'Podr API', version: '1.0.0' },
  paths: { '/': {} }
};

const jsonResponse = (data: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });

/**
 * Routes the feed request to `feedResponse` and everything else to top podcasts
 */
const mockFetchWithFeed = (feedResponse: unknown): jest.Mock =>
  jest.fn().mockImplementation((url: string) =>
    String(url).includes('rss_url')
      ? jsonResponse(feedResponse)
      : jsonResponse(TOP_PODCASTS_RESPONSE)
  );

describe('App episode fetching', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    localStorage.setItem('podr_feeds', JSON.stringify([STORED_FEED]));
    localStorage.setItem('podr_results', JSON.stringify([STORED_EPISODE]));
  });

  test('renders episodes returned by the feed service', async () => {
    global.fetch = mockFetchWithFeed({
      status: 'ok',
      items: [
        {
          guid: 'fresh-1',
          title: 'Fresh Episode',
          description: 'Just fetched',
          pubDate: '2026-02-02 09:00:00',
          enclosure: { link: 'https://example.com/fresh.mp3', duration: '42:15' }
        }
      ]
    });

    render(<App />);
    fireEvent.click(screen.getByAltText(STORED_FEED.collectionName));

    await waitFor(() => {
      expect(screen.getByText('Fresh Episode')).toBeInTheDocument();
    });

    // Clock-notation durations are converted to HH:MM:SS rather than dropped
    expect(screen.getByText('00:42:15')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('reports an error and keeps existing episodes when the response is not a feed', async () => {
    global.fetch = mockFetchWithFeed(OPENAPI_SCHEMA_RESPONSE);

    render(<App />);
    expect(screen.getByText(STORED_EPISODE.title)).toBeInTheDocument();

    fireEvent.click(screen.getByAltText(STORED_FEED.collectionName));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load episodes/i);
    });

    // The previously loaded episodes survive a failed refresh
    expect(screen.getByText(STORED_EPISODE.title)).toBeInTheDocument();
  });

  test('reports an error when the feed service returns a failure status', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      String(url).includes('rss_url')
        ? Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
        : jsonResponse(TOP_PODCASTS_RESPONSE)
    );

    render(<App />);
    fireEvent.click(screen.getByAltText(STORED_FEED.collectionName));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  test('does not favorite the same podcast twice', async () => {
    const topPodcast = {
      title: { label: 'Top Show' },
      id: {
        label: 'https://podcasts.apple.com/us/podcast/top-show/id123',
        attributes: { 'im:id': '123' }
      },
      'im:image': [{ label: 'small.jpg' }, { label: 'medium.jpg' }, { label: 'large.jpg' }]
    };

    localStorage.removeItem('podr_feeds');
    global.fetch = jest.fn().mockImplementation(() => jsonResponse({ feed: { entry: [topPodcast] } }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByAltText('Top Show')).toBeInTheDocument();
    });

    const artwork = screen.getByAltText('Top Show');
    fireEvent.dblClick(artwork);
    fireEvent.dblClick(artwork);

    // One image in Top podcasts, one in Favorites - the second pin is a no-op
    await waitFor(() => {
      expect(screen.getAllByAltText('Top Show')).toHaveLength(2);
    });

    // The favorite carries the podcast's real artwork rather than an empty src
    const favorite = screen.getAllByAltText('Top Show')[1];
    expect(favorite).toHaveAttribute('src', 'large.jpg');
  });

  test('requests episodes from the RSS to JSON service, not the Podr worker', async () => {
    global.fetch = mockFetchWithFeed({ status: 'ok', items: [] });

    render(<App />);
    fireEvent.click(screen.getByAltText(STORED_FEED.collectionName));

    await waitFor(() => {
      const feedCall = (global.fetch as jest.Mock).mock.calls
        .map(([url]) => String(url))
        .find((url) => url.includes('rss_url'));

      expect(feedCall).toContain('https://api.rss2json.com/v1/api.json');
      expect(feedCall).toContain(encodeURIComponent(STORED_FEED.feedUrl));
    });
  });
});
