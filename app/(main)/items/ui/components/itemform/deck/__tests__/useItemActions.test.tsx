import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useItemActions } from '../useItemActions';
import { blankItem, seedFromFetch, type ItemViewModel } from '../viewModel';
import { MAX_IMAGE_CANDIDATES } from '@/lib/imageCandidates';
import type { ProductData } from '@/lib/product-fetch/types';

function useHarness(initial: ItemViewModel) {
  const [item, setItem] = useState(initial);
  return { item, actions: useItemActions(setItem) };
}

const fetched: ProductData = {
  title: 'Skillet',
  imageUrl: 'https://a',
  imageUrls: ['https://a'],
  price: '29.99',
  store: 'shop',
  canonicalUrl: 'https://c',
  currency: 'USD',
};

describe('useItemActions', () => {
  it('SetName_UpdatesName', () => {
    const { result } = renderHook(() => useHarness(blankItem()));
    act(() => result.current.actions.setName('Skillet'));
    expect(result.current.item.name).toBe('Skillet');
  });

  it('SetDescription_UpdatesDescription', () => {
    const { result } = renderHook(() => useHarness(blankItem()));
    act(() => result.current.actions.setDescription('A note'));
    expect(result.current.item.description).toBe('A note');
  });

  it('SelectPhoto_UpdatesPhotoIndex', () => {
    const { result } = renderHook(() =>
      useHarness({ ...blankItem(), photos: ['a', 'b'], photoIndex: 0 })
    );
    act(() => result.current.actions.selectPhoto(1));
    expect(result.current.item.photoIndex).toBe(1);
  });

  it('AddPhoto_AppendsAndSelectsNew', () => {
    const { result } = renderHook(() =>
      useHarness({ ...blankItem(), photos: ['a'], photoIndex: 0 })
    );
    act(() => result.current.actions.addPhoto('https://b'));
    expect(result.current.item.photos).toEqual(['a', 'https://b']);
    expect(result.current.item.photoIndex).toBe(1);
  });

  it('AddPhoto_NoOpsAtCap', () => {
    const photos = Array.from(
      { length: MAX_IMAGE_CANDIDATES },
      (_, i) => `https://${i}`
    );
    const { result } = renderHook(() =>
      useHarness({ ...blankItem(), photos, photoIndex: 0 })
    );
    act(() => result.current.actions.addPhoto('https://overflow'));
    expect(result.current.item.photos).toEqual(photos);
    expect(result.current.item.photoIndex).toBe(0);
  });

  it('SetStorePrice_UpdatesPrice-DropsProvenance', () => {
    const { result } = renderHook(() =>
      useHarness(seedFromFetch(fetched, 'https://p', '2026-01-01'))
    );
    act(() => result.current.actions.setStore(0, 'price', '5.00'));
    expect(result.current.item.stores[0].price).toBe('5.00');
    expect(result.current.item.stores[0].price_fetched_at).toBeNull();
  });

  it('SetStoreName_UpdatesName-KeepsProvenance', () => {
    const { result } = renderHook(() =>
      useHarness(seedFromFetch(fetched, 'https://p', '2026-01-01'))
    );
    act(() => result.current.actions.setStore(0, 'name', 'New'));
    expect(result.current.item.stores[0].name).toBe('New');
    expect(result.current.item.stores[0].price_fetched_at).toBe('2026-01-01');
  });

  it('AddStore_AppendsEmptyRow', () => {
    const { result } = renderHook(() => useHarness(blankItem()));
    act(() => result.current.actions.addStore());
    expect(result.current.item.stores).toHaveLength(2);
    expect(result.current.item.stores[1]).toEqual({
      name: '',
      link: '',
      price: '',
    });
  });

  it('RemoveStore_DropsRowAtIndex', () => {
    const { result } = renderHook(() =>
      useHarness({
        ...blankItem(),
        stores: [
          { name: 'a', link: 'la', price: '1' },
          { name: 'b', link: 'lb', price: '2' },
        ],
      })
    );
    act(() => result.current.actions.removeStore(0));
    expect(result.current.item.stores).toEqual([
      { name: 'b', link: 'lb', price: '2' },
    ]);
  });

  it('SetLists_ReplacesLists', () => {
    const { result } = renderHook(() => useHarness(blankItem()));
    act(() =>
      result.current.actions.setLists([{ value: '1', label: 'Birthday' }])
    );
    expect(result.current.item.lists).toEqual([
      { value: '1', label: 'Birthday' },
    ]);
  });

  it('SetQty_UpdatesQuantity', () => {
    const { result } = renderHook(() => useHarness(blankItem()));
    act(() => result.current.actions.setQty(null));
    expect(result.current.item.qty).toBeNull();
  });
});
