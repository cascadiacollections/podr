import { FunctionComponent, h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { IFeed } from '../utils/AppContext';
import { IFeedDetails } from '../utils/feed';
import { List } from './List';
import { IFeedItem } from './Result';

/**
 * Artwork shown at 160px, so the 600px source covers high-density displays
 */
const HERO_ARTWORK_SIZE = 160 as const;

/**
 * How long "Link copied" stays on the share button
 */
const COPIED_CONFIRMATION_MS = 2000;

type ShareState = 'idle' | 'copied' | 'failed';

/**
 * Hands the podcast's link to the platform share sheet where there is one,
 * and to the clipboard otherwise
 * @returns What happened, for the button to report
 */
const sharePodcast = async (title: string, url: string): Promise<ShareState> => {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'idle';
    } catch (error: unknown) {
      // Dismissing the share sheet is a choice, not a failure
      if ((error as Error).name === 'AbortError') {
        return 'idle';
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
};

export interface IPodcastViewProps {
  readonly feed: IFeed;
  /** What the feed says about itself; empty until the feed has loaded once */
  readonly details: IFeedDetails;
  readonly episodes: ReadonlyArray<IFeedItem>;
  readonly isLoading: boolean;
  readonly isFavorite: boolean;
  /** Shown above the episodes when the latest fetch failed */
  readonly error?: { readonly message: string; readonly reason?: string };
  /** The episode loaded in the player, highlighted in the list */
  readonly currentGuid?: string;
  readonly onBack: () => void;
  readonly onToggleFavorite: () => void;
  readonly onPlay: (item: IFeedItem) => void;
}

/**
 * One podcast on its own page: who makes it, what it is about, and its episodes.
 *
 * This used to be a panel under the browse grids, which left a long episode
 * list with nothing nearby saying whose episodes they were. Giving the podcast
 * the whole view keeps its name and artwork in sight of the list.
 */
export const PodcastView: FunctionComponent<IPodcastViewProps> = ({
  feed,
  details,
  episodes,
  isLoading,
  isFavorite,
  error,
  currentGuid,
  onBack,
  onToggleFavorite,
  onPlay
}: IPodcastViewProps) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [shareState, setShareState] = useState<ShareState>('idle');

  // A new page deserves a new reading position: move focus to its heading so
  // keyboard and screen reader users start at the podcast, not the old grid
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [feed.feedUrl]);

  // The feed's own title is the podcast's name without the publisher appended,
  // which top-chart entries carry
  // A podcast opened from a link has no name until its feed answers
  const name = details.title || feed.collectionName || (isLoading ? 'Loading podcast…' : 'Podcast');
  const author = details.author || feed.artistName || '';
  const episodeCount = episodes.length;

  const handleShare = useCallback(() => {
    // The address bar already carries the podcast, via ?feed=
    void sharePodcast(name, window.location.href).then(setShareState);
  }, [name]);

  useEffect(() => {
    if (shareState === 'idle') {
      return undefined;
    }

    const timer = window.setTimeout(() => setShareState('idle'), COPIED_CONFIRMATION_MS);
    return () => window.clearTimeout(timer);
  }, [shareState]);

  // A new podcast starts without the last one's confirmation
  useEffect(() => {
    setShareState('idle');
  }, [feed.feedUrl]);

  return (
    <article className="podcast-view" aria-labelledby="podcast-heading">
      <button type="button" className="back-button" onClick={onBack}>
        <span aria-hidden="true">←</span> Podcasts
      </button>

      <header className="podcast-hero">
        <img
          className="podcast-hero__artwork"
          src={feed.artworkUrl600 || feed.artworkUrl100}
          width={HERO_ARTWORK_SIZE}
          height={HERO_ARTWORK_SIZE}
          alt=""
          decoding="async"
        />
        <div className="podcast-hero__text">
          <h2 className="podcast-hero__title" id="podcast-heading" ref={headingRef} tabIndex={-1}>
            {name}
          </h2>
          {author ? <p className="podcast-hero__author">{author}</p> : null}
          {details.description ? (
            <p className="podcast-hero__description">{details.description}</p>
          ) : null}
          <div className="podcast-hero__actions">
            <button
              type="button"
              className={isFavorite ? 'pill-button pill-button--active' : 'pill-button'}
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${name} from your library` : `Add ${name} to your library`}
            >
              <span aria-hidden="true">{isFavorite ? '★' : '☆'}</span>
              {isFavorite ? ' In your library' : ' Add to library'}
            </button>
            <button type="button" className="pill-button" onClick={handleShare}>
              <span aria-hidden="true">↗</span> Share
            </button>
            {/* Announced without moving focus, and kept out of the button's name */}
            <span className="podcast-hero__status" role="status">
              {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Could not copy the link' : ''}
            </span>
          </div>
        </div>
      </header>

      {error ? (
        <p className="notice notice--error" role="alert">
          <span>{error.message}</span>
          {error.reason ? <span className="notice__reason">{error.reason}</span> : null}
        </p>
      ) : null}

      <section className="section" aria-labelledby="episodes-heading">
        <div className="section__header">
          <h3 className="section__title" id="episodes-heading">Episodes</h3>
          {isLoading && episodeCount > 0 ? (
            <span className="section__count">Refreshing…</span>
          ) : episodeCount > 0 ? (
            <span className="section__count">{episodeCount}</span>
          ) : null}
        </div>
        <List results={episodes} onClick={onPlay} isLoading={isLoading} currentGuid={currentGuid} />
      </section>
    </article>
  );
};
