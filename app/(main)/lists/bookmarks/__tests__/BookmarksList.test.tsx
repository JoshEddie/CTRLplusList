import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BookmarksList from '../BookmarksList';
import { makeRow } from './test-helpers';

vi.mock('@/app/ui/components/ListCard', () => ({
  default: (props: { showOwner?: boolean }) => (
    <div data-testid="list-card" data-show-owner={String(props.showOwner)} />
  ),
}));

describe('BookmarksList', () => {
  describe('Empty', () => {
    it('NoRows_RendersEmptyMessageAndNoGrid', () => {
      render(<BookmarksList rows={[]} />);
      expect(screen.getByText(/No bookmarks yet/i)).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('Populated', () => {
    it('Rows_RendersGridWithOneItemPerRow-ForwardsShowOwnerToEachCard', () => {
      render(
        <BookmarksList
          rows={[makeRow({ list_id: 'l1' }), makeRow({ list_id: 'l2' })]}
        />
      );
      expect(screen.getByRole('list')).toHaveClass('list-card-grid');
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      const cards = screen.getAllByTestId('list-card');
      expect(cards).toHaveLength(2);
      cards.forEach((card) =>
        expect(card).toHaveAttribute('data-show-owner', 'true')
      );
    });
  });
});
