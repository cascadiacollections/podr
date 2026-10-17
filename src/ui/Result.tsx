import { h, FunctionComponent } from 'preact';
import { useCallback, useId, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';

const SECONDS_PER_MINUTE = 60 as const;
const MINUTES_PER_HOUR = 60 as const;

/**
 * Date formatting for episodes from this year, where the year is noise
 */
const DATE_FORMAT_OPTIONS = {
  month: 'short',
  day: 'numeric',
} as const satisfies Intl.DateTimeFormatOptions;

/**
 * Date formatting for older episodes
 */
const DATED_FORMAT_OPTIONS = {
  ...DATE_FORMAT_OPTIONS,
  year: 'numeric',
} as const satisfies Intl.DateTimeFormatOptions;

/**
 * Formats a duration the way people say it: "1 hr 5 min", "42 min".
 * @param duration - Duration in seconds
 * @returns The formatted duration, or an empty string when it is unknown
 */
export function formatDuration(duration: number): string {
  if (!duration || !Number.isFinite(duration) || duration <= 0) {
    return '';
  }

  const totalMinutes = Math.round(duration / SECONDS_PER_MINUTE);

  if (totalMinutes < 1) {
    return '< 1 min';
  }

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

/**
 * Formats a publication date, leaving out the year for this year's episodes
 * @param isoString - The date as given by the feed
 * @param now - The current time, for deciding whether the year is needed
 * @returns The formatted date, or an empty string when there is none to show
 */
export function formatPubDate(isoString: string, now: Date = new Date()): string {
  if (!isoString || typeof isoString !== 'string') {
    return '';
  }

  const date = new Date(isoString);

  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(
    undefined,
    date.getFullYear() === now.getFullYear() ? DATE_FORMAT_OPTIONS : DATED_FORMAT_OPTIONS
  );
}

/**
 * Podcast episode enclosure information
 */
export interface IEnclosure {
  readonly link: string;
  readonly duration: number;
}

/**
 * Represents a podcast feed item/episode
 */
export interface IFeedItem {
  readonly guid: string;
  readonly title: string;
  readonly description: string;
  readonly pubDate: string;
  readonly enclosure: IEnclosure;
}

/**
 * Props for the Result component
 */
export interface IResultProps {
  readonly result: IFeedItem;
  readonly onClick: (result: IFeedItem) => void;
  /** Whether this episode is the one loaded in the player */
  readonly isCurrent?: boolean;
}

/**
 * An episode in the list: what it is, when it came out, how long it runs, and
 * enough of its description to tell it apart from its neighbours.
 *
 * The whole row is a single button, so the target is large and there is one
 * action per episode. Everything inside it is phrasing content, as a button
 * requires.
 */
export const Result: FunctionComponent<IResultProps> = memo(
  ({ onClick, result, isCurrent = false }: IResultProps) => {
    const { title, pubDate, enclosure, description } = result;

    // Feeds routinely omit the enclosure on trailer and note-only entries
    const isPlayable = Boolean(enclosure?.link);
    const enclosureDuration = enclosure?.duration ?? 0;

    // The label names the action; the date and length are read as its description
    const metaId = useId();

    const handleClick = useCallback(() => {
      onClick(result);
    }, [result, onClick]);

    const formattedDate = useMemo(() => formatPubDate(pubDate), [pubDate]);
    const formattedDuration = useMemo(() => formatDuration(enclosureDuration), [enclosureDuration]);

    const ariaLabel = useMemo(
      () => (isPlayable ? `Play episode: ${title}` : `${title} (no audio available)`),
      [title, isPlayable]
    );

    return (
      <li className={isCurrent ? 'episode episode--current' : 'episode'}>
        <button
          type="button"
          className="episode__button"
          onClick={handleClick}
          disabled={!isPlayable}
          aria-label={ariaLabel}
          aria-current={isCurrent ? 'true' : undefined}
          aria-describedby={formattedDate || formattedDuration ? metaId : undefined}
        >
          <span className="episode__play" aria-hidden="true">{isCurrent ? '♪' : '▶'}</span>
          <span className="episode__body">
            <span className="episode__title">{title}</span>
            {formattedDate || formattedDuration ? (
              <span className="episode__meta" id={metaId}>
                {formattedDate ? <time dateTime={pubDate}>{formattedDate}</time> : null}
                {formattedDate && formattedDuration ? <span aria-hidden="true"> · </span> : null}
                {formattedDuration ? <span>{formattedDuration}</span> : null}
              </span>
            ) : null}
            {description ? <span className="episode__summary">{description}</span> : null}
          </span>
        </button>
      </li>
    );
  },
  // Enhanced comparison function for better memoization
  (prevProps: IResultProps, nextProps: IResultProps): boolean => {
    // Check if it's the same episode by GUID (most efficient)
    if (prevProps.result.guid !== nextProps.result.guid) {
      return false;
    }

    // Check if click handler reference changed (optimization for function identity)
    if (prevProps.onClick !== nextProps.onClick) {
      return false;
    }

    if (prevProps.isCurrent !== nextProps.isCurrent) {
      return false;
    }

    // Check critical fields that affect rendering
    const prevResult = prevProps.result;
    const nextResult = nextProps.result;

    return (
      prevResult.title === nextResult.title &&
      prevResult.description === nextResult.description &&
      prevResult.pubDate === nextResult.pubDate &&
      prevResult.enclosure?.duration === nextResult.enclosure?.duration &&
      prevResult.enclosure?.link === nextResult.enclosure?.link
    );
  }
);
