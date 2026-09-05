import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SortKey } from '@/lib/types';
import { FiltersSheet } from '../FiltersSheet';

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

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'created_desc', label: 'Newest' },
  { value: 'name_asc', label: 'Name A–Z' },
];

type SheetProps = React.ComponentProps<typeof FiltersSheet>;

function renderSheet(overrides: Partial<SheetProps> = {}) {
  const props: SheetProps = {
    open: overrides.open ?? true,
    onClose: overrides.onClose ?? vi.fn(),
    mode: overrides.mode ?? 'items',
    sort: overrides.sort ?? 'created_desc',
    defaultSort: overrides.defaultSort ?? 'created_desc',
    sortOptions: overrides.sortOptions ?? SORT_OPTIONS,
    show: overrides.show ?? 'all',
    storeOptions: overrides.storeOptions ?? ['Amazon'],
    selectedStores: overrides.selectedStores ?? [],
    showPriceFilter: overrides.showPriceFilter ?? true,
    priceMin: overrides.priceMin ?? '',
    priceMax: overrides.priceMax ?? '',
    updateParams: overrides.updateParams ?? vi.fn(),
    toggleStore: overrides.toggleStore ?? vi.fn(),
    clearStores: overrides.clearStores ?? vi.fn(),
    applyPrice: overrides.applyPrice ?? vi.fn(),
    clearPrice: overrides.clearPrice ?? vi.fn(),
    filterCount: overrides.filterCount ?? 0,
    clearAll: overrides.clearAll ?? vi.fn(),
  };
  return render(<FiltersSheet {...props} />);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('FiltersSheet', () => {
  describe('OpenState', () => {
    it('Open_ExposesDialogRole', () => {
      renderSheet({ open: true });
      expect(
        screen.getByRole('dialog', { name: 'Filters' })
      ).toBeInTheDocument();
    });

    it('Closed_HasNoDialogRole', () => {
      renderSheet({ open: false });
      expect(
        screen.queryByRole('dialog', { name: 'Filters' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Dismiss', () => {
    it('DoneButton_CallsOnClose', () => {
      const onClose = vi.fn();
      renderSheet({ onClose });
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });


  describe('Navigation', () => {
    const storeRow = () =>
      screen.getByRole('button', { name: 'Filter by store' });
    const priceRow = () =>
      screen.getByRole('button', { name: 'Filter by price' });
    // The sheet's accessible name follows the level it is showing.
    const level = () => screen.getByRole('dialog').getAttribute('aria-label');

    it('RootLevel_ShowsFacetRowsWithoutTheirPanels', () => {
      renderSheet();
      expect(storeRow()).toBeInTheDocument();
      expect(priceRow()).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Amazon' })
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Min')).not.toBeInTheDocument();
      expect(level()).toBe('Filters');
    });

    it('StoreRowTapped_ReplacesRootWithStorePanel', () => {
      renderSheet();
      fireEvent.click(storeRow());
      expect(
        screen.getByRole('checkbox', { name: 'Amazon' })
      ).toBeInTheDocument();
      expect(level()).toBe('Stores');
    });

    it('PriceRowTapped_ReplacesRootWithPricePanel', () => {
      renderSheet();
      fireEvent.click(priceRow());
      expect(screen.getByLabelText('Min')).toBeInTheDocument();
      expect(level()).toBe('Price');
    });

    it('BackFromPanel_ReturnsToRootLevel', () => {
      renderSheet();
      fireEvent.click(storeRow());
      fireEvent.click(screen.getByRole('button', { name: 'Back to filters' }));
      expect(
        screen.queryByRole('checkbox', { name: 'Amazon' })
      ).not.toBeInTheDocument();
      expect(storeRow()).toBeInTheDocument();
      expect(level()).toBe('Filters');
    });

    it('RootLevel_HasNoBackAffordance', () => {
      renderSheet();
      expect(
        screen.queryByRole('button', { name: 'Back to filters' })
      ).not.toBeInTheDocument();
    });

    it('DrilledPanel_HasNoCloseBesideTheBackAffordance', () => {
      renderSheet();
      fireEvent.click(storeRow());
      expect(
        screen.queryByRole('button', { name: 'Close filters' })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Back to filters' })
      ).toBeInTheDocument();
    });

    it('DrilledPanel_CarriesNoOwnClearOrDoneFooter', () => {
      renderSheet();
      fireEvent.click(storeRow());
      expect(screen.getAllByRole('button', { name: 'Done' })).toHaveLength(1);
      expect(
        screen.queryByRole('button', { name: 'Clear' })
      ).not.toBeInTheDocument();
    });

    it('DrilledPanel_DoneStillClosesTheWholeSheet', () => {
      const onClose = vi.fn();
      renderSheet({ onClose });
      fireEvent.click(priceRow());
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('DrilledLevel_ExposesActiveFacetForStyling', () => {
      renderSheet();
      expect(screen.getByRole('dialog')).not.toHaveAttribute('data-facet');
      fireEvent.click(priceRow());
      expect(screen.getByRole('dialog')).toHaveAttribute('data-facet', 'price');
    });
  });

  describe('ClearAll', () => {
    it('ActiveFilters_ClearInvokesHandler', () => {
      const clearAll = vi.fn();
      renderSheet({ filterCount: 2, clearAll });
      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
      expect(clearAll).toHaveBeenCalledTimes(1);
    });

    it('NoActiveFilters_ClearIsDisabled', () => {
      renderSheet({ filterCount: 0 });
      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    });

    it('DrilledIntoFacet_ClearIsReplacedByBack', () => {
      renderSheet({ filterCount: 1 });
      fireEvent.click(screen.getByRole('button', { name: 'Filter by store' }));
      expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Back to filters' })
      ).toBeInTheDocument();
    });
  });

  describe('PricePanelExit', () => {
    // PriceField is cents-as-integer: the digit string "5000" becomes 50.00.
    const typeMin = (digits: string) =>
      fireEvent.change(screen.getByLabelText('Min'), {
        target: { value: digits },
      });

    it('BackBeforeDebounceFires_CommitsTheTypedPrice', () => {
      const applyPrice = vi.fn();
      renderSheet({ applyPrice });
      fireEvent.click(screen.getByRole('button', { name: 'Filter by price' }));
      typeMin('5000');
      fireEvent.click(screen.getByRole('button', { name: 'Back to filters' }));
      expect(applyPrice).toHaveBeenCalledWith('50.00', '');
    });

    it('UnmountBeforeDebounceFires_CommitsTheTypedPrice', () => {
      const applyPrice = vi.fn();
      const { unmount } = renderSheet({ applyPrice });
      fireEvent.click(screen.getByRole('button', { name: 'Filter by price' }));
      typeMin('5000');
      unmount();
      expect(applyPrice).toHaveBeenCalledWith('50.00', '');
    });
  });

  describe('SortSelect', () => {
    it('NonDefaultChosen_UpdatesSortAndRemovesPage', () => {
      const updateParams = vi.fn();
      renderSheet({ updateParams });
      fireEvent.change(screen.getByRole('combobox', { name: 'Sort items' }), {
        target: { value: 'name_asc' },
      });
      expect(updateParams).toHaveBeenCalledWith({
        sort: 'name_asc',
        page: null,
      });
    });

    it('DefaultChosen_RemovesSortParam', () => {
      const updateParams = vi.fn();
      renderSheet({ updateParams, sort: 'name_asc' });
      fireEvent.change(screen.getByRole('combobox', { name: 'Sort items' }), {
        target: { value: 'created_desc' },
      });
      expect(updateParams).toHaveBeenCalledWith({ sort: null, page: null });
    });
  });

  describe('ShowFacet', () => {
    it('NonChooseMode_RendersNoShowSelect', () => {
      renderSheet({ mode: 'items' });
      expect(
        screen.queryByRole('combobox', {
          name: 'Show items by list membership',
        })
      ).not.toBeInTheDocument();
    });

    it('NonChooseMode_RendersNoPurchasesFacet', () => {
      renderSheet({ mode: 'items' });
      expect(
        screen.queryByRole('combobox', { name: 'Purchases filter' })
      ).not.toBeInTheDocument();
    });

    it('ChooseMode_RendersShowSelectWiredToUpdateParams', () => {
      const updateParams = vi.fn();
      renderSheet({ mode: 'choose', updateParams });
      fireEvent.change(
        screen.getByRole('combobox', {
          name: 'Show items by list membership',
        }),
        { target: { value: 'on' } }
      );
      expect(updateParams).toHaveBeenCalledWith({ show: 'on', page: null });
    });

    it('ShowAllChosen_RemovesShowParam', () => {
      const updateParams = vi.fn();
      renderSheet({ mode: 'choose', show: 'on', updateParams });
      fireEvent.change(
        screen.getByRole('combobox', {
          name: 'Show items by list membership',
        }),
        { target: { value: 'all' } }
      );
      expect(updateParams).toHaveBeenCalledWith({ show: null, page: null });
    });
  });

  describe('StoreFilter', () => {
    it('StoreOptionsPresent_RendersStoreFilterWiredToHandlers', () => {
      const toggleStore = vi.fn();
      const clearStores = vi.fn();
      renderSheet({ storeOptions: ['Amazon'], toggleStore, clearStores });
      fireEvent.click(screen.getByText('store-toggle'));
      expect(toggleStore).toHaveBeenCalledWith('Amazon');
      fireEvent.click(screen.getByText('store-clear'));
      expect(clearStores).toHaveBeenCalledTimes(1);
    });

    it('NoStoreOptions_OmitsStoreFilter', () => {
      renderSheet({ storeOptions: [] });
      expect(screen.queryByText('store-toggle')).not.toBeInTheDocument();
    });
  });

  describe('PriceFilter', () => {
    it('ShowPriceFilter_RendersPriceFilterWiredToHandlers', () => {
      const applyPrice = vi.fn();
      const clearPrice = vi.fn();
      renderSheet({ showPriceFilter: true, applyPrice, clearPrice });
      fireEvent.click(screen.getByText('price-apply'));
      expect(applyPrice).toHaveBeenCalledWith('10', '50');
      fireEvent.click(screen.getByText('price-clear'));
      expect(clearPrice).toHaveBeenCalledTimes(1);
    });

    it('NoPriceFilter_OmitsPriceFilter', () => {
      renderSheet({ showPriceFilter: false });
      expect(screen.queryByText('price-apply')).not.toBeInTheDocument();
    });
  });
});
