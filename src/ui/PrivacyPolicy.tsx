import { h, JSX } from 'preact';
import { useEffect } from 'preact/hooks';

import { SiteFooter } from './SiteFooter';

export const PRIVACY_PATH = '/privacy';

const CONTACT_EMAIL = 'kevin@cascadiacollections.com';
const MEASUREMENT_ID = 'G-19Z3SPSJPY';
const LAST_UPDATED = 'October 25, 2026';

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
          Your library, recent searches and playback state are stored in your browser&apos;s
          local storage. They are not sent to us, and clearing your site data removes them.
        </p>

        <h2>Google Analytics</h2>
        <p>
          We use Google Analytics (measurement ID {MEASUREMENT_ID}) to understand how the site
          is used, such as which pages are visited and roughly where visitors come from. Google
          Analytics uses cookies and similar technologies, and Google processes this data under
          its own <a href="https://policies.google.com/privacy">privacy policy</a>. You can see{' '}
          <a href="https://policies.google.com/technologies/partner-sites">
            how Google uses information from sites that use its services
          </a>
          , or install the{' '}
          <a href="https://tools.google.com/dlpage/gaoptout">Google Analytics opt-out add-on</a>.
        </p>

        <h2>Advertising</h2>
        <p>
          Podr shows ads served by Google AdSense. Google and its partners use cookies to serve
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
            Where the law requires it, such as in the EEA, the UK and Switzerland, we ask for your
            consent before analytics or advertising cookies are set. Until you choose, they stay
            off, and you can change your choice from the privacy prompt at any time.
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
