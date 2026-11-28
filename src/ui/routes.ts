import { PRIVACY_PATH } from './PrivacyPolicy';

export type IDocumentPage = 'home' | 'privacy' | 'not-found';

/**
 * Which document a URL path is.
 *
 * Podcast links are `/?feed=` on `/`, so the pathname stays `/` and they are
 * the home document. `/privacy` with or without a trailing slash is the
 * policy. Every other path is a 404. The offline fallback in assets/sw.js
 * uses the same two paths.
 */
export function resolvePage(pathname: string): IDocumentPage {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '/index.html') {
    return 'home';
  }

  if (path === PRIVACY_PATH) {
    return 'privacy';
  }

  return 'not-found';
}
