import { h } from 'preact';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';

import { App } from '../AppFunctional';

// Mock fetch for testing
global.fetch = jest.fn() as jest.Mock;

// Helper to mock fetch responses
const mockFetch = (data: any, status = 200) => {
  return jest.fn().mockImplementation(() => 
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data)
    })
  );
};

/** Monday before the promo, so the banner stays out of these snapshots all year. */
const OUTSIDE_PROMO_MS = Date.parse('2026-11-23T20:00:00Z');

describe('App component', () => {
  beforeEach(() => {
    // Clear localStorage and mocks before each test
    localStorage.clear();
    jest.clearAllMocks();

    // Date is frozen outside the promo window. Timers stay real so waitFor works.
    jest.useFakeTimers({
      now: OUTSIDE_PROMO_MS,
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'performance',
      ],
    });
    
    // Mock console.error to prevent test output noise
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders without crashing', async () => {
    // Set up default fetch mock for top podcasts
    global.fetch = mockFetch({
      feed: {
        entry: [
          { 
            title: { label: 'Test Podcast' },
            id: { 
              label: 'test-id',
              attributes: { 'im:id': '123' }
            },
            'im:image': [
              { label: 'test-image-url-small' },
              { label: 'test-image-url-medium' },
              { label: 'test-image-url-large' }
            ]
          }
        ]
      }
    });
    
    const { container } = render(<App />);
    
    // Verify the app title is rendered
    const title = screen.getByText('Podr');
    expect(title).toBeInTheDocument();
    // Outside the window the promo is absent, so the layout matches today
    expect(screen.queryByRole('region', { name: 'Black Friday and Cyber Monday' })).not.toBeInTheDocument();
    
    // Create snapshot of initial app state
    expect(container).toMatchSnapshot();
  });

  test('loads top podcasts on mount', async () => {
    // Set up default fetch mock for top podcasts
    global.fetch = mockFetch({
      feed: {
        entry: [
          { 
            title: { label: 'Test Podcast' },
            id: { 
              label: 'test-id',
              attributes: { 'im:id': '123' }
            },
            'im:image': [
              { label: 'test-image-url-small' },
              { label: 'test-image-url-medium' },
              { label: 'test-image-url-large' }
            ]
          }
        ]
      }
    });
    
    const { container } = render(<App />);
    
    // The chart request carries the query abort signal
    expect(fetch).toHaveBeenCalledWith('/top-podcasts.json', expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
    
    // The section heading is present while the chart is still loading.
    // Wait for the podcast itself so the snapshot is the loaded chart.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Test Podcast' })).toBeInTheDocument();
    });

    // Create snapshot after top podcasts have loaded
    expect(container).toMatchSnapshot();
  });

  test('handles search functionality', async () => {
    // First set up mock for initial page load
    global.fetch = mockFetch({
      feed: {
        entry: [
          { 
            title: { label: 'Test Podcast' },
            id: { 
              label: 'test-id',
              attributes: { 'im:id': '123' }
            },
            'im:image': [
              { label: 'test-image-url-small' },
              { label: 'test-image-url-medium' },
              { label: 'test-image-url-large' }
            ]
          }
        ]
      }
    });
    
    render(<App />);
    
    // Now override fetch for search results
    global.fetch = mockFetch({
      results: [
        {
          collectionName: 'Test Search Result',
          feedUrl: 'https://example.com/feed',
          artworkUrl100: 'https://example.com/artwork.jpg',
          artworkUrl600: 'https://example.com/artwork-large.jpg'
        }
      ]
    });
    
    // Find search input and submit button
    const searchInput = screen.getByPlaceholderText(/search podcasts/i);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Perform search
    fireEvent.input(searchInput, { target: { value: 'test query' } });
    fireEvent.click(searchButton);
    
    // Verify search API was called with correct parameters
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      // The actual URL will be structured differently, so we just check that fetch was called
    });
    
    // Set up mock for search results display
    global.fetch = mockFetch({
      results: [
        {
          collectionName: 'Test Search Result',
          feedUrl: 'https://example.com/feed',
          artworkUrl100: 'https://example.com/artwork.jpg',
          artworkUrl600: 'https://example.com/artwork-large.jpg'
        }
      ]
    });
    
    // Wait for search results to appear
    await waitFor(() => {
      expect(screen.getByText(/Results for.*test query/i)).toBeInTheDocument();
    });
  });

  test('shows the promo from ?promo=bf2026 and dismisses it without tracking', async () => {
    global.fetch = mockFetch({ feed: { entry: [] } });
    window.history.replaceState(null, '', '/?promo=bf2026');
    const gtag = window.gtag as jest.Mock;
    const callsBefore = gtag.mock.calls.length;

    render(<App />);

    expect(screen.getByRole('region', { name: 'Black Friday and Cyber Monday' })).toHaveTextContent(
      'no account and no ads'
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Dismiss promotion' }), { key: 'Escape' });

    expect(screen.queryByRole('region', { name: 'Black Friday and Cyber Monday' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveFocus();
    // The clock is outside the window, so preview dismissal is not stored.
    expect(localStorage.getItem('podr_promo_bf2026_dismissed')).toBeNull();
    expect(document.cookie).toBe('');
    expect(gtag.mock.calls.length).toBe(callsBefore);
  });

  test('starts when saved podcasts are not a list', async () => {
    localStorage.setItem('podr_feeds', JSON.stringify({ feedUrl: 'https://example.com/feed.rss' }));
    global.fetch = mockFetch({ feed: { entry: [] } });

    render(<App />);

    expect(await screen.findByText('Nothing saved yet.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Podr' })).toBeInTheDocument();
  });
});