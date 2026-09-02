/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The view-mode wrapper classes (`.item-grid` / `.item-list`) and the
 * filtered-empty wrapper (`.items-empty-filtered`) are class-only layout nodes
 * with no role; structural queries are the only way to assert them.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemDisplay, ItemStoreTable } from '@/lib/types';
import ItemsBrowser from '../ItemsBrowser';
import {
  HERO_SLOT_READY_EVENT,
  HERO_TOOLBAR_SLOT_ID,
} from '@/app/(main)/lists/ui/components/ListHeroSurface';

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/items',
  search: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('../Item', () => ({
  default: ({ item, tier }: { item: ItemDisplay; tier?: string }) => (
    <div data-testid="item-stub" data-item-id={item.id} data-tier={String(tier)} />
  ),
}));
vi.mock('../PriceFilterPopover', () => ({ default: () => <div /> }));
vi.mock('../StoreFilterPopover', () => ({
  default: ({ storeOptions }: { storeOptions: string[] }) => (
    <div
      data-testid="store-filter-stub"
      data-options={storeOptions.join(',')}
    />
  ),
}));

function store(
  name: string,
  price: string,
  link: string = 'https://example.com'
): ItemStoreTable {
  return { name, price, link };
}

function makeItem(
  id: string,
  overrides: Partial<ItemDisplay> = {}
): ItemDisplay {
  return {
    id,
    name: `Item ${id}`,
    description: '',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    profile_id: 'p1',
    ...overrides,
  };
}

type BrowserProps = React.ComponentProps<typeof ItemsBrowser>;

function renderBrowser(
  items: ItemDisplay[],
  overrides: Partial<BrowserProps> = {}
) {
  return render(
    <ItemsBrowser
      items={items}
      mode={overrides.mode ?? 'list'}
      initialPageSize={overrides.initialPageSize}
      actor={overrides.actor}
      tier={overrides.tier}
      baseline={overrides.baseline}
    />
  );
}

function visibleIds(): string[] {
  return screen
    .queryAllByTestId('item-stub')
    .map((el) => el.getAttribute('data-item-id') as string);
}

