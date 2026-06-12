import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HistoryList from '../HistoryList';
import { makeRow } from './test-helpers';

vi.mock('../HistoryCard', () => ({
  default: () => <div data-testid="history-card" />,
}));

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
