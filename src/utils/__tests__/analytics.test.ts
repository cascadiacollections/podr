import { getAnalyticsProvider, trackEvent } from '../analytics';

/**
 * The shared jest setup installs a `window.gtag` stub, so every case here starts
 * from a page with no analytics loaded and opts into one explicitly.
 */
function clearProviders(): void {
  delete window.gtag;
  delete window.umami;
  delete window.plausible;
  delete window.goatcounter;
}

beforeEach(clearProviders);
afterEach(clearProviders);

describe('trackEvent', () => {
  it('does not throw when analytics is unavailable', () => {
    expect(() => trackEvent('search', { search_term: 'podcasts' })).not.toThrow();
  });

  it('forwards events when analytics is available', () => {
    window.gtag = jest.fn();

    trackEvent('search', { search_term: 'podcasts' });

    expect(window.gtag).toHaveBeenCalledWith('event', 'search', { search_term: 'podcasts' });
  });

  it('forwards events to a self-hosted Umami instance', () => {
    const track = jest.fn();
    window.umami = { track };

    trackEvent('search', { search_term: 'podcasts' });

    expect(track).toHaveBeenCalledWith('search', { search_term: 'podcasts' });
  });

  it('forwards events to a self-hosted Plausible instance', () => {
    window.plausible = jest.fn();

    trackEvent('search', { search_term: 'podcasts' });

    expect(window.plausible).toHaveBeenCalledWith('search', {
      props: { search_term: 'podcasts' },
    });
  });

  it('omits Plausible props when an event carries no parameters', () => {
    window.plausible = jest.fn();

    trackEvent('search');

    expect(window.plausible).toHaveBeenCalledWith('search', undefined);
  });

  it('forwards events to a self-hosted GoatCounter instance', () => {
    const count = jest.fn();
    window.goatcounter = { count };

    trackEvent('search', { search_term: 'podcasts' });

    expect(count).toHaveBeenCalledWith({
      path: 'search',
      title: 'search',
      event: true,
    });
  });

  it('swallows a provider that throws so reporting is never load-bearing', () => {
    window.gtag = jest.fn(() => {
      throw new Error('blocked');
    });

    expect(() => trackEvent('search')).not.toThrow();
  });

  it('prefers gtag when several providers are present', () => {
    window.gtag = jest.fn();
    window.plausible = jest.fn();

    trackEvent('search');

    expect(window.gtag).toHaveBeenCalled();
    expect(window.plausible).not.toHaveBeenCalled();
  });
});

describe('getAnalyticsProvider', () => {
  it('reports none when nothing is configured or loaded', () => {
    expect(getAnalyticsProvider()).toBe('none');
  });

  it('detects the provider the page actually loaded', () => {
    window.umami = { track: jest.fn() };

    expect(getAnalyticsProvider()).toBe('umami');
  });
});
