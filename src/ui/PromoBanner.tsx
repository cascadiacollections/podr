import { h, JSX, TargetedKeyboardEvent } from 'preact';
import { useState } from 'preact/hooks';

import {
  dismissBlackFridayPromo,
  isBlackFridayPromoDismissed,
  isBlackFridayPromoPreview,
  isWithinBlackFridayPromo,
} from './blackFridayPromo';

/**
 * A small Black Friday / Cyber Monday note above the library.
 *
 * Renders nothing outside the window (and nothing after dismissal), so the
 * page keeps today's layout for everyone else. `?promo=bf2026` previews it.
 */
export function PromoBanner(): JSX.Element | null {
  const [dismissed, setDismissed] = useState(false);
  const preview = isBlackFridayPromoPreview(window.location.search);
  const inWindow = isWithinBlackFridayPromo(new Date());
  // The preview link ignores a stored dismissal. Outside the window nothing
  // reads storage, so the page does not touch localStorage at all.
  const hiddenByStorage = !preview && inWindow && isBlackFridayPromoDismissed();
  const visible = !dismissed && (preview || inWindow) && !hiddenByStorage;

  const dismiss = (): void => {
    // A preview before the window starts must not burn the real dismissal.
    if (inWindow) {
      dismissBlackFridayPromo();
    }
    setDismissed(true);
    // The control is about to unmount; leave the keyboard on the search field.
    document.querySelector<HTMLElement>('input[type="search"]')?.focus();
  };

  const onKeyDown = (event: TargetedKeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <aside
      className="promo-banner"
      role="region"
      aria-label="Black Friday and Cyber Monday"
      onKeyDown={onKeyDown}
    >
      <p className="promo-banner__copy">
        <strong className="promo-banner__lead">Skip the checkout line.</strong>{' '}
        Podr is free, with no account and no ads.
      </p>
      <button
        type="button"
        className="promo-banner__dismiss"
        onClick={dismiss}
        aria-label="Dismiss promotion"
      >
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
