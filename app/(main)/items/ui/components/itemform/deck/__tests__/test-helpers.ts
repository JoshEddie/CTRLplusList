import { vi } from 'vitest';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';

// Typed factory: TypeScript breaks every call site if ItemActions grows a
// method, so this can't silently drift out of sync with the real hook.
export function mockActions(): ItemActions {
  return {
    setName: vi.fn(),
    setDescription: vi.fn(),
    selectPhoto: vi.fn(),
    addPhoto: vi.fn(),
    setStore: vi.fn(),
    setLists: vi.fn(),
    setQty: vi.fn(),
  };
}

export function makeItem(over: Partial<ItemViewModel> = {}): ItemViewModel {
  return {
    id: '',
    name: 'Cast Iron Skillet',
    photos: ['https://img/a.jpg'],
    photoIndex: 0,
    description: '',
    stores: [{ name: 'Lodge', link: 'https://lodge', price: '29.99' }],
    lists: [],
    qty: 1,
    ...over,
  };
}
