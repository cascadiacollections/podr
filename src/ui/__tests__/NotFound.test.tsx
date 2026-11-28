import { h } from 'preact';
import { render, screen } from '@testing-library/preact';

import { NOT_FOUND_DOCUMENT_TITLE, NOT_FOUND_HEADING, NOT_FOUND_MESSAGE, NotFound } from '../NotFound';

describe('NotFound', () => {
  test('names the missing page and links home', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { level: 1, name: NOT_FOUND_HEADING })).toBeInTheDocument();
    expect(screen.getByText(NOT_FOUND_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/');
    expect(document.title).toBe(NOT_FOUND_DOCUMENT_TITLE);
  });
});
