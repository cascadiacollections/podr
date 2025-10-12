/**
 * Example usage of use-stable-collections in Podr components
 * 
 * This file demonstrates how the new signals-first stable collections
 * can be integrated with existing Podr components.
 */

import { signal } from '@preact/signals';
import { FunctionComponent, h } from 'preact';
import { useState } from 'preact/hooks';
import { IFeed } from '../utils/AppContext';
import {
  useCollection,
  useCombine,
  useConditional,
  usePagination,
  useTransform
} from '../utils/use-stable-collections';

/**
 * Example 1: Basic podcast list with stable empty array
 * 
 * Benefits:
 * - No unnecessary re-renders when list is empty
 * - Same empty array reference across all components
 */
export const PodcastListExample: FunctionComponent<{ feeds: IFeed[] }> = ({ feeds }) => {
  const stableFeeds = useCollection(feeds);
  
  return (
    <div>
      <h2>My Podcasts ({stableFeeds.value.length})</h2>
      <div className="feeds">
        {stableFeeds.value.map(feed => (
          <div key={feed.feedUrl} className="feed-item">
            <img src={feed.artworkUrl100} alt={feed.collectionName} />
            <span>{feed.collectionName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example 2: Filtered and sorted podcast list
 * 
 * Benefits:
 * - Chainable transformations
 * - Automatic caching of operations
 * - Reactive to filter changes
 */
export const FilteredPodcastListExample: FunctionComponent<{ feeds: IFeed[] }> = ({ feeds }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredFeeds = useTransform(feeds)
    .filter(feed => 
      searchQuery === '' || 
      feed.collectionName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.collectionName.localeCompare(b.collectionName));
  
  return (
    <div>
      <input
        type="text"
        placeholder="Search podcasts..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.currentTarget.value)}
      />
      <div>Found {filteredFeeds.value.length} podcasts</div>
      <div className="feeds">
        {filteredFeeds.value.map(feed => (
          <div key={feed.feedUrl}>{feed.collectionName}</div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example 3: Paginated podcast list
 * 
 * Benefits:
 * - Built-in pagination logic
 * - Easy navigation controls
 * - Automatic page calculation
 */
export const PaginatedPodcastListExample: FunctionComponent<{ feeds: IFeed[] }> = ({ feeds }) => {
  const pagination = usePagination(feeds, 12);
  
  return (
    <div>
      <div className="feeds-grid">
        {pagination.paginationData.value.items.map(feed => (
          <div key={feed.feedUrl} className="feed-card">
            <img src={feed.artworkUrl100} alt={feed.collectionName} />
            <h3>{feed.collectionName}</h3>
            <p>{feed.artistName}</p>
          </div>
        ))}
      </div>
      
      <div className="pagination-controls">
        <button
          onClick={pagination.previousPage}
          disabled={!pagination.paginationData.value.hasPreviousPage}
        >
          ← Previous
        </button>
        
        <span>
          Page {pagination.paginationData.value.currentPage + 1} of{' '}
          {pagination.paginationData.value.totalPages}
        </span>
        
        <button
          onClick={pagination.nextPage}
          disabled={!pagination.paginationData.value.hasNextPage}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

/**
 * Example 4: Conditional display (favorites vs all)
 * 
 * Benefits:
 * - Reactive condition switching
 * - Clean conditional logic
 * - Single source of truth
 */
export const ConditionalPodcastListExample: FunctionComponent<{
  allFeeds: IFeed[];
  favoriteFeeds: IFeed[];
}> = ({ allFeeds, favoriteFeeds }) => {
  const showFavoritesSignal = signal(false);
  
  const displayedFeeds = useConditional(
    showFavoritesSignal,
    favoriteFeeds,
    allFeeds
  );
  
  return (
    <div>
      <button onClick={() => { showFavoritesSignal.value = !showFavoritesSignal.value; }}>
        {showFavoritesSignal.value ? 'Show All' : 'Show Favorites'}
      </button>
      
      <div>
        Showing {displayedFeeds.value.length} podcasts
      </div>
      
      <div className="feeds">
        {displayedFeeds.value.map(feed => (
          <div key={feed.feedUrl}>{feed.collectionName}</div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example 5: Combining multiple podcast sources
 * 
 * Benefits:
 * - Merge multiple arrays efficiently
 * - Skip empty collections automatically
 * - Single reactive result
 */
export const CombinedPodcastListExample: FunctionComponent<{
  subscriptions: IFeed[];
  recommendations: IFeed[];
  trending: IFeed[];
}> = ({ subscriptions, recommendations, trending }) => {
  const allPodcasts = useCombine(
    useCollection(subscriptions),
    useCollection(recommendations),
    useCollection(trending)
  );
  
  // Remove duplicates by feedUrl
  const uniquePodcasts = useTransform(allPodcasts)
    .filter((feed, index, array) => 
      array.findIndex(f => f.feedUrl === feed.feedUrl) === index
    );
  
  return (
    <div>
      <h2>All Podcasts ({uniquePodcasts.value.length})</h2>
      <div className="sections">
        <section>
          <h3>Subscriptions ({subscriptions.length})</h3>
        </section>
        <section>
          <h3>Recommendations ({recommendations.length})</h3>
        </section>
        <section>
          <h3>Trending ({trending.length})</h3>
        </section>
        <section>
          <h3>All Unique ({uniquePodcasts.value.length})</h3>
        </section>
      </div>
    </div>
  );
};

/**
 * Example 6: Advanced grouping and statistics
 * 
 * Benefits:
 * - Powerful groupBy transformation
 * - Derive statistics reactively
 * - Type-safe Map operations
 */
export const GroupedPodcastStatsExample: FunctionComponent<{ feeds: IFeed[] }> = ({ feeds }) => {
  // Group podcasts by first letter
  const groupedByLetter = useTransform(feeds)
    .groupBy(feed => feed.collectionName.charAt(0).toUpperCase());
  
  return (
    <div>
      <h2>Podcasts by Letter</h2>
      <div className="groups">
        {Array.from(groupedByLetter.value.entries()).map(([letter, podcasts]) => (
          <div key={letter} className="letter-group">
            <h3>{letter}</h3>
            <div>Count: {podcasts.length}</div>
            <ul>
              {podcasts.slice(0, 5).map(feed => (
                <li key={feed.feedUrl}>{feed.collectionName}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
