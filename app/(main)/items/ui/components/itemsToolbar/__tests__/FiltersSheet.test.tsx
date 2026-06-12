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
    purchases: overrides.purchases ?? 'hide',
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
    it('CloseButton_CallsOnClose', () => {
      const onClose = vi.fn();
      renderSheet({ onClose });
      fireEvent.click(screen.getByRole('button', { name: 'Close filters' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('DoneButton_CallsOnClose', () => {
      const onClose = vi.fn();
      renderSheet({ onClose });
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(onClose).toHaveBeenCalledTimes(1);
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

  describe('PurchasesAndShow', () => {
    it('NonChooseMode_RendersPurchasesSelectWiredToUpdateParams', () => {
      const updateParams = vi.fn();
      renderSheet({ mode: 'items', updateParams });
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Purchases filter' }),
        { target: { value: 'only' } }
      );
      expect(updateParams).toHaveBeenCalledWith({
        purchases: 'only',
        page: null,
      });
    });

    it('PurchasesHideChosen_RemovesPurchasesParam', () => {
      const updateParams = vi.fn();
      renderSheet({ mode: 'items', purchases: 'only', updateParams });
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Purchases filter' }),
        { target: { value: 'hide' } }
      );
      expect(updateParams).toHaveBeenCalledWith({
        purchases: null,
        page: null,
      });
    });

    it('ChooseMode_RendersShowSelectNotPurchases', () => {
      const updateParams = vi.fn();
      renderSheet({ mode: 'choose', updateParams });
      expect(
        screen.queryByRole('combobox', { name: 'Purchases filter' })
      ).not.toBeInTheDocument();
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
