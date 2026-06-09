import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ListCardData } from '@/app/ui/components/ListCard';
import type { HistoryRowData } from '../HistoryCard';
import HistoryList from '../HistoryList';

vi.mock('../HistoryCard', () => ({
  default: () => <div data-testid="history-card" />,
}));

function makeRow(overrides: Partial<HistoryRowData> = {}): HistoryRowData {
  return {
    user_id: 'viewer',
    list_id: 'l1',
    last_visited_at: new Date('2021-01-01'),
    favorited_at: null,
    list: { id: 'l1' } as ListCardData,
    ...overrides,
  };
}

describe('HistoryList', () => {
  describe('Empty', () => {
    it('NoRows_RendersNoVisitsMessageAndNoGrid', () => {
      render(<HistoryList rows={[]} />);
      expect(screen.getByText('No visits yet.')).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('Populated', () => {
    it('Rows_RendersGridWithOneCardPerRow', () => {
      render(
        <HistoryList
          rows={[makeRow({ list_id: 'l1' }), makeRow({ list_id: 'l2' })]}
        />
      );
      expect(screen.getByRole('list')).toHaveClass('list-card-grid');
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getAllByTestId('history-card')).toHaveLength(2);
    });
  });
});
