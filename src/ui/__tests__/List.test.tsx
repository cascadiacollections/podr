import { h } from 'preact';
import { fireEvent, render } from '@testing-library/preact';
import { List } from '../List';
import { IFeedItem } from '../Result';

// Mock the Result component to avoid rendering issues in tests
jest.mock('../Result', () => ({
  Result: ({ result, onClick }: { result: IFeedItem; onClick: () => void }) => (
    <li data-testid="mocked-result">
      {result.title} {result.pubDate} {result.enclosure.duration}
    </li>
  ),
  // Re-export IFeedItem interface
  ...jest.requireActual('../Result')
}));

describe('List component', () => {
  const mockResults: IFeedItem[] = [
    {
      guid: 'test-guid-1',
      title: 'Test Episode 1',
      description: 'Description 1',
      pubDate: '2023-05-15T12:00:00Z',
      enclosure: {
        duration: 3600,
        link: 'https://example.com/episode1.mp3'
      }
    },
    {
      guid: 'test-guid-2',
      title: 'Test Episode 2',
      description: 'Description 2',
      pubDate: '2023-05-16T12:00:00Z',
      enclosure: {
        duration: 1800,
        link: 'https://example.com/episode2.mp3'
      }
    }
  ];

  test('renders with results', () => {
    const onClick = jest.fn();
    const { container } = render(<List results={mockResults} onClick={onClick} />);
    expect(container).toMatchSnapshot();
  });

  test('renders empty state', () => {
    const onClick = jest.fn();
    const { container } = render(<List results={[]} onClick={onClick} />);
    expect(container).toMatchSnapshot();
  });

  test('shows an updated title when the episode identity is unchanged', () => {
    const onClick = jest.fn();
    const first = mockResults[0];
    const { rerender, getByText, queryByText } = render(<List results={[first]} onClick={onClick} />);

    expect(getByText(/Test Episode 1/)).toBeInTheDocument();

    rerender(<List results={[{ ...first, title: 'Renamed Episode' }]} onClick={onClick} />);

    expect(queryByText(/Test Episode 1/)).not.toBeInTheDocument();
    expect(getByText(/Renamed Episode/)).toBeInTheDocument();
  });

  test('keeps expanded rows across a refresh and resets for another podcast', () => {
    const onClick = jest.fn();
    const episodes: IFeedItem[] = Array.from({ length: 31 }, (_, index) => ({
      guid: `id-${index}`,
      title: `Episode ${index}`,
      description: `Notes ${index}`,
      pubDate: '2026-01-01',
      enclosure: { duration: 60, link: 'https://example.com/episode.mp3' }
    }));
    const { rerender, getByRole, queryByRole, getAllByRole } = render(
      <List results={episodes} onClick={onClick} resetKey="https://example.com/a.rss" />
    );

    expect(getAllByRole('button', { name: /Play episode/ })).toHaveLength(30);
    expect(queryByRole('button', { name: 'Play episode: Episode 30' })).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: /show 1 more/i }));
    expect(getByRole('button', { name: 'Play episode: Episode 30' })).toBeInTheDocument();

    rerender(
      <List
        results={episodes.map((item) => ({ ...item }))}
        onClick={onClick}
        resetKey="https://example.com/a.rss"
      />
    );
    expect(getByRole('button', { name: 'Play episode: Episode 30' })).toBeInTheDocument();

    rerender(<List results={episodes} onClick={onClick} resetKey="https://example.com/b.rss" />);
    expect(queryByRole('button', { name: 'Play episode: Episode 30' })).not.toBeInTheDocument();
    expect(getAllByRole('button', { name: /Play episode/ })).toHaveLength(30);
  });
});