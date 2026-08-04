import { h, FunctionComponent } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';

/**
 * Duration formatting configuration
 */
const DURATION_CONFIG = {
  HOURS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_MINUTE: 60,
  PAD_LENGTH: 2,
  PAD_CHAR: '0',
  SEPARATOR: ':',
  FALLBACK_DURATION: '00:00:00',
} as const;

/**
 * Date formatting options for consistent display
 */
const DATE_FORMAT_OPTIONS = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
} as const satisfies Intl.DateTimeFormatOptions;

/**
 * Format a duration in seconds to HH:MM:SS format with better performance
 * @param duration - Duration in seconds
 * @returns Formatted duration string
 */
function formatDuration(duration: number): string {
  if (!duration || !Number.isFinite(duration) || duration < 0) {
    return DURATION_CONFIG.FALLBACK_DURATION;
  }

  const hours = Math.floor(duration / (DURATION_CONFIG.MINUTES_PER_HOUR * DURATION_CONFIG.SECONDS_PER_MINUTE));
  const minutes = Math.floor((duration % (DURATION_CONFIG.MINUTES_PER_HOUR * DURATION_CONFIG.SECONDS_PER_MINUTE)) / DURATION_CONFIG.SECONDS_PER_MINUTE);
  const seconds = Math.floor(duration % DURATION_CONFIG.SECONDS_PER_MINUTE);

  const formatPart = (value: number): string =>
    value.toString().padStart(DURATION_CONFIG.PAD_LENGTH, DURATION_CONFIG.PAD_CHAR);

  return [
    formatPart(hours),
    formatPart(minutes),
    formatPart(seconds),
  ].join(DURATION_CONFIG.SEPARATOR);
}

/**
 * Format an ISO date string to a readable date string with caching
 * @param isoString - ISO date string
 * @returns Formatted date string
 */
function formatPubDate(isoString: string): string {
  if (!isoString || typeof isoString !== 'string') {
    return 'Unknown date';
  }

  try {
    const date = new Date(isoString);
    if (!Number.isFinite(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
  } catch {
    return 'Invalid date';
  }
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
 * Result component that displays a podcast episode with optimized rendering
 *
 * The title is the row's single interactive element: it is a real button, so it
 * carries keyboard activation and focus for free. The row itself is no longer a
 * button wrapping a link - nesting interactive elements left keyboard and screen
 * reader users with two overlapping targets and one unreachable action.
 */
export const Result: FunctionComponent<IResultProps> = memo(
  ({ onClick, result, isCurrent = false }: IResultProps) => {
    const { title, pubDate, enclosure } = result;

    // Feeds routinely omit the enclosure on trailer and note-only entries
    const isPlayable = Boolean(enclosure?.link);
    const enclosureDuration = enclosure?.duration ?? 0;

    // Memoize callback to prevent unnecessary re-renders
    const handleClick = useCallback(() => {
      onClick(result);
    }, [result, onClick]);

    // Memoize formatted values for better performance
    const formattedDate = useMemo(() => formatPubDate(pubDate), [pubDate]);
    const formattedDuration = useMemo(() => formatDuration(enclosureDuration), [enclosureDuration]);

    // Memoize aria label for accessibility
    const ariaLabel = useMemo(
      () => (isPlayable ? `Play episode: ${title}` : `${title} (no audio available)`),
      [title, isPlayable]
    );

    return (
      <tr className={isCurrent ? 'episode-row episode-row--current' : 'episode-row'}>
        <td className="episode-title-cell">
          <button
            type="button"
            className="episode-title"
            onClick={handleClick}
            disabled={!isPlayable}
            aria-label={ariaLabel}
            aria-current={isCurrent ? 'true' : undefined}
          >
            {title}
          </button>
        </td>
        <td className="date-column">
          <time dateTime={pubDate}>{formattedDate}</time>
        </td>
        <td className="duration-column">{formattedDuration}</td>
      </tr>
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
      prevResult.pubDate === nextResult.pubDate &&
      prevResult.enclosure?.duration === nextResult.enclosure?.duration &&
      prevResult.enclosure?.link === nextResult.enclosure?.link
    );
  }
);
