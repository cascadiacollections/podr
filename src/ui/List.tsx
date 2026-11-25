import { FunctionComponent, h } from "preact";
import { memo } from "preact/compat";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
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
  /**
   * Identity of the list, usually the podcast's feed URL. Pagination resets
   * when this changes, not when a refresh replaces the episode array.
   */
  readonly resetKey?: string;
}

/**
 * List configuration constants
 */
const LIST_CONFIG = {
  DEFAULT_EMPTY_MESSAGE: 'This podcast has no episodes yet.',
  LOADING_MESSAGE: 'Loading episodes…',
  LIST_LABEL: 'Episodes',
  CSS_CLASSES: {
    LIST: 'episode-list',
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
 * The episodes of one podcast, newest first, as an ordered list. Each entry
 * carries a summary, which a table's fixed columns had no room for.
 */
export const List: FunctionComponent<IListProps> = memo(
  ({
    results,
    onClick,
    isLoading = false,
    emptyMessage = LIST_CONFIG.DEFAULT_EMPTY_MESSAGE,
    currentGuid,
    resetKey
  }: IListProps) => {
    const [visibleCount, setVisibleCount] = useState<number>(LIST_CONFIG.INITIAL_ROWS);

    // A different podcast starts over at the first page of rows. A refresh of
    // the same podcast keeps the listener's place.
    useEffect(() => {
      setVisibleCount(LIST_CONFIG.INITIAL_ROWS);
    }, [resetKey]);

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
      <div aria-busy={isLoading ? 'true' : 'false'}>
        {results.length > 0 ? (
          <ol className={LIST_CONFIG.CSS_CLASSES.LIST} aria-label={LIST_CONFIG.LIST_LABEL}>
            {renderedResults}
          </ol>
        ) : isLoading ? (
          <div className="loading-container">
            <span className="loading-spinner" aria-hidden="true" />
            <span>{LIST_CONFIG.LOADING_MESSAGE}</span>
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-message">{emptyMessage}</p>
          </div>
        )}
        {hiddenCount > 0 ? (
          <div className="episodes-footer">
            <button type="button" className="button-quiet" onClick={showMore}>
              Show {Math.min(hiddenCount, LIST_CONFIG.ROWS_PER_PAGE)} more
              <span className="visually-hidden"> episodes, {hiddenCount} remaining</span>
            </button>
          </div>
        ) : null}
      </div>
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

    if (prevProps.resetKey !== nextProps.resetKey) {
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

    // Same length is not the same list: a refresh keeps guids and replaces titles
    for (let i = 0; i < prevProps.results.length; i++) {
      const prev = prevProps.results[i];
      const next = nextProps.results[i];

      if (
        prev.guid !== next.guid ||
        prev.title !== next.title ||
        prev.description !== next.description ||
        prev.pubDate !== next.pubDate ||
        prev.enclosure?.link !== next.enclosure?.link ||
        // Duration is numeric. Object.is matches Preact 11 hook deps: NaN equals NaN, and -0 does not equal 0.
        !Object.is(prev.enclosure?.duration, next.enclosure?.duration)
      ) {
        return false;
      }
    }

    return true;
  }
);
