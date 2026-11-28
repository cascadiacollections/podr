import fs from 'fs';
import path from 'path';
import { h } from 'preact';
import { render, screen } from '@testing-library/preact';

import { IFeed } from '../../utils/AppContext';
import { BrowseView } from '../BrowseView';
import { HOME_LEDE } from '../homeCopy';
import { NOT_FOUND_DOCUMENT_TITLE, NOT_FOUND_MESSAGE } from '../NotFound';
import { PRIVACY_DOCUMENT_TITLE, PrivacyPolicy } from '../PrivacyPolicy';

const root = path.resolve(__dirname, '../../..');
const NO_FEEDS: ReadonlyArray<IFeed> = [];
const NO_FAVORITES: ReadonlySet<string> = new Set();

/** Words in order, so newlines between tags do not count as different copy. */
function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\s+([,.;])/g, '$1').trim();
}

function compactText(value: string): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function links(scope: ParentNode): string[] {
  return [...scope.querySelectorAll('a')].map((anchor) => {
    return `${normalizeText(anchor.textContent || '')} -> ${anchor.getAttribute('href')}`;
  });
}

describe('prerendered copy', () => {
  test('uses one homepage sentence in the app and in the prerendered document', () => {
    render(
      <BrowseView
        feeds={NO_FEEDS}
        topFeeds={NO_FEEDS}
        searchResults={NO_FEEDS}
        query=""
        favoriteUrls={NO_FAVORITES}
        lastOpenedUrl=""
        onOpen={jest.fn()}
        onToggleFavorite={jest.fn()}
      />
    );

    expect(screen.getByText(HOME_LEDE)).toBeInTheDocument();
    expect(fs.readFileSync(path.join(root, 'assets/prerender/home.html'), 'utf8')).toContain(HOME_LEDE);
  });

  test('the privacy document matches the page the app renders', () => {
    const { container } = render(<PrivacyPolicy />);
    const html = fs.readFileSync(path.join(root, 'assets/prerender/privacy.html'), 'utf8');
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const rendered = container.querySelector('main');
    const prerendered = parsed.querySelector('main');

    expect(rendered).not.toBeNull();
    expect(prerendered).not.toBeNull();
    expect(compactText(prerendered?.textContent || '')).toBe(compactText(rendered?.textContent || ''));
    expect(links(prerendered as Element)).toEqual(links(rendered as Element));
    expect(document.title).toBe(PRIVACY_DOCUMENT_TITLE);
  });

  test('the 404 document uses the same heading and message as the app', () => {
    const html = fs.readFileSync(path.join(root, 'assets/prerender/not-found.html'), 'utf8');

    expect(html).toContain('<h1>Page not found</h1>');
    expect(html).toContain(NOT_FOUND_MESSAGE);
    expect(NOT_FOUND_DOCUMENT_TITLE).toBe('Page not found · Podr');
  });
});
