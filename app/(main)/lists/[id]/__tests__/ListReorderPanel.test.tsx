import { getItemsByListId } from '@/lib/data/item';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListReorderPanel from '../ListReorderPanel';

vi.mock('@/lib/data/item', () => ({ getItemsByListId: vi.fn() }));

vi.mock('../ReorderList', () => ({
  default: (p: { listId: string; items: Record<string, unknown>[] }) => (
    <div
      data-testid="reorder-list"
      data-list-id={p.listId}
      data-item-ids={p.items.map((i) => i.id).join(',')}
      data-quantities={p.items.map((i) => i.quantity).join(',')}
      data-claim-keys={p.items
        .flatMap((i) => Object.keys(i))
        .filter((k) => ['purchases', 'claimed_units'].includes(k))
        .join(',')}
    />
  ),
}));

const entry = (id: string, quantity: number) => ({
  id,
  name: id,
  quantity,
  list_id: 'l1',
  purchases: [{ id: 'c1' }],
  claimed_units: 2,
});

const list = () => screen.getByTestId('reorder-list');

beforeEach(() => {
  vi.mocked(getItemsByListId).mockResolvedValue([
    entry('i1', 3),
    entry('i2', 1),
  ] as never);
});

describe('ListReorderPanel', () => {
  // A row states a position, a name and an ask; none of the three vary with
  // what somebody has bought, so no claim state reaches the client.
  it('Default_HandsTheWholeListInPositionOrder-KeepsQuantities-StripsClaims', async () => {
    render(await ListReorderPanel({ listId: 'l1' }));
    expect(getItemsByListId).toHaveBeenCalledExactlyOnceWith('l1');
    expect(list()).toHaveAttribute('data-list-id', 'l1');
    expect(list()).toHaveAttribute('data-item-ids', 'i1,i2');
    expect(list()).toHaveAttribute('data-quantities', '3,1');
    expect(list()).toHaveAttribute('data-claim-keys', '');
  });
});
