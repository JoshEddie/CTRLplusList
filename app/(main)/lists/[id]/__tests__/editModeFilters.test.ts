import { describe, expect, it } from 'vitest';
import { ItemDisplay } from '@/lib/types';
import {
  filterEditModeItems,
  hasEditModeFilter,
  parseEditModeFilters,
  partitionEditModeItems,
} from '../editModeFilters';
import { entry } from './test-helpers';

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
const filters = (query = '') =>
  parseEditModeFilters(new URLSearchParams(query));

describe('parseEditModeFilters', () => {
  it('NullSearchParams_ReturnsDefaults', () => {
    expect(parseEditModeFilters(null)).toEqual({
      q: '',
      selectedStores: [],
      priceMin: NaN,
      priceMax: NaN,
      hasPriceFilter: false,
    });
  });

  it('PriceParams_SetHasPriceFilterAndTrimsQuery', () => {
    const parsed = filters('q=%20Apple%20&price_min=1&price_max=9&store=A');
    expect(parsed.q).toBe('apple');
    expect(parsed.priceMin).toBe(1);
    expect(parsed.priceMax).toBe(9);
    expect(parsed.hasPriceFilter).toBe(true);
    expect(parsed.selectedStores).toEqual(['A']);
  });
});

describe('hasEditModeFilter', () => {
  it('Defaults_ReturnsFalse', () => {
    expect(hasEditModeFilter(filters())).toBe(false);
  });

  it.each(['q=a', 'store=Amazon', 'price_min=1', 'price_max=1'])(
    'Param%s_ReturnsTrue',
    (query) => {
      expect(hasEditModeFilter(filters(query))).toBe(true);
    }
  );
});

describe('filterEditModeItems', () => {
  it('Query_MatchesNameOrDescription', () => {
    expect(ids(filterEditModeItems(ITEMS, filters('q=red')))).toEqual(['a1']);
  });

  it('QueryAgainstNamelessItem_TreatsMissingTextAsEmpty', () => {
    const nameless = item({
      id: 'n1',
      name: null as never,
      description: null as never,
    });
    expect(filterEditModeItems([nameless], filters('q=x'))).toEqual([]);
    expect(filterEditModeItems([nameless], filters())).toEqual([nameless]);
  });

  it('PriceMinOnly_LeavesTheUpperBoundOpen', () => {
    expect(ids(filterEditModeItems(ITEMS, filters('price_min=10')))).toEqual([
      'a2',
    ]);
  });

  it('PriceMaxOnly_LeavesTheLowerBoundOpen', () => {
    expect(ids(filterEditModeItems(ITEMS, filters('price_max=10')))).toEqual([
      'a1',
    ]);
  });

  it('SelectedStores_FilterByStoreName', () => {
    expect(ids(filterEditModeItems(ITEMS, filters('store=Target')))).toEqual([
      'a2',
    ]);
  });

  it('DormantLegacyStoreName_DoesNotMatch', () => {
    const dormant = item({
      id: 'd1',
      store: { name: 'Target', price: '', link: '' } as never,
    });
    expect(
      ids(filterEditModeItems([dormant, ...ITEMS], filters('store=Target')))
    ).toEqual(['d1', 'a2']);
  });

  it('PriceFilterActive_ExcludesIncompleteStoreItem', () => {
    const incomplete = item({
      id: 'i1',
      store: { name: 'Shop', price: '', link: '' } as never,
    });
    expect(
      ids(filterEditModeItems([incomplete, ...ITEMS], filters('price_min=0')))
    ).toEqual(['a1', 'a2']);
  });
});

describe('partitionEditModeItems', () => {
  it('Entries_KeepStagedOrderAboveAndNameOrderBelow', () => {
    const result = partitionEditModeItems(
      ITEMS,
      [entry('a3'), entry('a1')],
      filters()
    );
    expect(ids(result.inList)).toEqual(['a3', 'a1']);
    expect(ids(result.notInList)).toEqual(['a2']);
    expect(result.inListTotal).toBe(2);
    expect(result.notInListTotal).toBe(1);
  });

  it('Filtered_NarrowsBothSectionsAndKeepsUnfilteredTotals', () => {
    const result = partitionEditModeItems(
      ITEMS,
      [entry('a1')],
      filters('q=an')
    );
    expect(ids(result.inList)).toEqual([]);
    expect(ids(result.notInList)).toEqual(['a2']);
    expect(result.inListTotal).toBe(1);
    expect(result.notInListTotal).toBe(2);
  });

  it('EntryForUnknownItem_IsSkipped', () => {
    const result = partitionEditModeItems(ITEMS, [entry('ghost')], filters());
    expect(result.inList).toEqual([]);
    expect(result.inListTotal).toBe(0);
    expect(ids(result.notInList)).toEqual(['a1', 'a2', 'a3']);
  });

  it('NoEntries_PutsTheWholeLibraryBelowByName', () => {
    const shuffled = [ITEMS[2], ITEMS[0], ITEMS[1]];
    expect(
      ids(partitionEditModeItems(shuffled, [], filters()).notInList)
    ).toEqual(['a1', 'a2', 'a3']);
  });
});
