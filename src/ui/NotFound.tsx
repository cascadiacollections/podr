import { h, JSX } from 'preact';
import { useEffect } from 'preact/hooks';

import { SiteFooter } from './SiteFooter';

export const NOT_FOUND_HEADING = 'Page not found';
export const NOT_FOUND_DOCUMENT_TITLE = 'Page not found · Podr';
export const NOT_FOUND_MESSAGE =
  'That page is not on Podr. Search podcasts and listen from the home page.';

/**
 * Unknown paths. The server answers these with 404.html; this is what the
 * app paints if that document's scripts run, and what an offline visit shows
 * when the only cached document is the home shell.
 */
export const NotFound = (): JSX.Element => {
  useEffect(() => {
    document.title = NOT_FOUND_DOCUMENT_TITLE;
  }, []);

  return (
    <div>
      <header className="app-bar">
        <p className="app-brand-heading">
          <a className="app-brand" href="/">
            <span className="app-brand__mark" aria-hidden="true">🎧</span>
            <span>Podr</span>
          </a>
        </p>
      </header>

      <main className="app-main legal">
        <h1>{NOT_FOUND_HEADING}</h1>
        <p>{NOT_FOUND_MESSAGE}</p>
        <p>
          <a href="/">Back to the home page</a>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
};
