import { trackEvent } from '../analytics';

describe('trackEvent', () => {
  afterEach(() => {
    delete window.gtag;
  });

  it('does not throw when analytics is unavailable', () => {
    expect(() => trackEvent('search', { search_term: 'podcasts' })).not.toThrow();
  });

  it('forwards events when analytics is available', () => {
    window.gtag = jest.fn();

    trackEvent('search', { search_term: 'podcasts' });

    expect(window.gtag).toHaveBeenCalledWith('event', 'search', { search_term: 'podcasts' });
  });
});
