import { h } from 'preact';
import { render, screen } from '@testing-library/preact';
import { PrivacyPolicy } from '../PrivacyPolicy';

describe('PrivacyPolicy', () => {
  test('covers what AdSense requires of a privacy policy', () => {
    render(<PrivacyPolicy />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    expect(screen.getByText(/G-19Z3SPSJPY/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Advertising' })).toBeInTheDocument();
    expect(screen.getByText(/Third-party vendors and ad networks/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Google Ads Settings' })).toHaveAttribute(
      'href',
      'https://adssettings.google.com'
    );
    expect(screen.getByRole('link', { name: 'kevin@cascadiacollections.com' })).toHaveAttribute(
      'href',
      'mailto:kevin@cascadiacollections.com'
    );
  });

  test('names the page in the tab title', () => {
    render(<PrivacyPolicy />);

    expect(document.title).toBe('Privacy policy · Podr');
  });

  test('links back to the privacy policy from its own footer', () => {
    render(<PrivacyPolicy />);

    expect(screen.getByRole('contentinfo')).toContainElement(
      screen.getByRole('link', { name: 'Privacy policy' })
    );
  });
});