beforeEach(() => {
  nav.replace.mockReset();
  nav.pathname = '/items';
  nav.search = '';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ItemsBrowser', () => {
  describe('Filter', () => {
    it('SearchQuery_MatchesNameAndDescriptionCaseInsensitive', () => {
      nav.search = 'q=gift';
      renderBrowser([
        makeItem('a', { name: 'Gift Card' }),
        makeItem('b', { name: 'Toy', description: 'a lovely GIFT idea' }),
        makeItem('c', { name: 'Book', description: 'reading' }),
      ]);
      expect(visibleIds().sort()).toEqual(['a', 'b']);
    });

    it('MultiStore_KeepsItemsMatchingAnySelectedStore', () => {
      nav.search = 'store=Amazon&store=Etsy';
      renderBrowser([
        makeItem('amazon', { store: store('Amazon', '20') }),
        makeItem('etsy', { store: store('Etsy', '20') }),
        makeItem('other', { store: store('Other', '20') }),
      ]);
      expect(visibleIds().sort()).toEqual(['amazon', 'etsy']);
    });

    it('DormantLegacyStoreName_NeitherMatchesNorAppearsAsOption', () => {
      // The DAL selected Amazon; the legacy second row (Etsy) never reaches
      // the UI, so filtering on it matches nothing and offers no option.
      nav.search = 'store=Etsy';
      renderBrowser([makeItem('legacy', { store: store('Amazon', '20') })]);
      expect(visibleIds()).toEqual([]);
      const stubs = screen.getAllByTestId('store-filter-stub');
      expect(stubs[0]).toHaveAttribute('data-options', 'Amazon');
    });

    it('PriceRange_InclusiveExcludesNonFinitePrice', () => {
      nav.search = 'price_min=10&price_max=50';
      renderBrowser([
        makeItem('p10', { store: store('A', '10') }),
        makeItem('p50', { store: store('A', '50') }),
        makeItem('p5', { store: store('A', '5') }),
        makeItem('p60', { store: store('A', '60') }),
        makeItem('pNaN', { store: { name: 'A', link: '', price: '30' } }),
      ]);
      expect(visibleIds().sort()).toEqual(['p10', 'p50']);
    });

    it('PriceMinOnly_TreatsMaxAsUnbounded', () => {
      nav.search = 'price_min=10';
      renderBrowser([
        makeItem('p5', { store: store('A', '5') }),
        makeItem('p10', { store: store('A', '10') }),
        makeItem('p100', { store: store('A', '100') }),
      ]);
      expect(visibleIds().sort()).toEqual(['p10', 'p100']);
    });

    it('PriceMaxOnly_TreatsMinAsUnbounded', () => {
      nav.search = 'price_max=50';
      renderBrowser([
        makeItem('p5', { store: store('A', '5') }),
        makeItem('p50', { store: store('A', '50') }),
        makeItem('p60', { store: store('A', '60') }),
      ]);
      expect(visibleIds().sort()).toEqual(['p5', 'p50']);
    });

    it('ItemMissingNameOrDescription_SearchesAvailableFieldWithoutCrashing', () => {
      nav.search = 'q=gift';
      renderBrowser(
        [
          makeItem('byDesc', {
            name: undefined as unknown as string,
            description: 'a lovely gift',
          }),
          makeItem('byName', {
            name: 'Gift box',
            description: undefined as unknown as string,
          }),
          makeItem('neither', { name: 'Toy', description: 'fun' }),
        ],
        { mode: 'list' }
      );
      expect(visibleIds().sort()).toEqual(['byDesc', 'byName']);
    });

    it('MultipleFilters_ComposeConjunctively', () => {
      nav.search = 'q=gift&store=Amazon&price_min=10&price_max=50';
      renderBrowser([
        makeItem('match', {
          name: 'Gift',
          store: store('Amazon', '20'),
        }),
        makeItem('failStore', {
          name: 'Gift',
          store: store('Other', '20'),
        }),
        makeItem('failPrice', {
          name: 'Gift',
          store: store('Amazon', '200'),
        }),
        makeItem('failName', {
          name: 'Toy',
          store: store('Amazon', '20'),
        }),
      ]);
      expect(visibleIds()).toEqual(['match']);
    });
  });

  describe('Sort', () => {
    it('SortPriceAsc_OrdersFilteredResult', () => {
      nav.search = 'sort=price_asc';
      renderBrowser(
        [
          makeItem('i1', { store: store('A', '30') }),
          makeItem('i2', { store: store('A', '10') }),
          makeItem('i3', { store: store('A', '20') }),
        ],
        { mode: 'items' }
      );
      expect(visibleIds()).toEqual(['i2', 'i3', 'i1']);
    });

    it('ListOrder_PreservesInputOrder', () => {
      renderBrowser([makeItem('a'), makeItem('b'), makeItem('c')], {
        mode: 'list',
      });
      expect(visibleIds()).toEqual(['a', 'b', 'c']);
    });

    it('UnknownSortParam_FallsBackToModeDefault', () => {
      nav.search = 'sort=not_a_real_key';
      renderBrowser(
        [
          makeItem('old', { created_at: new Date('2024-01-01T00:00:00Z') }),
          makeItem('new', { created_at: new Date('2024-06-01T00:00:00Z') }),
        ],
        { mode: 'items' }
      );
      expect(visibleIds()).toEqual(['new', 'old']);
    });
  });

  describe('StoreOptions', () => {
    it('StoresAllNameless_ExcludeStoreSortOptions', () => {
      renderBrowser(
        [makeItem('a', { store: { name: '', link: 'https://x', price: '1' } })],
        { mode: 'list' }
      );
      const select = screen.getByRole('combobox', { name: 'Sort items' });
      expect(
        within(select).queryByRole('option', { name: 'Store A–Z' })
      ).not.toBeInTheDocument();
    });

    it('NamedStore_IncludesStoreSortOptions', () => {
      renderBrowser([makeItem('a', { store: store('Amazon', '1') })], {
        mode: 'list',
      });
      const select = screen.getByRole('combobox', { name: 'Sort items' });
      expect(
        within(select).getByRole('option', { name: 'Store A–Z' })
      ).toBeInTheDocument();
    });
  });

  describe('Paginate', () => {
    const many = Array.from({ length: 30 }, (_, i) => makeItem(`i${i}`));

    it('PageTwo_RendersCorrectSlice', () => {
      nav.search = 'page=2';
      renderBrowser(many, { mode: 'list' });
      expect(visibleIds()).toEqual(
        Array.from({ length: 6 }, (_, i) => `i${i + 24}`)
      );
    });

    it('TotalPages_CeilOfCountOverPageSize', () => {
      renderBrowser(many, { mode: 'list' });
      expect(
        screen.getByRole('button', { name: 'Page 2' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Page 3' })
      ).not.toBeInTheDocument();
    });
  });

  describe('PageClamp', () => {
    const many = Array.from({ length: 30 }, (_, i) => makeItem(`i${i}`));

    it('OverRangePage_ClampsToLastPage', () => {
      nav.search = 'page=999';
      renderBrowser(many, { mode: 'list' });
      expect(visibleIds()).toEqual(
        Array.from({ length: 6 }, (_, i) => `i${i + 24}`)
      );
    });

    it('NonPositiveOrNonNumericPage_ResolvesToPageOne', () => {
      nav.search = 'page=0';
      const { unmount } = renderBrowser(many, { mode: 'list' });
      expect(visibleIds()[0]).toBe('i0');
      expect(visibleIds()).toHaveLength(24);
      unmount();

      nav.search = 'page=abc';
      renderBrowser(many, { mode: 'list' });
      expect(visibleIds()[0]).toBe('i0');
      expect(visibleIds()).toHaveLength(24);
    });
  });

  describe('EmptyFiltered', () => {
    it('NoItemsMatch_RendersEmptyFilteredState', () => {
      nav.search = 'q=zzz';
      const { container } = renderBrowser([makeItem('a', { name: 'Gift' })]);
      expect(container.querySelector('.items-empty-filtered')).not.toBeNull();
      expect(
        screen.getByText('No items match your filters.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Clear filters' })
      ).toBeInTheDocument();
    });

    it('ClearFilters_RemovesQStorePricePageParams', () => {
      nav.search = 'q=zzz&store=A&price_min=1&price_max=2&page=3';
      renderBrowser([makeItem('a', { name: 'Gift' })]);
      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('ClearFiltersWithSort_KeepsNonFilterParams', () => {
      nav.search = 'q=zzz&sort=name_asc';
      renderBrowser([makeItem('a', { name: 'Gift' })], { mode: 'items' });
      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(nav.replace).toHaveBeenCalledWith('/items?sort=name_asc');
    });
  });

  describe('Tier', () => {
    const tierOf = () =>
      screen.getByTestId('item-stub').getAttribute('data-tier');

    it('ResolvedTier_ReachesEachItem', () => {
      renderBrowser([makeItem('a')], { tier: 'claims' });
      expect(tierOf()).toBe('claims');
    });

    it('AbsentTier_ReachesItemAsUndefined', () => {
      renderBrowser([makeItem('a')]);
      expect(tierOf()).toBe('undefined');
    });
  });

  describe('ViewMode', () => {
    it('ViewListParam_PassesListToItems', () => {
      nav.search = 'view=list';
      const { container } = renderBrowser([makeItem('a')]);
      expect(container.querySelector('.item-list')).not.toBeNull();
      expect(container.querySelector('.item-grid')).toBeNull();
    });

    it('ViewParamAbsentOrOther_PassesGridToItems', () => {
      const { container } = renderBrowser([makeItem('a')]);
      expect(container.querySelector('.item-grid')).not.toBeNull();
      expect(container.querySelector('.item-list')).toBeNull();
    });
  });

  describe('PageSize', () => {
    const many = Array.from({ length: 30 }, (_, i) => makeItem(`i${i}`));
    let cookieWrites: string[];

    beforeEach(() => {
      cookieWrites = [];
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => '',
        set: (v: string) => {
          cookieWrites.push(v);
        },
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(document, 'cookie');
    });

    it('ChangePageSize_WritesItemsPageSizeCookieWithAttrsAndRemovesPage', () => {
      nav.search = 'page=2';
      renderBrowser(many, { mode: 'list' });
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Items per page' }),
        { target: { value: '48' } }
      );
      expect(cookieWrites).toContain(
        'items_page_size=48; path=/; max-age=31536000; SameSite=Lax'
      );
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('ChangePageSizeWithOtherParam_KeepsItAndRemovesPage', () => {
      nav.search = 'sort=name_asc&page=2';
      renderBrowser(many, { mode: 'list' });
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Items per page' }),
        { target: { value: '48' } }
      );
      expect(nav.replace).toHaveBeenCalledWith('/items?sort=name_asc');
    });

    it('OffListSize_NormalizesToDefault24', () => {
      renderBrowser(many, { mode: 'list', initialPageSize: 30 });
      expect(
        screen.getByRole('button', { name: 'Page 2' })
      ).toBeInTheDocument();
    });

    it('ValidOption_KeptAsIs', () => {
      renderBrowser(many, { mode: 'list', initialPageSize: 48 });
      expect(
        screen.queryByRole('button', { name: 'Page 2' })
      ).not.toBeInTheDocument();
    });
  });

  describe('MemoBehavior', () => {
    it('StoreSetChange_RecomputesVisibleItems', () => {
      const items = [
        makeItem('amazon', { store: store('Amazon', '10') }),
        makeItem('etsy', { store: store('Etsy', '10') }),
      ];
      const { rerender } = renderBrowser(items, { mode: 'list' });
      expect(visibleIds().sort()).toEqual(['amazon', 'etsy']);

      nav.search = 'store=Amazon';
      rerender(<ItemsBrowser items={items} mode="list" />);
      expect(visibleIds()).toEqual(['amazon']);
    });
  });

  describe('ToolbarSlot', () => {
    function addSlot() {
      const el = document.createElement('div');
      el.id = HERO_TOOLBAR_SLOT_ID;
      document.body.appendChild(el);
      return el;
    }

    afterEach(() => {
      document.getElementById(HERO_TOOLBAR_SLOT_ID)?.remove();
    });

    it('SlotPresent_ToolbarRendersInsideItRatherThanInline', () => {
      const target = addSlot();
      const { container } = renderBrowser([makeItem('a')], { mode: 'list' });
      expect(target.querySelector('.items-toolbar')).not.toBeNull();
      expect(container.querySelector('.items-toolbar')).toBeNull();
    });

    it('SlotAppearsAfterMount_ToolbarMovesInOnTheReadyEvent', () => {
      const { container } = renderBrowser([makeItem('a')], { mode: 'list' });
      expect(container.querySelector('.items-toolbar')).not.toBeNull();

      const target = addSlot();
      fireEvent(window, new Event(HERO_SLOT_READY_EVENT));
      expect(target.querySelector('.items-toolbar')).not.toBeNull();
      expect(container.querySelector('.items-toolbar')).toBeNull();
    });
  });
});
