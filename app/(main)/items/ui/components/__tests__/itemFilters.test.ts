import { describe, expect, it } from 'vitest';
import type { ItemDisplay, ItemStoreTable } from '@/lib/types';
import { compareItems, displayPrice, storeName } from '../itemFilters';

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
    profile_id: 'p1',
    quantity_limit: null,
    ...overrides,
  };
}

describe('displayPrice', () => {
  it('CompleteStore_ReturnsParsedPrice', () => {
    expect(displayPrice(makeItem({ store: store('A', '10') }))).toBe(10);
    expect(displayPrice(makeItem({ store: store('A', '$5.50') }))).toBe(5.5);
  });

  it('IncompleteStore_ReturnsNaN', () => {
    expect(
      displayPrice(makeItem({ store: { name: '', link: 'https://x', price: '1' } }))
    ).toBeNaN();
    expect(
      displayPrice(makeItem({ store: { name: 'B', link: '', price: '2' } }))
    ).toBeNaN();
    expect(displayPrice(makeItem({ store: store('A', 'not-a-number') }))).toBeNaN();
  });

  it('NoStore_ReturnsNaN', () => {
    expect(displayPrice(makeItem({ store: undefined }))).toBeNaN();
    expect(displayPrice(makeItem({ store: null }))).toBeNaN();
  });
});

describe('storeName', () => {
  it('StorePresent_ReturnsItsName', () => {
    expect(storeName(makeItem({ store: store('Apple', '2') }))).toBe('Apple');
  });

  it('NoStore_ReturnsEmptyString', () => {
    expect(storeName(makeItem({ store: undefined }))).toBe('');
    expect(storeName(makeItem({ store: null }))).toBe('');
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
    const apple = makeItem({ store: store('Apple', '1') });
    const mango = makeItem({ store: store('Mango', '1') });
    const noStore = makeItem({ store: null });

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
    const cheap = makeItem({ store: store('A', '5') });
    const pricey = makeItem({ store: store('A', '50') });
    const noPrice = makeItem({ store: null });

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
