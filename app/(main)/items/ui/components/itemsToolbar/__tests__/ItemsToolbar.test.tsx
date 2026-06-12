/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The filters sheet (`role="dialog"` only while open), the scrim
 * (`role="presentation"`), the chip region, and the active-filter count badge
 * (`.popover-trigger-count`) are asserted structurally where no stable role or
 * accessible name exists.
 */
import {
  act,
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ItemsToolbar from '../ItemsToolbar';

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/items',
  search: '',
  nullParams: false,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
  useSearchParams: () =>
    nav.nullParams ? null : new URLSearchParams(nav.search),
}));

interface PriceStubProps {
  onApply: (min: string, max: string) => void;
  onClear: () => void;
}
vi.mock('../../PriceFilterPopover', () => ({
  default: ({ onApply, onClear }: PriceStubProps) => (
    <div>
      <button type="button" onClick={() => onApply('10', '50')}>
        price-apply
      </button>
      <button type="button" onClick={() => onApply('', '')}>
        price-apply-empty
      </button>
      <button type="button" onClick={onClear}>
        price-clear
      </button>
    </div>
  ),
}));

interface StoreStubProps {
  onToggle: (name: string) => void;
  onClear: () => void;
}
vi.mock('../../StoreFilterPopover', () => ({
  default: ({ onToggle, onClear }: StoreStubProps) => (
    <div>
      <button type="button" onClick={() => onToggle('Amazon')}>
        store-toggle
      </button>
      <button type="button" onClick={onClear}>
        store-clear
      </button>
    </div>
  ),
}));

type ToolbarProps = React.ComponentProps<typeof ItemsToolbar>;

function renderToolbar(overrides: Partial<ToolbarProps> = {}) {
  return render(
    <ItemsToolbar
      mode={overrides.mode ?? 'items'}
      storeOptions={overrides.storeOptions ?? []}
      showStoreSort={overrides.showStoreSort ?? true}
      showPriceSort={overrides.showPriceSort ?? true}
      showPriceFilter={overrides.showPriceFilter ?? true}
      showGridToggle={overrides.showGridToggle}
    />
  );
}

beforeEach(() => {
  nav.replace.mockReset();
  nav.pathname = '/items';
  nav.search = '';
  nav.nullParams = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

function openSheet() {
  fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));
}

