import { h, JSX } from 'preact';

/**
 * Links every page carries. A plain link rather than client-side navigation, so
 * crawlers and visitors without JavaScript reach the privacy policy too.
 */
export const SiteFooter = (): JSX.Element => (
  <footer className="app-footer">
    <a href="/privacy">Privacy policy</a>
    <a href="https://github.com/cascadiacollections/podr">Source code</a>
  </footer>
);
