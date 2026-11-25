import { h } from 'preact';
import { fireEvent, render } from '@testing-library/preact';
import { List } from '../List';
import { IFeedItem } from '../Result';

// The real Result is spread first so this replacement is the one List renders.
jest.mock('../Result', () => ({
  ...jest.requireActual('../Result'),
  Result: ({ result }: { result: IFeedItem }) => (
    <li data-testid="mocked-result">
      {result.title} {result.pubDate} {result.enclosure.duration}
    </li>
  ),
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

  const reorderInitial = [mockResults[0], mockResults[1]];
  const reorderReversed = [mockResults[1], mockResults[0]];

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
    const { rerender, getByRole, queryByText, getByText, getAllByTestId } = render(
      <List results={episodes} onClick={onClick} resetKey="https://example.com/a.rss" />
    );

    expect(getAllByTestId('mocked-result')).toHaveLength(30);
    expect(queryByText(/Episode 30/)).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: /show 1 more/i }));
    expect(getByText(/Episode 30/)).toBeInTheDocument();

    rerender(
      <List
        results={episodes.map((item) => ({ ...item }))}
        onClick={onClick}
        resetKey="https://example.com/a.rss"
      />
    );
    expect(getByText(/Episode 30/)).toBeInTheDocument();

    rerender(<List results={episodes} onClick={onClick} resetKey="https://example.com/b.rss" />);
    expect(queryByText(/Episode 30/)).not.toBeInTheDocument();
    expect(getAllByTestId('mocked-result')).toHaveLength(30);
  });

  test('reorders keyed episodes with moveBefore when the list supports it', () => {
    const onClick = jest.fn();
    const { container, rerender, getAllByTestId } = render(
      <List results={reorderInitial} onClick={onClick} />
    );
    const list = container.querySelector('ol');

    expect(list).not.toBeNull();

    const moveBefore = jest.fn(function (this: ParentNode, node: Node, child: Node | null) {
      this.insertBefore(node, child);
    });
    Object.defineProperty(list, 'moveBefore', { configurable: true, value: moveBefore });

    rerender(<List results={reorderReversed} onClick={onClick} />);

    const titles = getAllByTestId('mocked-result').map((row) => row.textContent ?? '');
    expect(titles[0]).toContain('Test Episode 2');
    expect(titles[1]).toContain('Test Episode 1');
    expect(moveBefore).toHaveBeenCalled();
  });
});