import { h } from 'preact';
import { render } from '@testing-library/preact';
import { formatDuration, formatPubDate, Result, IFeedItem } from '../Result';

describe('Result component', () => {
  const mockFeedItem: IFeedItem = {
    guid: 'test-guid-123',
    title: 'Test Episode Title',
    description: 'This is a test episode description',
    pubDate: '2023-05-15T12:00:00Z',
    enclosure: {
      duration: 3600, // 1 hour
      link: 'https://example.com/episode.mp3'
    }
  };

  test('renders correctly', () => {
    const onClick = jest.fn();
    // Rendered inside a list, since it is a list item
    const { container } = render(
      <ol>
        <Result result={mockFeedItem} onClick={onClick} />
      </ol>
    );
    expect(container).toMatchSnapshot();
  });

  test('renders with empty duration and date', () => {
    const onClick = jest.fn();
    const emptyFeedItem = {
      ...mockFeedItem,
      pubDate: '',
      enclosure: {
        ...mockFeedItem.enclosure,
        duration: 0
      }
    };
    
    const { container } = render(
      <ol>
        <Result result={emptyFeedItem} onClick={onClick} />
      </ol>
    );
    expect(container).toMatchSnapshot();
  });

  test('renders a malicious title as text', () => {
    const { container } = render(
      <ol>
        <Result
            result={{ ...mockFeedItem, title: '<img src=x onerror=alert(1)>' }}
            onClick={jest.fn()}
          />
      </ol>
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  test('names the action and describes it with the date and length', () => {
    const { getByRole } = render(
      <ol>
        <Result result={mockFeedItem} onClick={jest.fn()} />
      </ol>
    );

    const button = getByRole('button', { name: 'Play episode: Test Episode Title' });
    const describedBy = button.getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toContain('1 hr');
  });
});

describe('formatDuration', () => {
  test.each([
    [0, ''],
    [-5, ''],
    [Number.NaN, ''],
    [20, '< 1 min'],
    [42 * 60 + 15, '42 min'],
    [3600, '1 hr'],
    [3600 + 5 * 60, '1 hr 5 min'],
    [2 * 3600 + 59 * 60 + 40, '3 hr']
  ])('formats %p seconds as %p', (seconds: number, expected: string) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('formatPubDate', () => {
  const now = new Date('2026-10-17T12:00:00Z');

  test('leaves out the year for this year\'s episodes', () => {
    expect(formatPubDate('2026-03-04T12:00:00Z', now)).not.toMatch(/2026/);
  });

  test('includes the year for older episodes', () => {
    expect(formatPubDate('2023-03-04T12:00:00Z', now)).toMatch(/2023/);
  });

  test('shows nothing for a missing or invalid date', () => {
    expect(formatPubDate('', now)).toBe('');
    expect(formatPubDate('not a date', now)).toBe('');
  });
});
