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

describe('App component', () => {
  beforeEach(() => {
    // Clear localStorage and mocks before each test
    localStorage.clear();
    jest.clearAllMocks();
    
    // Set up default fetch mock
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
              { label: 'test-image-url' }
            ]
          }
        ]
      }
    });
  });

  test('renders without crashing', async () => {
    render(<App />);
    
    // Verify the app title is rendered
    const title = screen.getByText('Podr');
    expect(title).toBeInTheDocument();
  });

  test('loads top podcasts on mount', async () => {
    render(<App />);
    
    // Verify fetch was called for static data or API
    expect(fetch).toHaveBeenCalled();
    
    // Wait for top podcasts to be rendered
    await waitFor(() => {
      expect(screen.getByText(/Episodes/i)).toBeInTheDocument();
    });
  });

  test('handles search functionality', async () => {
    // Setup specific mock for search results
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

    render(<App />);
    
    // Find search input and submit button
    const searchInput = screen.getByPlaceholderText(/search/i) || screen.getByRole('searchbox');
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Perform search
    fireEvent.input(searchInput, { target: { value: 'test query' } });
    fireEvent.click(searchButton);
    
    // Verify search API was called
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=test%20query'), expect.any(Object));
    
    // Wait for search results to appear
    await waitFor(() => {
      expect(screen.getByText(/Results for/i)).toBeInTheDocument();
    });
  });
});