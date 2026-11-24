import { Signal } from '@preact/signals';
import { useCallback } from 'preact/hooks';

import { trackEvent } from '../utils/analytics';
import { EMPTY_ARRAY, IFeed } from '../utils/AppContext';
import { EMPTY_FEED_DETAILS, parseFeedDetails, parseFeedRedirect, parseFeedResponse } from '../utils/feed';
import { getFeedUrl, readErrorMessage, readErrorName, resolveFeed } from '../utils/helpers';
import { getHistoryFeed, getPageUrl, IPodcastHistoryState, IResultsFeed, withFeedDetails, withResolvedMetadata } from './appModel';
import { IFeedItem } from './Result';

const FEED_ERROR_MESSAGE = 'Could not load episodes for this podcast. Please try again.';

/**
 * A feed failure and the underlying cause, shown so a failure can be reported
 * without a devtools console
 */
export interface IFeedError {
  readonly message: string;
  readonly reason: string;
}

export interface IPodcastFeedState {
  readonly favorited: Signal<ReadonlySet<IFeed>>;
  readonly results: Signal<ReadonlyArray<IFeedItem>>;
  readonly resultsFeed: Signal<IResultsFeed>;
  readonly isFeedLoading: Signal<boolean>;
  readonly feedError: Signal<IFeedError | null>;
  readonly selectedFeed: Signal<IFeed | null>;
}

/**
 * Loads one podcast's episodes and repairs a saved entry when the feed can
 * supply a better name, artwork, or address.
 */
export const usePodcastFeed = (
  state: IPodcastFeedState,
  feedRequestId: { current: number },
  feedAbortRef: { current: AbortController | null }
): { tryFetchFeed: (feed: IFeed) => Promise<void> } => {
  const { favorited, results, resultsFeed, isFeedLoading, feedError, selectedFeed } = state;

  const applyRepairedFeed = useCallback((repaired: IFeed, previousUrl: string = repaired.feedUrl): void => {
    selectedFeed.value = repaired;

    const historyState = window.history.state as IPodcastHistoryState | null;
    const hasMoved = previousUrl !== repaired.feedUrl;

    if (getHistoryFeed(historyState)?.feedUrl === previousUrl) {
      window.history.replaceState(
        { ...historyState, podrFeed: repaired },
        '',
        hasMoved ? getPageUrl(repaired.feedUrl) : undefined
      );
    }

    // The library may already hold the new address too; it keeps one entry
    let replaced = false;

    favorited.value = new Set(
      Array.from(favorited.value).flatMap((candidate: IFeed) => {
        if (candidate.feedUrl !== previousUrl && candidate.feedUrl !== repaired.feedUrl) {
          return [candidate];
        }

        if (replaced) {
          return [];
        }

        replaced = true;
        return [repaired];
      })
    );
  }, [favorited, selectedFeed]);

  const tryFetchFeed = useCallback(async (feed: IFeed): Promise<void> => {
    if (!feed.feedUrl) {
      return;
    }

    const requestId = ++feedRequestId.current;
    const isCurrentRequest = (): boolean => requestId === feedRequestId.current;

    // Stop the previous feed request from spending bandwidth nobody is waiting on
    feedAbortRef.current?.abort();
    const controller = new AbortController();
    feedAbortRef.current = controller;

    selectedFeed.value = feed;
    isFeedLoading.value = true;
    feedError.value = null;

    // Episodes kept from another podcast must not appear under this one's name.
    // Those of the same podcast stay, so a reopen - or an offline one - is instant.
    if (resultsFeed.value.feedUrl !== feed.feedUrl) {
      results.value = EMPTY_ARRAY;
      resultsFeed.value = { ...EMPTY_FEED_DETAILS, feedUrl: feed.feedUrl };
    }

    try {
      const resolved = await resolveFeed(feed.feedUrl);

      // Resolution is the only place a podcast saved by an older build can learn
      // its own name and artwork
      const repaired = withResolvedMetadata(feed, resolved);

      if (repaired !== feed) {
        applyRepairedFeed(repaired);
      }

      const response = await fetch(getFeedUrl(resolved.feedUrl), { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Throws when the response is not a feed, so a wrong-but-successful
      // response surfaces as an error rather than an empty episode list
      const payload: unknown = await response.json();
      const feedResults = parseFeedResponse(payload);

      // A newer request has since started; its results win
      if (!isCurrentRequest()) {
        return;
      }

      const details = parseFeedDetails(payload);
      // A feed that permanently moved is kept under its new address from now on.
      // One saved as an Apple Podcasts page keeps that; it is resolved afresh each time.
      const movedTo = resolved.feedUrl === feed.feedUrl ? parseFeedRedirect(payload) : '';
      const feedUrl = movedTo || feed.feedUrl;

      results.value = feedResults;
      resultsFeed.value = { ...details, feedUrl };

      // A podcast opened from a link learns its name and artwork here
      const current = selectedFeed.value;

      if (current?.feedUrl === feed.feedUrl) {
        const completed = withFeedDetails(
          feedUrl === current.feedUrl ? current : { ...current, feedUrl },
          details
        );

        if (completed !== current) {
          applyRepairedFeed(completed, feed.feedUrl);
        }
      }
    } catch (err: unknown) {
      if (readErrorName(err) === 'AbortError') {
        return;
      }

      const reason = readErrorMessage(err);

      // Leave any previously loaded episodes in place rather than clearing them
      if (isCurrentRequest()) {
        feedError.value = { message: FEED_ERROR_MESSAGE, reason };
      }

      trackEvent('exception', {
        description: `feed_fetch_${feed.feedUrl}_${reason}`,
        fatal: false
      });
    } finally {
      if (isCurrentRequest()) {
        isFeedLoading.value = false;
      }
    }
  }, [applyRepairedFeed, feedAbortRef, feedError, feedRequestId, isFeedLoading, results, resultsFeed, selectedFeed]);

  return { tryFetchFeed };
};
