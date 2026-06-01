import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ListCardData } from '@/app/ui/components/ListCard';
import HistoryCard, { HistoryRowData } from '../HistoryCard';

vi.mock('@/app/ui/components/ListCard', () => ({
  default: (props: { bookmarked?: boolean; showOwner?: boolean }) => (
    <div
      data-testid="list-card"
      data-bookmarked={String(props.bookmarked)}
      data-show-owner={String(props.showOwner)}
    />
  ),
}));
vi.mock('../HistoryActions', () => ({
  RemoveVisitButton: ({ listId }: { listId: string }) => (
    <button type="button" data-testid="remove-visit" data-list-id={listId} />
  ),
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

describe('HistoryCard', () => {
  it('FavoritedRow_PassesBookmarkedTrueToListCard', () => {
    render(<HistoryCard row={makeRow({ favorited_at: new Date() })} />);
    expect(screen.getByTestId('list-card')).toHaveAttribute(
      'data-bookmarked',
      'true'
    );
  });

  it('NonFavoritedRow_PassesBookmarkedFalseToListCard', () => {
    render(<HistoryCard row={makeRow({ favorited_at: null })} />);
    expect(screen.getByTestId('list-card')).toHaveAttribute(
      'data-bookmarked',
      'false'
    );
  });

  it('Always_PassesShowOwnerToListCard', () => {
    render(<HistoryCard row={makeRow()} />);
    expect(screen.getByTestId('list-card')).toHaveAttribute(
      'data-show-owner',
      'true'
    );
  });

  it('Always_RendersRemoveVisitButtonWithRowListId', () => {
    render(<HistoryCard row={makeRow({ list_id: 'abc', favorited_at: new Date() })} />);
    expect(screen.getByTestId('remove-visit')).toHaveAttribute(
      'data-list-id',
      'abc'
    );
  });
});
