import { describe, expect, it } from 'vitest';
import type { ItemDisplay, ItemStoreTable } from '@/lib/types';
import { compareItems, displayPrice, firstStoreName } from '../itemFilters';

function store(
  name: string,
  price: string,
  link: string | '' = 'https://example.com'
): ItemStoreTable {
  return { name, price, link };
}

function makeItem(overrides: Partial<ItemDisplay> = {}): ItemDisplay {
  return {
    id: 'i1',
    name: 'Item',
    description: '',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    user_id: 'u1',
    quantity_limit: null,
    ...overrides,
  };
}

describe('displayPrice', () => {
  it('LowestFiniteAcrossValidStores_ReturnsMin', () => {
    const item = makeItem({
      stores: [store('A', '10'), store('B', '5'), store('C', '8')],
    });
    expect(displayPrice(item)).toBe(5);
  });

  it('StoreMissingNameOrLink_Ignored', () => {
    const item = makeItem({
      stores: [
        { name: '', link: 'https://x', price: '1' },
        { name: 'B', link: '', price: '2' },
        store('C', '9'),
      ],
    });
    expect(displayPrice(item)).toBe(9);
  });

  it('NonNumericPrice_Ignored', () => {
    const item = makeItem({
      stores: [store('A', 'not-a-number'), store('B', '7')],
    });
    expect(displayPrice(item)).toBe(7);
  });

  it('NoQualifyingStore_ReturnsNaN', () => {
    expect(displayPrice(makeItem({ stores: undefined }))).toBeNaN();
    expect(
      displayPrice(makeItem({ stores: [{ name: 'A', link: '', price: '1' }] }))
    ).toBeNaN();
  });
});

describe('firstStoreName', () => {
  it('MultipleStores_ReturnsAlphabeticallyFirst', () => {
    const item = makeItem({
      stores: [store('Zed', '1'), store('Apple', '2'), store('Mango', '3')],
    });
    expect(firstStoreName(item)).toBe('Apple');
  });

  it('NoStores_ReturnsEmptyString', () => {
    expect(firstStoreName(makeItem({ stores: undefined }))).toBe('');
    expect(firstStoreName(makeItem({ stores: [] }))).toBe('');
  });
});

describe('compareItems', () => {
  it('ListOrder_ReturnsZero', () => {
    expect(compareItems(makeItem(), makeItem(), 'list_order')).toBe(0);
  });

  it('CreatedAsc_OrdersByTimestampAscending', () => {
    const older = makeItem({ created_at: new Date('2024-01-01T00:00:00Z') });
    const newer = makeItem({ created_at: new Date('2024-06-01T00:00:00Z') });
    expect(compareItems(older, newer, 'created_asc')).toBeLessThan(0);
    expect(compareItems(newer, older, 'created_asc')).toBeGreaterThan(0);
  });

  it('CreatedDesc_OrdersByTimestampDescending', () => {
    const older = makeItem({ created_at: new Date('2024-01-01T00:00:00Z') });
    const newer = makeItem({ created_at: new Date('2024-06-01T00:00:00Z') });
    expect(compareItems(older, newer, 'created_desc')).toBeGreaterThan(0);
    expect(compareItems(newer, older, 'created_desc')).toBeLessThan(0);
  });

  it('NameAsc_OrdersByLocaleCompare', () => {
    const a = makeItem({ name: 'Apple' });
    const b = makeItem({ name: 'Banana' });
    expect(compareItems(a, b, 'name_asc')).toBeLessThan(0);
  });

  it('NameDesc_OrdersByReverseLocaleCompare', () => {
    const a = makeItem({ name: 'Apple' });
    const b = makeItem({ name: 'Banana' });
    expect(compareItems(a, b, 'name_desc')).toBeGreaterThan(0);
  });

  describe('StoreOrdering', () => {
    const apple = makeItem({ stores: [store('Apple', '1')] });
    const mango = makeItem({ stores: [store('Mango', '1')] });
    const noStore = makeItem({ stores: [] });

    it('StoreAsc_OrdersPresentStoresAscending', () => {
      expect(compareItems(apple, mango, 'store_asc')).toBeLessThan(0);
    });

    it('StoreDesc_OrdersPresentStoresDescending', () => {
      expect(compareItems(apple, mango, 'store_desc')).toBeGreaterThan(0);
    });

    it('StoreAsc_MissingStoreSortsLast', () => {
      expect(compareItems(noStore, apple, 'store_asc')).toBeGreaterThan(0);
      expect(compareItems(apple, noStore, 'store_asc')).toBeLessThan(0);
    });

    it('StoreDesc_MissingStoreSortsLast', () => {
      expect(compareItems(noStore, apple, 'store_desc')).toBeGreaterThan(0);
      expect(compareItems(apple, noStore, 'store_desc')).toBeLessThan(0);
    });

    it('BothStoresMissing_ReturnsZero', () => {
      expect(compareItems(noStore, noStore, 'store_asc')).toBe(0);
    });
  });

  describe('PriceOrdering', () => {
    const cheap = makeItem({ stores: [store('A', '5')] });
    const pricey = makeItem({ stores: [store('A', '50')] });
    const noPrice = makeItem({ stores: [] });

    it('PriceAsc_OrdersPresentPricesAscending', () => {
      expect(compareItems(cheap, pricey, 'price_asc')).toBeLessThan(0);
    });

    it('PriceDesc_OrdersPresentPricesDescending', () => {
      expect(compareItems(cheap, pricey, 'price_desc')).toBeGreaterThan(0);
    });

    it('PriceAsc_MissingPriceSortsLast', () => {
      expect(compareItems(noPrice, cheap, 'price_asc')).toBeGreaterThan(0);
      expect(compareItems(cheap, noPrice, 'price_asc')).toBeLessThan(0);
    });

    it('PriceDesc_MissingPriceSortsLast', () => {
      expect(compareItems(noPrice, cheap, 'price_desc')).toBeGreaterThan(0);
      expect(compareItems(cheap, noPrice, 'price_desc')).toBeLessThan(0);
    });

    it('BothPricesMissing_ReturnsZero', () => {
      expect(compareItems(noPrice, noPrice, 'price_asc')).toBe(0);
    });
  });
});
