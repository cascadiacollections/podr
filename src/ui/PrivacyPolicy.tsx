import { h, JSX } from 'preact';
import { useEffect } from 'preact/hooks';

import { SiteFooter } from './SiteFooter';

export const PRIVACY_PATH = '/privacy';

const CONTACT_EMAIL = 'kevin@cascadiacollections.com';
const MEASUREMENT_ID = 'G-19Z3SPSJPY';
const LAST_UPDATED = 'November 13, 2026';

/**
 * The privacy policy for podrapp.com. AdSense requires one that names the
 * cookies Google and its ad vendors set and how a visitor opts out.
 */
export const PrivacyPolicy = (): JSX.Element => {
  useEffect(() => {
    document.title = 'Privacy policy · Podr';
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
        <h1>Privacy policy</h1>
        <p className="legal__updated">Last updated {LAST_UPDATED}</p>

        <p>
          Podr (podrapp.com) is an open source podcast player. This page explains what data
          the site and the services it uses collect, and the choices you have.
        </p>

        <h2>What stays on your device</h2>
        <p>
          Your favorite podcasts and the episodes you last opened are stored in your
          browser&apos;s local storage. We never receive that list, and clearing your site data
          removes it.
        </p>

        <h2>Search and podcast lookups</h2>
        <p>
          To find podcasts and load their episodes, the site sends your search text, and the
          address of each podcast feed you open, to the Podr API, which runs on Cloudflare
          Workers. The API looks podcasts up through Apple&apos;s iTunes Search API and the
          podcast&apos;s own feed. Like any web server it sees your IP address, which it uses to
          rate-limit requests, and Cloudflare keeps request logs, including the requested
          address, for a limited time. We do not use this to build a profile of you. Episode
          audio and artwork load directly from the podcast&apos;s host and Apple, which see
          your IP address too.
        </p>

        <h2>Google Analytics</h2>
        <p>
          We use Google Analytics (measurement ID {MEASUREMENT_ID}) to understand how the site
          is used: which pages are visited, roughly where visitors come from, and events such
          as when a search is made (but not what you searched for), which episodes are played,
          which podcasts are added to or removed from favorites, and errors. Google Analytics
          uses cookies and similar technologies, and Google processes this data under its own{' '}
          <a href="https://policies.google.com/privacy">privacy policy</a>. Where analytics
          cookies are off because you have not consented, Google may still receive these
          events without cookies or identifiers. You can see{' '}
          <a href="https://policies.google.com/technologies/partner-sites">
            how Google uses information from sites that use its services
          </a>
          , or install the{' '}
          <a href="https://tools.google.com/dlpage/gaoptout">Google Analytics opt-out add-on</a>.
        </p>

        <h2>Advertising</h2>
        <p>
          Podr may show ads served by Google AdSense. Google and its partners use cookies to serve
          ads based on your previous visits to this and other websites. Google&apos;s use of
          advertising cookies, including the DoubleClick cookie, lets it and its partners serve
          ads to you based on those visits.
        </p>
        <p>
          Third-party vendors and ad networks may also serve ads on this site and set their own
          cookies or use web beacons to measure and personalize ads. Their use of that data is
          governed by their own privacy policies. You can learn more about these vendors and opt
          out of some of them at{' '}
          <a href="https://optout.aboutads.info">aboutads.info</a> and{' '}
          <a href="https://www.youronlinechoices.eu">youronlinechoices.eu</a>.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>
            Turn off personalized ads from Google in{' '}
            <a href="https://adssettings.google.com">Google Ads Settings</a>{' '}
            (adssettings.google.com).
          </li>
          <li>
            In the EEA, the UK and Switzerland, analytics and advertising cookies stay off until
            you agree to them in the consent prompt, and you can change your choice later from
            the privacy and cookie settings link that prompt provides. Until the prompt is
            available, those cookies stay off for every visitor.
          </li>
          <li>Block or delete cookies in your browser settings.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
};
