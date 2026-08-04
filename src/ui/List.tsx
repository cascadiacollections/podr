import { FunctionComponent, h } from "preact";
import { memo, useCallback, useEffect, useMemo, useState } from "preact/compat";
import { IFeedItem } from "./Result";
import { Result } from "./Result";

/**
 * Props for the List component with enhanced type safety
 */
export interface IListProps {
  readonly results: ReadonlyArray<IFeedItem>;
  readonly onClick: (item: IFeedItem) => void;
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
  /** The episode currently loaded in the player, highlighted in the list */
  readonly currentGuid?: string;
}

/**
 * List configuration constants
 */
const LIST_CONFIG = {
  DEFAULT_EMPTY_MESSAGE: 'Pick a podcast above to see its episodes.',
  LOADING_MESSAGE: 'Loading episodes…',
  TABLE_CAPTION: 'Podcast Episodes',
  COLUMNS: {
    EPISODE: 'Episode',
    DATE: 'Date',
    DURATION: 'Duration',
  },
  CSS_CLASSES: {
    TABLE: 'episodes-table',
  },
  /**
   * Rows rendered before the listener asks for more. A feed can carry hundreds of
   * episodes, and building every row up front is the most expensive thing this app
   * does on a low-power device. Off-screen rows are additionally skipped by
   * content-visibility, so this bound is about DOM construction, not paint.
   */
  INITIAL_ROWS: 30,
  ROWS_PER_PAGE: 30,
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
    emptyMessage = LIST_CONFIG.DEFAULT_EMPTY_MESSAGE,
    currentGuid
  }: IListProps) => {
    const [visibleCount, setVisibleCount] = useState<number>(LIST_CONFIG.INITIAL_ROWS);

    // A different podcast starts over at the first page of rows
    useEffect(() => {
      setVisibleCount(LIST_CONFIG.INITIAL_ROWS);
    }, [results]);

    const showMore = useCallback(() => {
      setVisibleCount((count: number) => count + LIST_CONFIG.ROWS_PER_PAGE);
    }, []);

    const visibleResults = useMemo(
      () => (results.length > visibleCount ? results.slice(0, visibleCount) : results),
      [results, visibleCount]
    );

    const hiddenCount = results.length - visibleResults.length;

    // Memoize rendered results for performance when results array is stable
    const renderedResults = useMemo(() => {
      return visibleResults.map((result: IFeedItem) => (
        <Result
          key={result.guid}
          result={result}
          onClick={onClick}
          isCurrent={result.guid === currentGuid}
        />
      ));
    }, [visibleResults, onClick, currentGuid]);

    return (
      <section aria-busy={isLoading ? 'true' : 'false'}>
        <table className={LIST_CONFIG.CSS_CLASSES.TABLE}>
          <caption>{LIST_CONFIG.TABLE_CAPTION}</caption>
          {/* Column headings describe rows, so they stay out of the way when there are none */}
          {results.length > 0 ? (
            <thead>
              <tr>
                <th scope="col">{LIST_CONFIG.COLUMNS.EPISODE}</th>
                <th scope="col" className="date-column">{LIST_CONFIG.COLUMNS.DATE}</th>
                <th scope="col" className="duration-column">{LIST_CONFIG.COLUMNS.DURATION}</th>
              </tr>
            </thead>
          ) : null}
          <tbody>
            {results.length > 0 ? (
              renderedResults
            ) : (
              <tr className="empty-row">
                <td colSpan={3}>
                  {isLoading ? (
                    <div className="loading-container">
                      <span className="loading-spinner" aria-hidden="true" />
                      <span>{LIST_CONFIG.LOADING_MESSAGE}</span>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p className="empty-message">{emptyMessage}</p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {hiddenCount > 0 ? (
          <div className="episodes-footer">
            <button type="button" className="button-quiet" onClick={showMore}>
              Show {Math.min(hiddenCount, LIST_CONFIG.ROWS_PER_PAGE)} more
              <span className="visually-hidden"> episodes, {hiddenCount} remaining</span>
            </button>
          </div>
        ) : null}
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

    if (prevProps.currentGuid !== nextProps.currentGuid) {
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
