import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Page, { metadata } from '../page';

vi.mock('../HistoryPage', () => ({
  default: () => <div data-testid="history-page" />,
}));

describe('Page', () => {
  it('Render_RendersHistoryPageInsideListCollectionsMain', () => {
    render(<Page />);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('container', 'container--list-collections');
    expect(main).toContainElement(screen.getByTestId('history-page'));
  });

  it('Metadata_TitleIsVisitHistory', () => {
    expect(metadata.title).toBe('Visit history');
  });
});
