import { describe, expect, it, vi } from 'vitest';
import type { FilterState } from '../types';
import {
  buildChips,
  buildQueryUrl,
  countActiveFilters,
  patchedParams,
  priceChipLabel,
  sortOptionsFor,
  toggledStoreParams,
} from '../utils';

function filterState(overrides: Partial<FilterState> = {}): FilterState {
  return {
    mode: 'items',
    sort: 'created_desc',
    defaultSort: 'created_desc',
    purchases: 'hide',
    show: 'all',
    selectedStores: [],
    priceMin: '',
    priceMax: '',
    ...overrides,
  };
}

describe('buildQueryUrl', () => {
  it('WithParams_ReturnsPathWithQueryString', () => {
    expect(buildQueryUrl('/items', new URLSearchParams('a=1&b=2'))).toBe(
      '/items?a=1&b=2'
    );
  });

  it('EmptyParams_ReturnsPathOnly', () => {
    expect(buildQueryUrl('/items', new URLSearchParams())).toBe('/items');
  });
});

describe('patchedParams', () => {
  it('NonEmptyValue_SetsParam', () => {
    const result = patchedParams(new URLSearchParams(''), { q: 'gift' });
    expect(result.get('q')).toBe('gift');
  });

  it('NullValue_DeletesParam', () => {
    const result = patchedParams(new URLSearchParams('q=old'), { q: null });
    expect(result.has('q')).toBe(false);
  });

  it('EmptyStringValue_DeletesParam', () => {
    const result = patchedParams(new URLSearchParams('q=old'), { q: '' });
    expect(result.has('q')).toBe(false);
  });

  it('UnpatchedKeys_Preserved', () => {
    const result = patchedParams(new URLSearchParams('a=1'), { b: '2' });
    expect(result.get('a')).toBe('1');
    expect(result.get('b')).toBe('2');
  });
});

describe('toggledStoreParams', () => {
  it('StoreAbsent_AppendsStoreAndRemovesPage', () => {
    const result = toggledStoreParams(new URLSearchParams('page=2'), 'Amazon');
    expect(result.getAll('store')).toEqual(['Amazon']);
    expect(result.has('page')).toBe(false);
  });

  it('StorePresent_RemovesThatStore', () => {
    const result = toggledStoreParams(
      new URLSearchParams('store=Amazon'),
      'Amazon'
    );
    expect(result.getAll('store')).toEqual([]);
  });

  it('MultipleStores_TogglesOnlyTarget', () => {
    const result = toggledStoreParams(
      new URLSearchParams('store=Amazon&store=Etsy'),
      'Amazon'
    );
    expect(result.getAll('store')).toEqual(['Etsy']);
  });
});

describe('sortOptionsFor', () => {
  it('ItemsMode_IncludesCreatedKeys', () => {
    const values = sortOptionsFor('items', true, true).map((o) => o.value);
    expect(values).toContain('created_desc');
    expect(values).toContain('created_asc');
    expect(values).not.toContain('list_order');
  });

  it('ListMode_IncludesListOrderNotCreated', () => {
    const values = sortOptionsFor('list', true, true).map((o) => o.value);
    expect(values).toContain('list_order');
    expect(values).not.toContain('created_desc');
  });

  it('NoStoreSort_ExcludesStoreKeys', () => {
    const values = sortOptionsFor('items', false, true).map((o) => o.value);
    expect(values).not.toContain('store_asc');
    expect(values).not.toContain('store_desc');
  });

  it('NoPriceSort_ExcludesPriceKeys', () => {
    const values = sortOptionsFor('items', true, false).map((o) => o.value);
    expect(values).not.toContain('price_asc');
    expect(values).not.toContain('price_desc');
  });

  it('AnyKey_CarriesItsLabel', () => {
    const nameAsc = sortOptionsFor('items', true, true).find(
      (o) => o.value === 'name_asc'
    );
    expect(nameAsc?.label).toBe('Name A–Z');
  });
});

describe('priceChipLabel', () => {
  it('BothBounds_RendersRange', () => {
    expect(priceChipLabel('10', '50')).toBe('$10–$50');
  });

  it('MinOnly_RendersFromLabel', () => {
    expect(priceChipLabel('10', '')).toBe('$10+');
  });

  it('MaxOnly_RendersUpToLabel', () => {
    expect(priceChipLabel('', '50')).toBe('Up to $50');
  });
});

