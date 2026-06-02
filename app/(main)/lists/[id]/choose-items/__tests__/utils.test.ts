import { describe, expect, it } from 'vitest';
import { ItemDisplay } from '@/lib/types';
import {
  chooseItemsSaveLabel,
  collectStoreOptions,
  filterAndSortChooseItems,
  parseChooseItemsFilters,
} from '../utils';

function item(overrides: Partial<ItemDisplay>): ItemDisplay {
  return {
    id: 'x',
    name: 'Item',
    description: '',
    stores: [],
    purchases: [],
    ...overrides,
  } as ItemDisplay;
}

const ITEMS = [
  item({
    id: 'a1',
    name: 'Apple',
    description: 'red fruit',
    stores: [{ name: 'Amazon', price: '5.00', link: 'x' }] as never,
  }),
  item({
    id: 'a2',
    name: 'Banana',
    stores: [{ name: 'Target', price: '15.00', link: 'y' }] as never,
  }),
  item({ id: 'a3', name: 'Cherry' }),
];

const ids = (items: ItemDisplay[]) => items.map((i) => i.id);

describe('parseChooseItemsFilters', () => {
  it('NullSearchParams_ReturnsDefaults', () => {
    expect(parseChooseItemsFilters(null)).toEqual({
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
    expect(parseChooseItemsFilters(new URLSearchParams('sort=price_desc')).sort).toBe(
      'price_desc'
    );
  });

  it('InvalidSort_FallsBackToNameAsc', () => {
    expect(parseChooseItemsFilters(new URLSearchParams('sort=bogus')).sort).toBe(
      'name_asc'
    );
  });

  it('ShowOnOrOff_IsPreserved-OtherFallsBackToAll', () => {
    expect(parseChooseItemsFilters(new URLSearchParams('show=on')).show).toBe('on');
    expect(parseChooseItemsFilters(new URLSearchParams('show=off')).show).toBe(
      'off'
    );
    expect(parseChooseItemsFilters(new URLSearchParams('show=weird')).show).toBe(
      'all'
    );
  });

  it('PriceParams_SetHasPriceFilterAndTrimsQuery', () => {
    const parsed = parseChooseItemsFilters(
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
        item({ stores: [{ name: 'Zebra' }, { name: '' }] as never }),
        item({ stores: [{ name: 'Apple' }, { name: 'Zebra' }] as never }),
        item({ stores: undefined as never }),
      ])
    ).toEqual(['Apple', 'Zebra']);
  });
});

describe('filterAndSortChooseItems', () => {
  const base = parseChooseItemsFilters(null);

  it('ShowOn_KeepsOnlySelected', () => {
    expect(
      ids(filterAndSortChooseItems(ITEMS, new Set(['a1']), { ...base, show: 'on' }))
    ).toEqual(['a1']);
  });

  it('ShowOff_DropsSelected', () => {
    expect(
      ids(filterAndSortChooseItems(ITEMS, new Set(['a1']), { ...base, show: 'off' }))
    ).toEqual(['a2', 'a3']);
  });

  it('Query_MatchesNameOrDescription', () => {
    expect(ids(filterAndSortChooseItems(ITEMS, new Set(), { ...base, q: 'red' }))).toEqual(
      ['a1']
    );
  });

  it('SelectedStores_FilterByStoreName', () => {
    expect(
      ids(
        filterAndSortChooseItems(ITEMS, new Set(), {
          ...base,
          selectedStores: ['Target'],
        })
      )
    ).toEqual(['a2']);
  });

  it('PriceFilter_BoundsByDisplayPrice', () => {
    expect(
      ids(
        filterAndSortChooseItems(ITEMS, new Set(), {
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
      ids(filterAndSortChooseItems(ITEMS, new Set(), { ...base, sort: 'name_desc' }))
    ).toEqual(['a3', 'a2', 'a1']);
  });
});

describe('chooseItemsSaveLabel', () => {
  it('ManageMode_AlwaysSaveChanges', () => {
    expect(chooseItemsSaveLabel('manage', 5)).toBe('Save changes');
  });

  it('CreateModeNoSelection_ShowsSkip', () => {
    expect(chooseItemsSaveLabel('create', 0)).toBe('Skip');
  });

  it('CreateMode_PluralizesItemCount', () => {
    expect(chooseItemsSaveLabel('create', 1)).toBe('Add 1 item to list →');
    expect(chooseItemsSaveLabel('create', 2)).toBe('Add 2 items to list →');
  });
});
