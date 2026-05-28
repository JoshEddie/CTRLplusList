/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The empty-state paragraph carries only the `.profile-empty` class with no
 * role or accessible name; classed `container.querySelector` is the only path.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ListCardData } from '@/app/ui/components/ListCard';
import PublicListsGrid from '../PublicListsGrid';

vi.mock('@/app/ui/components/ListCard', () => ({
  default: ({ list, showOwner }: { list: { id: string }; showOwner: boolean }) => (
    <div
      data-testid="list-card"
      data-id={list.id}
      data-show-owner={String(showOwner)}
    />
  ),
}));

const lists = [{ id: 'l1' }, { id: 'l2' }] as unknown as ListCardData[];

describe('PublicListsGrid', () => {
  it('EmptyLists_RendersProfileEmptyMessage', () => {
    const { container } = render(<PublicListsGrid lists={[]} />);
    expect(container.querySelector('.profile-empty')).toHaveTextContent(
      'No shared lists yet.'
    );
    expect(screen.queryByTestId('list-card')).not.toBeInTheDocument();
  });

  it('NonEmpty_RendersListRoleWithListCardPerItem_ShowOwnerFalse', () => {
    render(<PublicListsGrid lists={lists} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
    const cards = screen.getAllByTestId('list-card');
    expect(cards.map((c) => c.getAttribute('data-id'))).toEqual(['l1', 'l2']);
    cards.forEach((c) =>
      expect(c).toHaveAttribute('data-show-owner', 'false')
    );
  });
});
