import { Fragment, FunctionComponent, h } from 'preact';

import { IFeed } from '../utils/AppContext';
import { HOME_LEDE } from './homeCopy';
import { PodcastCard } from './PodcastCard';

/**
 * Cards whose artwork loads eagerly: roughly the first row on a phone, so the top
 * of a grid is never blank while the rest streams in lazily.
 */
const EAGER_ARTWORK_COUNT = 3;

/**
 * Placeholder cards shown while the first set of top podcasts arrives
 */
const SKELETON_CARDS: ReadonlyArray<number> = Object.freeze([0, 1, 2, 3, 4, 5]);

export interface IBrowseViewProps {
  readonly feeds: ReadonlyArray<IFeed>;
  readonly topFeeds: ReadonlyArray<IFeed>;
  readonly searchResults: ReadonlyArray<IFeed>;
  readonly query: string;
  readonly favoriteUrls: ReadonlySet<string>;
  readonly lastOpenedUrl: string;
  readonly onOpen: (feed: IFeed) => void;
  readonly onToggleFavorite: (feed: IFeed) => void;
}

/**
 * The browse screen: search hits, the saved library, and the top chart.
 * A first visit leads with discovery; once the library has entries it leads instead.
 */
export const BrowseView: FunctionComponent<IBrowseViewProps> = ({
  feeds,
  topFeeds,
  searchResults,
  query,
  favoriteUrls,
  lastOpenedUrl,
  onOpen,
  onToggleFavorite
}: IBrowseViewProps) => {
  const hasLibrary = feeds.length > 0;

  const librarySection = (
    <section className="section" aria-labelledby="library-heading">
      <div className="section__header">
        <h2 className="section__title" id="library-heading">Your library</h2>
        {feeds.length > 0 ? (
          <span className="section__count">{feeds.length}</span>
        ) : null}
      </div>
      {feeds.length > 0 ? (
        <ul className="card-grid">
          {feeds.map((result: IFeed, index: number) => (
            <PodcastCard
              key={result.feedUrl}
              feed={result}
              onOpen={onOpen}
              onToggleFavorite={onToggleFavorite}
              isFavorite
              isCurrent={lastOpenedUrl === result.feedUrl}
              lazy={index >= EAGER_ARTWORK_COUNT}
            />
          ))}
        </ul>
      ) : (
        <div className="empty-state empty-state--compact">
          <p>Nothing saved yet.</p>
          <p className="empty-message">Star a podcast to keep it here, ready to open offline.</p>
        </div>
      )}
    </section>
  );

  const discoverSection = (
    <section className="section" aria-labelledby="top-podcasts-heading">
      <div className="section__header">
        <h2 className="section__title" id="top-podcasts-heading">Top podcasts</h2>
      </div>
      {topFeeds.length > 0 ? (
        <ul className="card-grid">
          {topFeeds.map((feed: IFeed, index: number) => (
            <PodcastCard
              key={feed.feedUrl}
              feed={feed}
              onOpen={onOpen}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favoriteUrls.has(feed.feedUrl)}
              isCurrent={lastOpenedUrl === feed.feedUrl}
              lazy={index >= EAGER_ARTWORK_COUNT}
            />
          ))}
        </ul>
      ) : (
        <ul className="card-grid">
          {SKELETON_CARDS.map((placeholder: number) => (
            <li className="podcast-card" key={placeholder} aria-hidden="true">
              <div className="skeleton skeleton--card" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <Fragment>
      <p className="home-lede">{HOME_LEDE}</p>
      {searchResults.length > 0 ? (
        <section className="section" aria-labelledby="search-results-heading">
          <div className="section__header">
            <h2 className="section__title" id="search-results-heading">
              Results for “{query}”
            </h2>
            <span className="section__count">{searchResults.length}</span>
          </div>
          <ul className="card-grid">
            {searchResults.map((result: IFeed, index: number) => (
              <PodcastCard
                key={result.feedUrl}
                feed={result}
                onOpen={onOpen}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favoriteUrls.has(result.feedUrl)}
                isCurrent={lastOpenedUrl === result.feedUrl}
                lazy={index >= EAGER_ARTWORK_COUNT}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {hasLibrary ? librarySection : discoverSection}
      {hasLibrary ? discoverSection : librarySection}
    </Fragment>
  );
};
