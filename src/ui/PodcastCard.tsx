import { FunctionComponent, h } from 'preact';
import { memo } from 'preact/compat';
import { useCallback } from 'preact/hooks';

import { IFeed } from '../utils/AppContext';

/**
 * Artwork rendered at 100px on a 1x display; the grid never shows it larger
 */
const ARTWORK_SIZE = 100 as const;

export interface IPodcastCardProps {
  readonly feed: IFeed;
  /** Called when the podcast is opened, to load its episodes */
  readonly onOpen: (feed: IFeed) => void;
  /** Called when the favorite button is pressed */
  readonly onToggleFavorite: (feed: IFeed) => void;
  /** Whether this podcast is in the user's library */
  readonly isFavorite: boolean;
  /** Whether this podcast's episodes are the ones currently listed */
  readonly isCurrent?: boolean;
  /**
   * Whether the artwork may load lazily. The first row of a grid is loaded
   * eagerly so the page does not paint empty above the fold.
   */
  readonly lazy?: boolean;
}

/**
 * A podcast in a grid: artwork, name, and an explicit favorite toggle.
 *
 * The toggle replaces a double-click gesture that was undiscoverable and had no
 * keyboard equivalent. Handlers take the feed as an argument so the parent can
 * pass stable callbacks instead of allocating a closure per card on every render.
 */
export const PodcastCard: FunctionComponent<IPodcastCardProps> = memo(
  ({ feed, onOpen, onToggleFavorite, isFavorite, isCurrent = false, lazy = true }: IPodcastCardProps) => {
    const handleOpen = useCallback(() => onOpen(feed), [feed, onOpen]);
    const handleToggleFavorite = useCallback(() => onToggleFavorite(feed), [feed, onToggleFavorite]);

    return (
      <li className={isCurrent ? 'podcast-card podcast-card--current' : 'podcast-card'}>
        <button
          type="button"
          className="podcast-card__open"
          onClick={handleOpen}
          aria-current={isCurrent ? 'true' : undefined}
        >
          <img
            className="podcast-card__artwork"
            src={feed.artworkUrl100}
            srcSet={feed.artworkUrl600 ? `${feed.artworkUrl100} 1x, ${feed.artworkUrl600} 2x` : undefined}
            width={ARTWORK_SIZE}
            height={ARTWORK_SIZE}
            alt=""
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            draggable={false}
          />
          <span className="podcast-card__name">{feed.collectionName}</span>
        </button>
        <button
          type="button"
          className={isFavorite ? 'icon-button icon-button--active podcast-card__favorite' : 'icon-button podcast-card__favorite'}
          onClick={handleToggleFavorite}
          aria-pressed={isFavorite}
          title={isFavorite ? `Remove ${feed.collectionName} from your library` : `Add ${feed.collectionName} to your library`}
        >
          <span aria-hidden="true">{isFavorite ? '★' : '☆'}</span>
          <span className="visually-hidden">
            {isFavorite ? `Remove ${feed.collectionName} from your library` : `Add ${feed.collectionName} to your library`}
          </span>
        </button>
      </li>
    );
  },
  (prevProps: IPodcastCardProps, nextProps: IPodcastCardProps): boolean =>
    prevProps.feed.feedUrl === nextProps.feed.feedUrl &&
    prevProps.feed.collectionName === nextProps.feed.collectionName &&
    prevProps.feed.artworkUrl100 === nextProps.feed.artworkUrl100 &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isCurrent === nextProps.isCurrent &&
    prevProps.lazy === nextProps.lazy &&
    prevProps.onOpen === nextProps.onOpen &&
    prevProps.onToggleFavorite === nextProps.onToggleFavorite
);
