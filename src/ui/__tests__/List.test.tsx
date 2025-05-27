import { h } from 'preact';
import { render } from '@testing-library/preact';
import { List } from '../List';
import { IFeedItem } from '../Result';

// Mock the Result component to avoid rendering issues in tests
jest.mock('../Result', () => ({
  Result: ({ result, onClick }) => (
    <tr data-testid="mocked-result">
      <td>{result.title}</td>
      <td>{result.pubDate}</td>
      <td>{result.enclosure.duration}</td>
    </tr>
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
});