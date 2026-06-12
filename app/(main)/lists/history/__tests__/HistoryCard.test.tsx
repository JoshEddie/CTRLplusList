import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HistoryCard from '../HistoryCard';
import { makeRow } from './test-helpers';

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
