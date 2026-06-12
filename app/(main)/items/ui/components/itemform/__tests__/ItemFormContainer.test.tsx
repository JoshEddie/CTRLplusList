import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ItemFormContainer from '../ItemFormContainer';

vi.mock('../ItemForm', () => ({
  default: (p: {
    user_id: string;
    lists: unknown[];
    item?: { id: string };
    onClose: () => void;
    onSuccess?: () => void;
  }) => (
    <div
      data-testid="item-form"
      data-user-id={p.user_id}
      data-lists-count={String(p.lists.length)}
      data-has-item={String(!!p.item)}
      data-has-success={String(!!p.onSuccess)}
    />
  ),
}));

describe('ItemFormContainer', () => {
  it('NoItem_ForwardsUserAndListsToItemForm', () => {
    render(
      <ItemFormContainer
        user_id="u1"
        lists={[{ id: 'l1' }, { id: 'l2' }] as never}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    const form = screen.getByTestId('item-form');
    expect(form).toHaveAttribute('data-user-id', 'u1');
    expect(form).toHaveAttribute('data-lists-count', '2');
    expect(form).toHaveAttribute('data-has-item', 'false');
    expect(form).toHaveAttribute('data-has-success', 'true');
  });

  it('WithItem_ForwardsItemToItemForm', () => {
    render(
      <ItemFormContainer
        user_id="u1"
        lists={[] as never}
        item={{ id: 'i1', stores: [], lists: [] } as never}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId('item-form')).toHaveAttribute(
      'data-has-item',
      'true'
    );
  });
});
