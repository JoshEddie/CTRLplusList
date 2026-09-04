import { describe, expect, it } from 'vitest';
import { ItemDisplay } from '@/lib/types';
import {
  collectStoreOptions,
  filterAndSortEditModeItems,
  parseEditModeFilters,
} from '../editModeFilters';

function item(overrides: Partial<ItemDisplay>): ItemDisplay {
  return {
    id: 'x',
    name: 'Item',
    description: '',
    store: null,
    purchases: [],
    ...overrides,
  } as ItemDisplay;
}

const ITEMS = [
  item({
    id: 'a1',
    name: 'Apple',
    description: 'red fruit',
    store: {
      name: 'Amazon',
      price: '5.00',
      link: 'https://a.example',
    } as never,
  }),
  item({
    id: 'a2',
    name: 'Banana',
    store: {
      name: 'Target',
      price: '15.00',
      link: 'https://t.example',
    } as never,
  }),
  item({ id: 'a3', name: 'Cherry' }),
];

const ids = (items: ItemDisplay[]) => items.map((i) => i.id);

describe('parseEditModeFilters', () => {
  it('NullSearchParams_ReturnsDefaults', () => {
    expect(parseEditModeFilters(null)).toEqual({
      q: '',
      sort: 'name_asc',
      show: 'all',
      selectedStores: [],
      priceMin: NaN,
      priceMax: NaN,
      hasPriceFilter: false,
    });
  });

  it('ValidSort_IsPreserved', () => {
    expect(
      parseEditModeFilters(new URLSearchParams('sort=price_desc')).sort
    ).toBe('price_desc');
  });

  it('InvalidSort_FallsBackToNameAsc', () => {
    expect(parseEditModeFilters(new URLSearchParams('sort=bogus')).sort).toBe(
      'name_asc'
    );
  });

  it('ShowOnOrOff_IsPreserved-OtherFallsBackToAll', () => {
    expect(parseEditModeFilters(new URLSearchParams('show=on')).show).toBe(
      'on'
    );
    expect(parseEditModeFilters(new URLSearchParams('show=off')).show).toBe(
      'off'
    );
    expect(parseEditModeFilters(new URLSearchParams('show=weird')).show).toBe(
      'all'
    );
  });

  it('PriceParams_SetHasPriceFilterAndTrimsQuery', () => {
    const parsed = parseEditModeFilters(
      new URLSearchParams('q=%20Hi%20&price_min=3&store=Amazon&store=Target')
    );
    expect(parsed.q).toBe('hi');
    expect(parsed.priceMin).toBe(3);
    expect(parsed.hasPriceFilter).toBe(true);
    expect(parsed.selectedStores).toEqual(['Amazon', 'Target']);
  });
});

describe('collectStoreOptions', () => {
  it('CollectsDistinctNames_SortedAndSkipsBlankAndMissing', () => {
    expect(
      collectStoreOptions([
        item({ store: { name: 'Zebra' } as never }),
        item({ store: { name: 'Apple' } as never }),
        item({ store: { name: '' } as never }),
        item({ store: { name: 'Zebra' } as never }),
        item({ store: undefined as never }),
      ])
    ).toEqual(['Apple', 'Zebra']);
  });
});

describe('filterAndSortEditModeItems', () => {
  const base = parseEditModeFilters(null);

  it('ShowOn_KeepsOnlySelected', () => {
    expect(
      ids(
        filterAndSortEditModeItems(ITEMS, new Set(['a1']), {
          ...base,
          show: 'on',
        })
      )
    ).toEqual(['a1']);
  });

  it('ShowOff_DropsSelected', () => {
    expect(
      ids(
        filterAndSortEditModeItems(ITEMS, new Set(['a1']), {
          ...base,
          show: 'off',
        })
      )
    ).toEqual(['a2', 'a3']);
  });

  it('Query_MatchesNameOrDescription', () => {
    expect(
      ids(filterAndSortEditModeItems(ITEMS, new Set(), { ...base, q: 'red' }))
    ).toEqual(['a1']);
  });

  it('QueryAgainstNamelessItem_TreatsMissingTextAsEmpty', () => {
    const nameless = item({
      id: 'z1',
      name: null as never,
      description: null as never,
    });
    expect(
      ids(
        filterAndSortEditModeItems([nameless, ...ITEMS], new Set(), {
          ...base,
          q: 'red',
        })
      )
    ).toEqual(['a1']);
  });

  it('PriceMinOnly_LeavesTheUpperBoundOpen', () => {
    expect(
      ids(
        filterAndSortEditModeItems(ITEMS, new Set(), {
          ...base,
          priceMin: 10,
          priceMax: NaN,
          hasPriceFilter: true,
        })
      )
    ).toEqual(['a2']);
  });

  it('PriceMaxOnly_LeavesTheLowerBoundOpen', () => {
    expect(
      ids(
        filterAndSortEditModeItems(ITEMS, new Set(), {
          ...base,
          priceMin: NaN,
          priceMax: 10,
          hasPriceFilter: true,
        })
      )
    ).toEqual(['a1']);
  });

  it('SelectedStores_FilterByStoreName', () => {
    expect(
      ids(
        filterAndSortEditModeItems(ITEMS, new Set(), {
          ...base,
          selectedStores: ['Target'],
        })
      )
    ).toEqual(['a2']);
  });

  it('DormantLegacyStoreName_DoesNotMatch', () => {
    // The DAL-selected store is Amazon; a legacy second row's name never
    // reaches the UI, so selecting it matches nothing.
    expect(
      ids(
        filterAndSortEditModeItems(ITEMS, new Set(), {
          ...base,
          selectedStores: ['LegacyEtsy'],
        })
      )
    ).toEqual([]);
  });

  it('PriceFilterActive_ExcludesIncompleteStoreItem', () => {
    const incomplete = item({
      id: 'a4',
      name: 'Durian',
      store: { name: 'Shop', price: '20.00', link: 'not-a-url' } as never,
    });
    expect(
      ids(
        filterAndSortEditModeItems([...ITEMS, incomplete], new Set(), {
          ...base,
          priceMin: 1,
          priceMax: NaN,
          hasPriceFilter: true,
        })
      )
    ).toEqual(['a1', 'a2']);
  });

  it('PriceFilter_BoundsByDisplayPrice', () => {
    expect(
      ids(
        filterAndSortEditModeItems(ITEMS, new Set(), {
          ...base,
          priceMin: 10,
          priceMax: NaN,
          hasPriceFilter: true,
        })
      )
    ).toEqual(['a2']);
  });

  it('Sort_OrdersByChosenKey', () => {
    expect(
      ids(
        filterAndSortEditModeItems(ITEMS, new Set(), {
          ...base,
          sort: 'name_desc',
        })
      )
    ).toEqual(['a3', 'a2', 'a1']);
  });
});