describe('countActiveFilters', () => {
  it('AllDefault_ReturnsZero', () => {
    expect(countActiveFilters(filterState())).toBe(0);
  });

  it('NonDefaultSort_CountsOne', () => {
    expect(countActiveFilters(filterState({ sort: 'name_asc' }))).toBe(1);
  });

  it('NonChoosePurchases_CountsOne', () => {
    expect(countActiveFilters(filterState({ purchases: 'only' }))).toBe(1);
  });

  it('ChooseShow_CountsOne', () => {
    expect(
      countActiveFilters(
        filterState({ mode: 'choose', defaultSort: 'created_desc', show: 'on' })
      )
    ).toBe(1);
  });

  it('ChoosePurchases_NotCounted', () => {
    expect(
      countActiveFilters(
        filterState({ mode: 'choose', defaultSort: 'created_desc', purchases: 'only' })
      )
    ).toBe(0);
  });

  it('SelectedStores_CountedPerStore', () => {
    expect(
      countActiveFilters(filterState({ selectedStores: ['Amazon', 'Etsy'] }))
    ).toBe(2);
  });

  it('PriceBounds_CountedOnce', () => {
    expect(
      countActiveFilters(filterState({ priceMin: '10', priceMax: '50' }))
    ).toBe(1);
  });
});

describe('buildChips', () => {
  const noopHandlers = {
    updateParams: vi.fn(),
    removeStore: vi.fn(),
    clearPrice: vi.fn(),
  };

  it('AllDefault_ReturnsNoChips', () => {
    expect(buildChips(filterState(), noopHandlers)).toEqual([]);
  });

  it('NonDefaultSort_RendersSortChipClearingSortAndPage', () => {
    const updateParams = vi.fn();
    const chips = buildChips(filterState({ sort: 'name_asc' }), {
      updateParams,
      removeStore: vi.fn(),
      clearPrice: vi.fn(),
    });
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toBe('Name A–Z');
    chips[0].onClear();
    expect(updateParams).toHaveBeenCalledWith({ sort: null, page: null });
  });

  it('ItemsPurchasesOnly_RendersPurchasesChip', () => {
    const chips = buildChips(filterState({ purchases: 'only' }), noopHandlers);
    expect(chips.map((c) => c.label)).toEqual(['Only purchased']);
  });

  it('ListPurchasesUnlabeledValue_RendersNoChip', () => {
    const chips = buildChips(
      filterState({
        mode: 'list',
        sort: 'list_order',
        defaultSort: 'list_order',
        purchases: 'reveal',
      }),
      noopHandlers
    );
    expect(chips).toEqual([]);
  });

  it('ChooseShowOn_RendersShowChip', () => {
    const chips = buildChips(
      filterState({ mode: 'choose', defaultSort: 'created_desc', show: 'on' }),
      noopHandlers
    );
    expect(chips.map((c) => c.label)).toEqual(['On the list']);
  });

  it('ChooseShowUnlabeledValue_RendersNoChip', () => {
    const chips = buildChips(
      filterState({ mode: 'choose', defaultSort: 'created_desc', show: 'bogus' }),
      noopHandlers
    );
    expect(chips).toEqual([]);
  });

  it('SelectedStores_RenderChipPerStoreClearingViaRemoveStore', () => {
    const removeStore = vi.fn();
    const chips = buildChips(filterState({ selectedStores: ['Amazon', 'Etsy'] }), {
      updateParams: vi.fn(),
      removeStore,
      clearPrice: vi.fn(),
    });
    expect(chips.map((c) => c.label)).toEqual(['Amazon', 'Etsy']);
    chips[0].onClear();
    expect(removeStore).toHaveBeenCalledWith('Amazon');
  });

  it('PriceBounds_RendersPriceChipClearingViaClearPrice', () => {
    const clearPrice = vi.fn();
    const chips = buildChips(
      filterState({ priceMin: '10', priceMax: '50' }),
      { updateParams: vi.fn(), removeStore: vi.fn(), clearPrice }
    );
    expect(chips.map((c) => c.label)).toEqual(['$10–$50']);
    chips[0].onClear();
    expect(clearPrice).toHaveBeenCalledTimes(1);
  });
});
