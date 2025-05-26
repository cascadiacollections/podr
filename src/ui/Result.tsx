import { h, FunctionComponent } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';

/**
 * Format a duration in seconds to HH:MM:SS format
 * @param duration Duration in seconds
 * @returns Formatted duration string
 */
function formatDuration(duration: number): string {
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
  return new Date(isoString.replace(/-/g, "/")).toDateString();
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
 * Memoized to prevent unnecessary re-renders
 */
export const Result: FunctionComponent<IResultProps> = memo(
  (props: IResultProps) => {
    const { onClick, result } = props;
    const { description, title } = result;

    // Memoize callback to prevent unnecessary re-renders
    const onClickCallback = useCallback(() => {
      onClick(result);
    }, [result, onClick]);
    
    // Memoize formatted date and duration
    const formattedDate = useMemo(() => formatPubDate(result.pubDate), [result.pubDate]);
    const formattedDuration = useMemo(() => formatDuration(result.enclosure.duration), [result.enclosure.duration]);

    return (
      <tr
        className='result'
        onClick={onClickCallback}
        onKeyDown={(e) => e.key === 'Enter' && onClickCallback()}
        tabIndex={0}
        role="button"
        aria-label={`Play episode: ${title}`}>
        <td>
          <a href={result.enclosure.link} aria-label={`Stream or download: ${title}`}>
            <div className='title' dangerouslySetInnerHTML={{ __html: title }} />
          </a>
          <div className='description' dangerouslySetInnerHTML={{ __html: description }} />
        </td>
        <td className='pubDate'>{formattedDate}</td>
        <td className='duration'>{formattedDuration}</td>
      </tr>
    );
  },
  // Custom comparison function for memo
  (prevProps, nextProps) => {
    return prevProps.result.guid === nextProps.result.guid;
  }
);
