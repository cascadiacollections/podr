import { readFileSync } from 'fs';
import { h } from 'preact';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/preact';

import { BLACK_FRIDAY_PROMO } from '../blackFridayPromo';
import { PromoBanner } from '../PromoBanner';

/** Noon Pacific on the Monday inside the window (2026-11-29). */
const INSIDE_WINDOW_MS = Date.parse('2026-11-29T20:00:00Z');
/** The Monday before Black Friday, outside the window. */
const OUTSIDE_WINDOW_MS = Date.parse('2026-11-23T20:00:00Z');

const REAL_TIMERS = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'nextTick',
  'queueMicrotask',
  'performance',
] as const;

const freezeClock = (now: number): void => {
  jest.useFakeTimers({ now, doNotFake: [...REAL_TIMERS] });
};

const promo = () => screen.queryByRole('region', { name: 'Black Friday and Cyber Monday' });

describe('PromoBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/');
    document.cookie = '';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders nothing outside the window, including no storage read', () => {
    freezeClock(OUTSIDE_WINDOW_MS);
    const { container } = render(<PromoBanner />);

    expect(promo()).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  test('shows during the window and hides again after it', () => {
    freezeClock(INSIDE_WINDOW_MS);
    const { unmount } = render(<PromoBanner />);

    expect(promo()).toHaveTextContent(
      'Skip the checkout line. Podr is free, with no account and no ads.'
    );
    expect(promo()).not.toHaveTextContent(/tracking-free/i);
    unmount();

    freezeClock(Date.parse('2026-12-02T08:00:00Z'));
    render(<PromoBanner />);
    expect(promo()).not.toBeInTheDocument();
  });

  test('stays hidden when the visitor already dismissed it', () => {
    localStorage.setItem(BLACK_FRIDAY_PROMO.storageKey, 'true');
    freezeClock(INSIDE_WINDOW_MS);
    render(<PromoBanner />);

    expect(promo()).not.toBeInTheDocument();
  });

  test('previews outside the window with ?promo=bf2026, even after a stored dismissal', () => {
    localStorage.setItem(BLACK_FRIDAY_PROMO.storageKey, 'true');
    freezeClock(OUTSIDE_WINDOW_MS);
    window.history.replaceState(null, '', '/?promo=bf2026');
    render(<PromoBanner />);

    expect(promo()).toBeInTheDocument();
    expect(localStorage.getItem).not.toHaveBeenCalled();
  });

  test('dismissing the preview does not store a dismissal', () => {
    freezeClock(OUTSIDE_WINDOW_MS);
    window.history.replaceState(null, '', '/?promo=bf2026');
    const { unmount } = render(<PromoBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss promotion' }));

    expect(promo()).not.toBeInTheDocument();
    expect(localStorage.getItem(BLACK_FRIDAY_PROMO.storageKey)).toBeNull();
    expect(document.cookie).toBe('');
    unmount();

    render(<PromoBanner />);
    expect(promo()).toBeInTheDocument();
  });

  test('dismisses from the button and from Escape, without cookies or analytics', () => {
    freezeClock(INSIDE_WINDOW_MS);
    const gtag = window.gtag as jest.Mock;
    render(<PromoBanner />);

    const button = screen.getByRole('button', { name: 'Dismiss promotion' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toHaveAttribute('tabindex', '-1');

    fireEvent.click(button);

    expect(promo()).not.toBeInTheDocument();
    expect(localStorage.getItem(BLACK_FRIDAY_PROMO.storageKey)).toBe('true');
    expect(document.cookie).toBe('');
    expect(gtag).not.toHaveBeenCalled();
    expect(document.querySelector('script')).toBeNull();
  });

  test('Escape dismisses the banner while focus is on it', () => {
    freezeClock(INSIDE_WINDOW_MS);
    render(<PromoBanner />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Dismiss promotion' }), { key: 'Escape' });

    expect(promo()).not.toBeInTheDocument();
    expect(localStorage.getItem(BLACK_FRIDAY_PROMO.storageKey)).toBe('true');
  });

  test('ignores keys other than Escape', () => {
    freezeClock(INSIDE_WINDOW_MS);
    render(<PromoBanner />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Dismiss promotion' }), { key: 'Enter' });

    expect(promo()).toBeInTheDocument();
    expect(localStorage.getItem(BLACK_FRIDAY_PROMO.storageKey)).toBeNull();
  });

  test('does not animate, and drops motion when reduced motion is requested', () => {
    const scss = readFileSync(join(process.cwd(), 'src/app.scss'), 'utf8');
    const bannerRule = scss.slice(scss.indexOf('.promo-banner {'), scss.indexOf('.promo-banner__copy'));

    expect(bannerRule).not.toMatch(/animation\s*:/);

    const reduced = scss.slice(
      scss.indexOf('@media (prefers-reduced-motion: reduce) {\n  .promo-banner,'),
      scss.indexOf('/* ---------------------------------------------------------------- search */')
    );

    expect(reduced).toContain('.promo-banner__dismiss');
    expect(reduced).toContain('animation: none');
    expect(reduced).toContain('transition: none');
  });
});
