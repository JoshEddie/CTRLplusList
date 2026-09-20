import { describe, expect, it } from 'vitest';
import type { ItemDisplay, ItemStoreTable } from '@/lib/types';
import {
  browseItems,
  compareItems,
  displayPrice,
  filterItems,
  pageOf,
  parseItemFilters,
  parsePage,
  parseSort,
  storeName,
} from '../itemFilters';

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
      displayPrice(
        makeItem({ store: { name: '', link: 'https://x', price: '1' } })
      )
    ).toBeNaN();
    expect(
      displayPrice(makeItem({ store: { name: 'B', link: '', price: '2' } }))
    ).toBeNaN();
    expect(
      displayPrice(makeItem({ store: store('A', 'not-a-number') }))
    ).toBeNaN();
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

describe('parseItemFilters', () => {
  it('NullSearchParams_ReturnsDefaults', () => {
    expect(parseItemFilters(null)).toEqual({
      q: '',
      selectedStores: [],
      priceMin: NaN,
      priceMax: NaN,
      hasPriceFilter: false,
    });
  });

  it('PriceParams_SetHasPriceFilterAndTrimsTheQuery', () => {
    const filters = parseItemFilters(
      new URLSearchParams('q=%20Cake%20&store=A&store=B&price_min=5')
    );
    expect(filters.q).toBe('cake');
    expect(filters.selectedStores).toEqual(['A', 'B']);
    expect(filters.priceMin).toBe(5);
    expect(filters.hasPriceFilter).toBe(true);
  });
});

describe('filterItems', () => {
  const items = [
    makeItem({ id: 'cake', name: 'Cake', store: store('A', '10') }),
    makeItem({
      id: 'card',
      name: 'Card',
      description: 'birthday cake card',
      store: store('B', '30'),
    }),
    makeItem({ id: 'nameless', name: undefined as unknown as string }),
    makeItem({ id: 'priced', store: { name: 'C', link: '', price: '20' } }),
  ];
  const ids = (rows: ItemDisplay[]) => rows.map((row) => row.id);

  it('Query_MatchesNameOrDescription-TreatsMissingTextAsEmpty', () => {
    expect(
      ids(filterItems(items, parseItemFilters(new URLSearchParams('q=cake'))))
    ).toEqual(['cake', 'card']);
  });

  it('SelectedStores_FilterByStoreName', () => {
    expect(
      ids(filterItems(items, parseItemFilters(new URLSearchParams('store=B'))))
    ).toEqual(['card']);
  });

  it('PriceMinOnly_LeavesTheUpperBoundOpen-ExcludesIncompleteStores', () => {
    expect(
      ids(
        filterItems(
          items,
          parseItemFilters(new URLSearchParams('price_min=15'))
        )
      )
    ).toEqual(['card']);
  });

  it('PriceMaxOnly_LeavesTheLowerBoundOpen', () => {
    expect(
      ids(
        filterItems(
          items,
          parseItemFilters(new URLSearchParams('price_max=15'))
        )
      )
    ).toEqual(['cake']);
  });

  it('NoFilters_ReturnsTheSameArray', () => {
    expect(filterItems(items, parseItemFilters(null))).toBe(items);
  });
});

describe('parsePage', () => {
  it('ValidPage_Returned', () => {
    expect(parsePage(new URLSearchParams('page=3'))).toBe(3);
  });

  it('Missing_FallsBackToOne', () => {
    expect(parsePage(null)).toBe(1);
  });

  it('Zero_FallsBackToOne', () => {
    expect(parsePage(new URLSearchParams('page=0'))).toBe(1);
  });

  it('NonNumeric_FallsBackToOne', () => {
    expect(parsePage(new URLSearchParams('page=abc'))).toBe(1);
  });
});

describe('pageOf', () => {
  const rows = Array.from({ length: 30 }, (_, i) => i);

  it('MiddlePage_ReturnsItsSlice', () => {
    expect(pageOf(rows, 2, 24)).toEqual({
      rows: rows.slice(24),
      page: 2,
      totalPages: 2,
    });
  });

  it('PagePastTheEnd_ClampsToTheLastPage', () => {
    expect(pageOf(rows, 99, 24).page).toBe(2);
  });

  it('NoRows_OnePageOfNothing', () => {
    expect(pageOf([], 1, 24)).toEqual({ rows: [], page: 1, totalPages: 1 });
  });
});

describe('parseSort', () => {
  it('ValidKey_Returned', () => {
    expect(
      parseSort(
        new URLSearchParams('sort=name_asc'),
        ['name_asc'],
        'created_desc'
      )
    ).toBe('name_asc');
  });

  it('MissingOrUnknownKey_FallsBack', () => {
    expect(parseSort(null, ['name_asc'], 'created_desc')).toBe('created_desc');
    expect(
      parseSort(new URLSearchParams('sort=zzz'), ['name_asc'], 'created_desc')
    ).toBe('created_desc');
  });
});

describe('browseItems', () => {
  const items = [
    makeItem({ id: 'b', name: 'Banana', store: store('A', '20') }),
    makeItem({ id: 'a', name: 'Apple', store: store('A', '10') }),
    makeItem({ id: 'c', name: 'Cherry', store: store('B', '30') }),
  ];

  it('SortedAndPaged_ReturnsTheSliceAndTheMatchCount', () => {
    expect(
      browseItems(items, new URLSearchParams('page=2'), 'name_asc', 2)
    ).toEqual({ rows: [items[2]], page: 2, totalPages: 2, matches: 3 });
  });

  it('ListOrder_KeepsTheInputOrder', () => {
    expect(
      browseItems(items, null, 'list_order', 24).rows.map((r) => r.id)
    ).toEqual(['b', 'a', 'c']);
  });

  it('FilterMatchingNothing_ReportsZeroMatches', () => {
    expect(
      browseItems(items, new URLSearchParams('q=zzz'), 'name_asc', 24)
    ).toEqual({ rows: [], page: 1, totalPages: 1, matches: 0 });
  });
});
