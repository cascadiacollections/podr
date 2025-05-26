import { h, FunctionComponent } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';

/**
 * Format a duration in seconds to HH:MM:SS format
 * @param duration Duration in seconds
 * @returns Formatted duration string
 */
function formatDuration(duration: number): string {
  if (!duration) return '00:00:00';
  
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  
  return [
    hours < 10 ? `0${hours}` : hours,
    minutes < 10 ? `0${minutes}` : minutes,
    seconds < 10 ? `0${seconds}` : seconds
  ].join(':');
}

/**
 * Format an ISO date string to a readable date string
 * @param isoString ISO date string
 * @returns Formatted date string
 */
function formatPubDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString.replace(/-/g, "/"));
    return date.toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

interface IEnclosure {
  duration: number;
  link: string;
}

export interface IFeedItem {
  readonly guid: string;
  title: string;
  description: string;
  pubDate: string;
  enclosure: IEnclosure;
}

export interface IResultProps {
  result: Readonly<IFeedItem>;
  onClick: (feedItem: Readonly<IFeedItem>) => void;
}

/**
 * Result component that displays a podcast episode
 * Using HTML5 semantic elements and Pico's classless approach
 */
export const Result: FunctionComponent<IResultProps> = memo(
  (props: IResultProps) => {
    const { onClick, result } = props;
    const { description, title, pubDate, enclosure } = result;

    // Memoize callback to prevent unnecessary re-renders
    const onClickCallback = useCallback(() => {
      onClick(result);
    }, [result, onClick]);
    
    // Memoize formatted date and duration
    const formattedDate = useMemo(() => formatPubDate(pubDate), [pubDate]);
    const formattedDuration = useMemo(() => formatDuration(enclosure.duration), [enclosure.duration]);

    return (
      <tr
        onClick={onClickCallback}
        onKeyDown={(e) => e.key === 'Enter' && onClickCallback()}
        tabIndex={0}
        role="button"
        aria-label={`Play episode: ${title}`}>
        <td>
          <a href={enclosure.link} aria-label={`Stream or download: ${title}`} dangerouslySetInnerHTML={{ __html: title }} />
        </td>
        <td className="date-column">
          <time dateTime={pubDate}>{formattedDate}</time>
        </td>
        <td className="duration-column">{formattedDuration}</td>
      </tr>
    );
  },
  // Custom comparison function for memo
  (prevProps, nextProps) => {
    return prevProps.result.guid === nextProps.result.guid;
  }
);
