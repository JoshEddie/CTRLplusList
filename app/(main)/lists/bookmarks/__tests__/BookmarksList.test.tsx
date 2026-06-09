import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ListCardData } from '@/app/ui/components/ListCard';
import BookmarksList, { BookmarkRowData } from '../BookmarksList';

vi.mock('@/app/ui/components/ListCard', () => ({
  default: (props: { showOwner?: boolean }) => (
    <div data-testid="list-card" data-show-owner={String(props.showOwner)} />
  ),
}));

function makeRow(overrides: Partial<BookmarkRowData> = {}): BookmarkRowData {
  return {
    user_id: 'viewer',
    list_id: 'l1',
    list: { id: 'l1' } as ListCardData,
    ...overrides,
  };
}

describe('BookmarksList', () => {
  describe('Empty', () => {
    it('NoRows_RendersEmptyMessageAndNoGrid', () => {
      render(<BookmarksList rows={[]} />);
      expect(screen.getByText(/No bookmarks yet/i)).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('Populated', () => {
    it('Rows_RendersGridWithOneItemPerRow', () => {
      render(
        <BookmarksList
          rows={[makeRow({ list_id: 'l1' }), makeRow({ list_id: 'l2' })]}
        />
      );
      expect(screen.getByRole('list')).toHaveClass('list-card-grid');
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getAllByTestId('list-card')).toHaveLength(2);
    });

    it('Rows_PassesShowOwnerToEachCard', () => {
      render(<BookmarksList rows={[makeRow()]} />);
      expect(screen.getByTestId('list-card')).toHaveAttribute(
        'data-show-owner',
        'true'
      );
    });
  });
});
