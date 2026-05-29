/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The view-mode contract is the `.item-grid` / `.item-list` / `.item-grid-container`
 * class on the wrapper divs; those are layout wrappers with no role or text, so
 * `container.querySelector` is the only way to assert them.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ItemDisplay } from '@/lib/types';
import Items from '../Items';

interface ItemStubProps {
  item: ItemDisplay;
  user_id?: string;
  showArchiveAction?: boolean;
  archivedView?: boolean;
}

vi.mock('../Item', () => ({
  default: ({
    item,
    user_id,
    showArchiveAction,
    archivedView,
  }: ItemStubProps) => (
    <div
      data-testid="item-stub"
      data-item-id={item.id}
      data-user-id={user_id ?? ''}
      data-show-archive={String(showArchiveAction)}
      data-archived-view={String(archivedView)}
    />
  ),
}));

function makeItem(id: string): ItemDisplay {
  return {
    id,
    name: `Item ${id}`,
    description: '',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    user_id: 'u1',
    quantity_limit: null,
  };
}

describe('Items', () => {
  describe('ViewMode', () => {
    it('ViewList_RendersItemListClass', () => {
      const { container } = render(
        <Items items={[makeItem('a')]} view="list" />
      );
      expect(container.querySelector('.item-grid-container')).not.toBeNull();
      expect(container.querySelector('.item-list')).not.toBeNull();
      expect(container.querySelector('.item-grid')).toBeNull();
    });

    it('ViewGrid_RendersItemGridClass', () => {
      const { container } = render(
        <Items items={[makeItem('a')]} view="grid" />
      );
      expect(container.querySelector('.item-grid')).not.toBeNull();
      expect(container.querySelector('.item-list')).toBeNull();
    });

    it('ViewOmitted_DefaultsToItemGrid', () => {
      const { container } = render(<Items items={[makeItem('a')]} />);
      expect(container.querySelector('.item-grid-container')).not.toBeNull();
      expect(container.querySelector('.item-grid')).not.toBeNull();
    });
  });

  describe('ItemMapping', () => {
    it('MultipleItems_RendersOneStubPerItemInOrder', () => {
      render(<Items items={[makeItem('a'), makeItem('b'), makeItem('c')]} />);
      const ids = screen
        .getAllByTestId('item-stub')
        .map((el) => el.getAttribute('data-item-id'));
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('ForwardedProps_ReachEachItem', () => {
      render(
        <Items
          items={[makeItem('a')]}
          user_id="viewer"
          showArchiveAction
          archivedView
        />
      );
      const stub = screen.getByTestId('item-stub');
      expect(stub).toHaveAttribute('data-user-id', 'viewer');
      expect(stub).toHaveAttribute('data-show-archive', 'true');
      expect(stub).toHaveAttribute('data-archived-view', 'true');
    });
  });
});
