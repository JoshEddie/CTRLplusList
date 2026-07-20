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
    selectPlaceholder: vi.fn(),
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
    placeholder: null,
    description: '',
    store: { name: 'Lodge', link: 'https://lodge', price: '29.99' },
    lists: [],
    qty: 1,
    ...over,
  };
}

export const MINTED_URL = 'data:image/svg+xml;base64,bWludGVk';

export function placeholderActionsMock() {
  return {
    mintItemPlaceholder: vi
      .fn()
      .mockResolvedValue({ success: true, message: 'ok', url: MINTED_URL }),
    previewPlaceholders: vi.fn(async (count: number) => ({
      success: true,
      message: 'ok',
      urls: Array.from(
        { length: count },
        (_, i) => `data:image/svg+xml;base64,${'a'.repeat(i + 1)}`
      ),
    })),
  };
}