describe('ItemsToolbar', () => {
  describe('Search', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('TypingBurst_CommitsOnceAfterDebounceWithPageRemoved', () => {
      nav.search = 'page=3';
      renderToolbar();
      const input = screen.getByRole('searchbox', { name: 'Search items' });
      fireEvent.change(input, { target: { value: 'gi' } });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.change(input, { target: { value: 'gift' } });
      expect(nav.replace).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(nav.replace).toHaveBeenCalledTimes(1);
      expect(nav.replace).toHaveBeenCalledWith('/items?q=gift');
    });

    it('SubDebounceWindow_NoCommit', () => {
      renderToolbar();
      fireEvent.change(
        screen.getByRole('searchbox', { name: 'Search items' }),
        { target: { value: 'abc' } }
      );
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(nav.replace).not.toHaveBeenCalled();
    });

    it('ClearButton_ResetsInputAndCommitsEmptyRemovingQAndPage', () => {
      nav.search = 'q=gift&page=2';
      renderToolbar();
      const input = screen.getByRole('searchbox', { name: 'Search items' });
      expect((input as HTMLInputElement).value).toBe('gift');
      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      expect((input as HTMLInputElement).value).toBe('');
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });
  });

  describe('FiltersTrigger', () => {
    it('Render_HasFiltersLabelOpenFiltersAriaAndDialogHaspopup', () => {
      renderToolbar();
      const trigger = screen.getByRole('button', { name: 'Open filters' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveTextContent('Filters');
    });

    it('ActiveFilters_CountBadgeEqualsActiveFilterCount', () => {
      nav.search = 'sort=name_asc&store=Amazon&price_min=5';
      const { container } = renderToolbar({ storeOptions: ['Amazon'] });
      expect(container.querySelector('.popover-trigger-count')).toHaveTextContent(
        '3'
      );
    });

    it('Click_OpensSheetWithDialogRole', () => {
      renderToolbar();
      expect(
        screen.queryByRole('dialog', { name: 'Filters' })
      ).not.toBeInTheDocument();
      openSheet();
      expect(
        screen.getByRole('dialog', { name: 'Filters' })
      ).toBeInTheDocument();
    });
  });

  describe('SheetDismiss', () => {
    it('CloseButton_ClosesSheet', () => {
      renderToolbar();
      openSheet();
      fireEvent.click(screen.getByRole('button', { name: 'Close filters' }));
      expect(
        screen.queryByRole('dialog', { name: 'Filters' })
      ).not.toBeInTheDocument();
    });

    it('DoneButton_ClosesSheet', () => {
      renderToolbar();
      openSheet();
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(
        screen.queryByRole('dialog', { name: 'Filters' })
      ).not.toBeInTheDocument();
    });

    it('ScrimClick_ClosesSheet', () => {
      const { container } = renderToolbar();
      openSheet();
      const scrim = container.querySelector('.items-toolbar-filters-scrim');
      expect(scrim).not.toBeNull();
      fireEvent.click(scrim as Element);
      expect(
        screen.queryByRole('dialog', { name: 'Filters' })
      ).not.toBeInTheDocument();
    });

    it('EscapeKeydown_ClosesSheet', () => {
      renderToolbar();
      openSheet();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(
        screen.queryByRole('dialog', { name: 'Filters' })
      ).not.toBeInTheDocument();
    });

    it('NonEscapeKeydown_KeepsSheetOpen', () => {
      renderToolbar();
      openSheet();
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(
        screen.getByRole('dialog', { name: 'Filters' })
      ).toBeInTheDocument();
    });

    it('OpenClose_EscapeListenerAttachedWhileOpenRemovedOnCloseAndUnmount', () => {
      const add = vi.spyOn(document, 'addEventListener');
      const remove = vi.spyOn(document, 'removeEventListener');
      const keydownAdds = () =>
        add.mock.calls.filter((c) => c[0] === 'keydown').length;
      const keydownRemoves = () =>
        remove.mock.calls.filter((c) => c[0] === 'keydown').length;

      const { unmount } = renderToolbar();
      expect(keydownAdds()).toBe(0);
      openSheet();
      expect(keydownAdds()).toBe(1);
      fireEvent.click(screen.getByRole('button', { name: 'Close filters' }));
      expect(keydownRemoves()).toBe(1);
      openSheet();
      expect(keydownAdds()).toBe(2);
      unmount();
      expect(keydownRemoves()).toBe(2);
      add.mockRestore();
      remove.mockRestore();
    });
  });

  describe('Selects', () => {
    it('SortNonDefault_ReplaceSetsSortRemovesPage', () => {
      nav.search = 'page=2';
      renderToolbar();
      fireEvent.change(screen.getByRole('combobox', { name: 'Sort items' }), {
        target: { value: 'name_asc' },
      });
      expect(nav.replace).toHaveBeenCalledWith('/items?sort=name_asc');
    });

    it('SortDefaultChosen_ReplaceRemovesSortParam', () => {
      nav.search = 'sort=name_asc';
      renderToolbar();
      fireEvent.change(screen.getByRole('combobox', { name: 'Sort items' }), {
        target: { value: 'created_desc' },
      });
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('PurchasesHide_ReplaceRemovesPurchasesParam', () => {
      nav.search = 'purchases=only';
      renderToolbar();
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Purchases filter' }),
        { target: { value: 'hide' } }
      );
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('PurchasesNonDefault_ReplaceSetsPurchasesRemovesPage', () => {
      nav.search = 'page=2';
      renderToolbar();
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Purchases filter' }),
        { target: { value: 'only' } }
      );
      expect(nav.replace).toHaveBeenCalledWith('/items?purchases=only');
    });

    it('ShowNonDefault_ReplaceSetsShowRemovesPage', () => {
      nav.search = 'page=2';
      renderToolbar({ mode: 'choose' });
      fireEvent.change(
        screen.getByRole('combobox', {
          name: 'Show items by list membership',
        }),
        { target: { value: 'on' } }
      );
      expect(nav.replace).toHaveBeenCalledWith('/items?show=on');
    });

    it('ShowAll_ReplaceRemovesShowParam', () => {
      nav.search = 'show=on';
      renderToolbar({ mode: 'choose' });
      fireEvent.change(
        screen.getByRole('combobox', {
          name: 'Show items by list membership',
        }),
        { target: { value: 'all' } }
      );
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });
  });

  describe('ViewToggle', () => {
    it('ShowGridToggleDefault_RendersSegmentedControl', () => {
      renderToolbar();
      expect(
        screen.getByRole('radiogroup', { name: 'View toggle' })
      ).toBeInTheDocument();
    });

    it('ShowGridToggleFalse_NoViewCell', () => {
      renderToolbar({ showGridToggle: false });
      expect(
        screen.queryByRole('radiogroup', { name: 'View toggle' })
      ).not.toBeInTheDocument();
    });

    it('SelectGrid_ReplaceRemovesViewParam', () => {
      nav.search = 'view=list';
      renderToolbar();
      fireEvent.click(screen.getByRole('radio', { name: 'Grid view' }));
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('SelectList_ReplaceSetsViewList', () => {
      renderToolbar();
      fireEvent.click(screen.getByRole('radio', { name: 'List view' }));
      expect(nav.replace).toHaveBeenCalledWith('/items?view=list');
    });
  });

  describe('ChipMatrix', () => {
    const cases: Array<{
      name: string;
      mode: ToolbarProps['mode'];
      search: string;
      storeOptions?: string[];
      labels: string[];
      removeParamGone: string;
    }> = [
      {
        name: 'ModeItemsSort',
        mode: 'items',
        search: 'sort=name_asc',
        labels: ['Name A–Z'],
        removeParamGone: 'sort',
      },
      {
        name: 'ModeItemsPurchasesOnly',
        mode: 'items',
        search: 'purchases=only',
        labels: ['Only purchased'],
        removeParamGone: 'purchases',
      },
      {
        name: 'ModeListPurchasesNone',
        mode: 'list',
        search: 'purchases=none',
        labels: ['Only not purchased'],
        removeParamGone: 'purchases',
      },
      {
        name: 'ModeChooseShowOn',
        mode: 'choose',
        search: 'show=on',
        labels: ['On the list'],
        removeParamGone: 'show',
      },
      {
        name: 'ModeItemsStore',
        mode: 'items',
        search: 'store=Amazon',
        storeOptions: ['Amazon'],
        labels: ['Amazon'],
        removeParamGone: 'store',
      },
      {
        name: 'ModeItemsPriceRange',
        mode: 'items',
        search: 'price_min=10&price_max=50',
        labels: ['$10–$50'],
        removeParamGone: 'price_min',
      },
      {
        name: 'ModeItemsPriceMin',
        mode: 'items',
        search: 'price_min=10',
        labels: ['$10+'],
        removeParamGone: 'price_min',
      },
      {
        name: 'ModeItemsPriceMax',
        mode: 'items',
        search: 'price_max=50',
        labels: ['Up to $50'],
        removeParamGone: 'price_max',
      },
    ];

    for (const c of cases) {
      it(`${c.name}_RendersExpectedChips`, () => {
        nav.search = c.search;
        renderToolbar({ mode: c.mode, storeOptions: c.storeOptions ?? [] });
        const region = screen.getByRole('region', { name: 'Active filters' });
        const chipButtons = within(region).getAllByRole('button', {
          name: /^Remove filter:/,
        });
        expect(chipButtons).toHaveLength(c.labels.length);
        for (const label of c.labels) {
          expect(region).toHaveTextContent(label);
        }
        fireEvent.click(chipButtons[0]);
        expect(nav.replace).toHaveBeenCalledTimes(1);
        const replacedWith = nav.replace.mock.calls[0][0] as string;
        expect(replacedWith).not.toContain(`${c.removeParamGone}=`);
      });
    }

    it('NoActiveFilters_RendersNoChipRow', () => {
      renderToolbar();
      expect(
        screen.queryByRole('region', { name: 'Active filters' })
      ).not.toBeInTheDocument();
    });

    it('ModeListPurchasesUnlabeledValue_RendersNoChipRow', () => {
      nav.search = 'purchases=reveal';
      renderToolbar({ mode: 'list' });
      expect(
        screen.queryByRole('region', { name: 'Active filters' })
      ).not.toBeInTheDocument();
    });

    it('ModeChooseShowUnlabeledValue_RendersNoChipRow', () => {
      nav.search = 'show=bogus';
      renderToolbar({ mode: 'choose' });
      expect(
        screen.queryByRole('region', { name: 'Active filters' })
      ).not.toBeInTheDocument();
    });
  });

  describe('DefaultsAndOptions', () => {
    it('ModeList_DefaultSortListOrder', () => {
      renderToolbar({ mode: 'list' });
      expect(
        (screen.getByRole('combobox', { name: 'Sort items' }) as HTMLSelectElement)
          .value
      ).toBe('list_order');
    });

    it('ModeItems_DefaultSortCreatedDesc', () => {
      renderToolbar({ mode: 'items' });
      expect(
        (screen.getByRole('combobox', { name: 'Sort items' }) as HTMLSelectElement)
          .value
      ).toBe('created_desc');
    });

    it('NullSearchParams_FallsBackToDefaults', () => {
      nav.nullParams = true;
      renderToolbar({ mode: 'items' });
      expect(
        (
          screen.getByRole('combobox', {
            name: 'Sort items',
          }) as HTMLSelectElement
        ).value
      ).toBe('created_desc');
      expect(
        (
          screen.getByRole('searchbox', {
            name: 'Search items',
          }) as HTMLInputElement
        ).value
      ).toBe('');
      expect(
        (
          screen.getByRole('combobox', {
            name: 'Purchases filter',
          }) as HTMLSelectElement
        ).value
      ).toBe('hide');
      expect(
        screen.queryByRole('region', { name: 'Active filters' })
      ).not.toBeInTheDocument();
    });

    it('NoStoreSort_ExcludesStoreSortOptions', () => {
      renderToolbar({ showStoreSort: false });
      const select = screen.getByRole('combobox', { name: 'Sort items' });
      expect(
        within(select).queryByRole('option', { name: 'Store A–Z' })
      ).not.toBeInTheDocument();
    });

    it('NoPriceSort_ExcludesPriceSortOptions', () => {
      renderToolbar({ showPriceSort: false });
      const select = screen.getByRole('combobox', { name: 'Sort items' });
      expect(
        within(select).queryByRole('option', { name: 'Price Low' })
      ).not.toBeInTheDocument();
    });
  });

  describe('PopoverWiring', () => {
    it('PriceStub_OnApplyCallsUpdateParamsWithPriceAndPageRemoved', () => {
      nav.search = 'page=2';
      renderToolbar({ showPriceFilter: true });
      fireEvent.click(screen.getByText('price-apply'));
      expect(nav.replace).toHaveBeenCalledWith(
        '/items?price_min=10&price_max=50'
      );
    });

    it('PriceStub_OnClearRemovesPriceParams', () => {
      nav.search = 'price_min=10&price_max=50&page=2';
      renderToolbar({ showPriceFilter: true });
      fireEvent.click(screen.getByText('price-clear'));
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('PriceStub_OnApplyEmptyBoundsRemovesPriceParams', () => {
      nav.search = 'price_min=10&price_max=50';
      renderToolbar({ showPriceFilter: true });
      fireEvent.click(screen.getByText('price-apply-empty'));
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('StoreStub_OnToggleAppendsOrRemovesStoreParam', () => {
      const { unmount } = renderToolbar({ storeOptions: ['Amazon'] });
      fireEvent.click(screen.getByText('store-toggle'));
      expect(nav.replace).toHaveBeenCalledWith('/items?store=Amazon');
      unmount();

      nav.replace.mockReset();
      nav.search = 'store=Amazon';
      renderToolbar({ storeOptions: ['Amazon'] });
      fireEvent.click(screen.getByText('store-toggle'));
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });

    it('StoreStub_OnClearRemovesStoreParam', () => {
      nav.search = 'store=Amazon&page=2';
      renderToolbar({ storeOptions: ['Amazon'] });
      fireEvent.click(screen.getByText('store-clear'));
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });
  });
});
