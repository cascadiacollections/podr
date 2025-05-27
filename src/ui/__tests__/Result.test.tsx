import { h } from 'preact';
import { render } from '@testing-library/preact';
import { Result, IFeedItem } from '../Result';

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
    // We need to render the component inside a table/tbody since it's a tr
    const { container } = render(
      <table>
        <tbody>
          <Result result={mockFeedItem} onClick={onClick} />
        </tbody>
      </table>
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
      <table>
        <tbody>
          <Result result={emptyFeedItem} onClick={onClick} />
        </tbody>
      </table>
    );
    expect(container).toMatchSnapshot();
  });
});