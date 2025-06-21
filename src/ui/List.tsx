import { FunctionComponent, h } from "preact";
import { memo, useMemo } from "preact/compat";
import { IFeedItem } from "./Result";
import { Result } from "./Result";
import { useClassNamesSimple } from "../utils/hooks";

/**
 * Props for the List component with enhanced type safety
 */
export interface IListProps {
  readonly results: ReadonlyArray<IFeedItem>;
  readonly onClick: (item: IFeedItem) => void;
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
}

/**
 * List configuration constants
 */
const LIST_CONFIG = {
  DEFAULT_EMPTY_MESSAGE: 'No episodes available. Search or select a podcast to see episodes.',
  LOADING_MESSAGE: 'Loading episodes...',
  TABLE_CAPTION: 'Podcast Episodes',
  COLUMNS: {
    EPISODE: 'Episode',
    DATE: 'Date', 
    DURATION: 'Duration',
  },
  CSS_CLASSES: {
    CONTAINER: 'episodes-container',
    TABLE: 'episodes-table',
    LOADING: 'loading',
    EMPTY: 'empty-state',
  },
} as const;

/**
 * List component that renders a table of podcast episodes with performance optimizations
 * Uses semantic HTML and memoization for optimal rendering performance
 */
export const List: FunctionComponent<IListProps> = memo(
  ({ 
    results, 
    onClick, 
    isLoading = false, 
    emptyMessage = LIST_CONFIG.DEFAULT_EMPTY_MESSAGE 
  }: IListProps) => {
    
    // Memoize the empty state message based on loading status
    const emptyStateMessage = useMemo(() => {
      return isLoading ? LIST_CONFIG.LOADING_MESSAGE : emptyMessage;
    }, [isLoading, emptyMessage]);
    
    // Memoize container CSS classes using the new performant hook
    const containerClassName = useClassNamesSimple(
      LIST_CONFIG.CSS_CLASSES.CONTAINER,
      {
        [LIST_CONFIG.CSS_CLASSES.LOADING]: isLoading,
        [LIST_CONFIG.CSS_CLASSES.EMPTY]: results.length === 0
      }
    );
    
    // Memoize rendered results for performance when results array is stable
    const renderedResults = useMemo(() => {
      return results.map((result: IFeedItem) => (
        <Result
          key={result.guid}
          result={result}
          onClick={onClick}
        />
      ));
    }, [results, onClick]);

    return (
      <section className={containerClassName}>
        <table className={LIST_CONFIG.CSS_CLASSES.TABLE}>
          <caption>{LIST_CONFIG.TABLE_CAPTION}</caption>
          <thead>
            <tr>
              <th scope="col">{LIST_CONFIG.COLUMNS.EPISODE}</th>
              <th scope="col" className="date-column">{LIST_CONFIG.COLUMNS.DATE}</th>
              <th scope="col" className="duration-column">{LIST_CONFIG.COLUMNS.DURATION}</th>
            </tr>
          </thead>
          <tbody>
            {results.length > 0 ? (
              renderedResults
            ) : (
              <tr className="empty-row">
                <td colSpan={3} className="empty-cell">
                  {isLoading ? (
                    <div className="loading-container">
                      <span className="loading-spinner" aria-hidden="true" />
                      <span>{emptyStateMessage}</span>
                    </div>
                  ) : (
                    <div className="empty-message">
                      {emptyStateMessage}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    );
  },
  // Enhanced comparison function for better memoization performance
  (prevProps: IListProps, nextProps: IListProps): boolean => {
    // Quick checks for obvious changes
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    
    if (prevProps.emptyMessage !== nextProps.emptyMessage) {
      return false;
    }
    
    if (prevProps.onClick !== nextProps.onClick) {
      return false;
    }
    
    // Check results array length first (most common change)
    if (prevProps.results.length !== nextProps.results.length) {
      return false;
    }
    
    // If arrays are the same reference, no need to deep compare
    if (prevProps.results === nextProps.results) {
      return true;
    }
    
    // Deep comparison only if needed (arrays are different references but same length)
    // Compare GUIDs for efficient comparison
    for (let i = 0; i < prevProps.results.length; i++) {
      if (prevProps.results[i].guid !== nextProps.results[i].guid) {
        return false;
      }
    }
    
    return true;
  }
);
