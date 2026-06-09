import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Page, { metadata } from '../page';

vi.mock('../BookmarksPage', () => ({
  default: () => <div data-testid="bookmarks-page" />,
}));

describe('Page', () => {
  it('Render_RendersBookmarksPageInsideListCollectionsMain', () => {
    render(<Page />);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('container', 'container--list-collections');
    expect(main).toContainElement(screen.getByTestId('bookmarks-page'));
  });

  it('Metadata_TitleIsBookmarks', () => {
    expect(metadata.title).toBe('Bookmarks');
  });
});
