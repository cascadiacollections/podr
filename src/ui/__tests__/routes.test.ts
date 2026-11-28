import { resolvePage } from '../routes';

describe('resolvePage', () => {
  it('keeps the home page and a shared podcast link on the home document', () => {
    expect(resolvePage('/')).toBe('home');
    expect(resolvePage('/index.html')).toBe('home');

    const pathname = new URL(
      'https://podrapp.com/?feed=https%3A%2F%2Fexample.com%2Fshow.rss'
    ).pathname;

    expect(pathname).toBe('/');
    expect(resolvePage(pathname)).toBe('home');
  });

  it('accepts the privacy policy with or without a trailing slash', () => {
    expect(resolvePage('/privacy')).toBe('privacy');
    expect(resolvePage('/privacy/')).toBe('privacy');
    expect(resolvePage('/privacy//')).toBe('privacy');
  });

  it('treats every other path as a missing page', () => {
    expect(resolvePage('/this-page-should-not-exist')).toBe('not-found');
    expect(resolvePage('/privacy/extra')).toBe('not-found');
    expect(resolvePage('/Privacy')).toBe('not-found');
    expect(resolvePage('/feed')).toBe('not-found');
  });
});
