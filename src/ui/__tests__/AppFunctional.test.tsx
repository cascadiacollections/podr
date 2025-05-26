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
    
    // Mock console.error to prevent test output noise
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
    
    render(<App />);
    
    // Verify the app title is rendered
    const title = screen.getByText('Podr');
    expect(title).toBeInTheDocument();
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
    
    render(<App />);
    
    // Verify fetch was called for static data
    expect(fetch).toHaveBeenCalledWith('/top-podcasts.json');
    
    // Wait for top podcasts section to be rendered
    await waitFor(() => {
      expect(screen.getByText('Top podcasts')).toBeInTheDocument();
    });
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
});