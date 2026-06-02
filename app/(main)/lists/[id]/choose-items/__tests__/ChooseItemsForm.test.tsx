import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setListItems } from '@/app/actions/lists';
import ChooseItemsForm from '../ChooseItemsForm';

vi.mock('@/app/actions/lists', () => ({ setListItems: vi.fn() }));

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
const spHolder = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/lists/l1',
  useSearchParams: () => spHolder.value,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    promise: <T,>(p: Promise<T>, opts: { success?: unknown }) =>
      p.then((v) => {
        if (typeof opts?.success === 'function') opts.success(v);
        return v;
      }),
  },
}));

vi.mock('@/app/(main)/items/ui/components/Item', () => ({
  default: (p: { item: { id: string; name?: string }; preview?: boolean }) => (
    <div
      data-testid="item"
      data-id={p.item.id}
      data-preview={String(!!p.preview)}
    />
  ),
}));
vi.mock('@/app/(main)/items/ui/components/itemsToolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));
vi.mock('@/app/(main)/items/ui/components/itemform/ItemFormContainer', () => ({
  default: (p: { onClose: () => void; onSuccess?: () => void }) => (
    <div data-testid="item-form-container">
      <button type="button" onClick={p.onClose}>
        close-form
      </button>
      <button type="button" onClick={() => p.onSuccess?.()}>
        success-form
      </button>
    </div>
  ),
}));

const ITEMS = [
  {
    id: 'a1',
    name: 'Apple',
    description: 'red fruit',
    stores: [{ name: 'Amazon', price: '5.00', link: 'x' }],
    purchases: [],
  },
  {
    id: 'a2',
    name: 'Banana',
    description: '',
    stores: [{ name: 'Target', price: '15.00', link: 'y' }],
    purchases: [],
  },
  { id: 'a3', name: 'Cherry', description: '', stores: [], purchases: [] },
] as never[];

function renderForm(
  overrides: Partial<React.ComponentProps<typeof ChooseItemsForm>> = {},
  query = ''
) {
  spHolder.value = new URLSearchParams(query);
  const props = {
    list_id: 'l1',
    list_name: 'My List',
    items: ITEMS,
    initialSelectedIds: ['a1'],
    isNew: false,
    user_id: 'u1',
    lists: [],
    ...overrides,
  };
  return render(<ChooseItemsForm {...props} />);
}

const rowIds = () =>
  screen.getAllByTestId('item').map((e) => e.getAttribute('data-id'));
// The row checkbox carries a doubled label (outer htmlFor + CheckboxField's own
// label), so query positionally by render order rather than by accessible name.
const checkboxes = () => screen.getAllByRole('checkbox');

beforeEach(() => {
  vi.clearAllMocks();
  spHolder.value = new URLSearchParams();
  vi.mocked(setListItems).mockResolvedValue({
    success: true,
    message: 'Saved',
  } as never);
});

afterEach(() => vi.restoreAllMocks());

describe('ChooseItemsForm', () => {
  describe('Rows', () => {
    it('Render_ComposesItemPreviewAndCheckboxPerRow', () => {
      renderForm();
      expect(screen.getAllByTestId('item')).toHaveLength(3);
      expect(screen.getAllByTestId('item')[0]).toHaveAttribute(
        'data-preview',
        'true'
      );
      // Pre-checked from initialSelectedIds (a1 = first row).
      expect(checkboxes()[0]).toBeChecked();
      expect(checkboxes()[1]).not.toBeChecked();
    });

    it('ToggleCheckbox_UpdatesSelectionCount', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(checkboxes()[1]);
      expect(screen.getByText('2 items selected')).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('Query_FiltersByNameOrDescription', () => {
      renderForm({}, 'q=apple');
      expect(rowIds()).toEqual(['a1']);
    });

    it('ShowOn_ShowsOnlySelected', () => {
      renderForm({}, 'show=on');
      expect(rowIds()).toEqual(['a1']);
    });

    it('ShowOff_ShowsOnlyUnselected', () => {
      renderForm({}, 'show=off');
      expect(rowIds()).toEqual(['a2', 'a3']);
    });

    it('Store_FiltersByStoreName', () => {
      renderForm({}, 'store=Amazon');
      expect(rowIds()).toEqual(['a1']);
    });

    it('PriceMin_FiltersLowerBound', () => {
      renderForm({}, 'price_min=10');
      expect(rowIds()).toEqual(['a2']);
    });

    it('PriceMax_FiltersUpperBound', () => {
      renderForm({}, 'price_max=10');
      expect(rowIds()).toEqual(['a1']);
    });

    it('SearchParamsNull_RendersAllItemsWithDefaults', () => {
      spHolder.value = null as never;
      render(
        <ChooseItemsForm
          list_id="l1"
          list_name="My List"
          items={ITEMS}
          initialSelectedIds={['a1']}
          user_id="u1"
          lists={[]}
        />
      );
      expect(screen.getAllByTestId('item')).toHaveLength(3);
    });

    it('MissingStoresAndBlankStoreName_HandledInStoreOptions', () => {
      renderForm({
        items: [
          { id: 'b1', name: 'NoStores', description: '', purchases: [] },
          {
            id: 'b2',
            name: 'BlankStore',
            description: '',
            stores: [{ name: '', price: '1', link: 'z' }],
            purchases: [],
          },
        ] as never,
      });
      expect(screen.getAllByTestId('item')).toHaveLength(2);
    });

    it('SortNameDesc_OrdersDescending', () => {
      renderForm({}, 'sort=name_desc');
      expect(rowIds()).toEqual(['a3', 'a2', 'a1']);
    });

    it('SelectionPreserved_AcrossFilterChange', async () => {
      const user = userEvent.setup();
      const { rerender } = renderForm();
      await user.click(checkboxes()[1]);
      spHolder.value = new URLSearchParams('q=apple');
      rerender(
        <ChooseItemsForm
          list_id="l1"
          list_name="My List"
          items={ITEMS}
          initialSelectedIds={['a1']}
          user_id="u1"
          lists={[]}
        />
      );
      expect(rowIds()).toEqual(['a1']);
      expect(screen.getByText('2 items selected')).toBeInTheDocument();
    });

    it('FilterMatchesNothing_ShowsClearFiltersAffordance', async () => {
      const user = userEvent.setup();
      renderForm({}, 'q=zzz');
      expect(screen.getByText('No items match your filters.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(router.replace).toHaveBeenCalledWith('/lists/l1');
    });

    it('ClearFilters_PreservesNonFilterParams', async () => {
      const user = userEvent.setup();
      renderForm({}, 'q=zzz&other=keep');
      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(router.replace).toHaveBeenCalledWith('/lists/l1?other=keep');
    });

    it('NullNameItem_RendersWithEmptyLabel', () => {
      renderForm({
        items: [
          { id: 'n1', name: null, description: null, stores: [], purchases: [] },
        ] as never,
      });
      expect(screen.getAllByTestId('item')).toHaveLength(1);
    });

    it('QueryWithNullNameItem_ExcludesNonMatch', () => {
      renderForm(
        {
          items: [
            { id: 'n1', name: null, description: null, stores: [], purchases: [] },
            ...ITEMS,
          ] as never,
        },
        'q=apple'
      );
      expect(rowIds()).toEqual(['a1']);
    });
  });

  describe('Save', () => {
    it('ManageWithChanges_CallsSetListItems-PushesAndRefreshes', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(checkboxes()[1]);
      await user.click(screen.getByRole('button', { name: /Save changes/ }));
      expect(setListItems).toHaveBeenCalledWith('l1', ['a1', 'a2']);
      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/lists/l1'));
      expect(router.refresh).toHaveBeenCalled();
    });

    it('ManageNoChanges_SaveDisabled', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled();
    });

    it('SaveFails_NoNavigation', async () => {
      vi.mocked(setListItems).mockResolvedValue({ success: false } as never);
      const user = userEvent.setup();
      renderForm();
      await user.click(checkboxes()[1]);
      await user.click(screen.getByRole('button', { name: /Save changes/ }));
      await waitFor(() => expect(setListItems).toHaveBeenCalled());
      expect(router.push).not.toHaveBeenCalled();
    });

    it('Undo_RevertsSelectionToInitial', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(checkboxes()[1]);
      await user.click(screen.getByRole('button', { name: 'Undo' }));
      expect(screen.getByText('1 item selected')).toBeInTheDocument();
    });

    it('AddAndRemove_ShowsBothDiffCounts', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(checkboxes()[0]); // deselect a1 (was selected → removing)
      await user.click(checkboxes()[1]); // select a2 (added)
      expect(screen.getByText('+1 added')).toBeInTheDocument();
      expect(screen.getByText(/1 removed/)).toBeInTheDocument();
    });
  });

  describe('CreateMode', () => {
    it('NewNoChanges_SubmitSkipNavigatesToList', async () => {
      const user = userEvent.setup();
      renderForm({ isNew: true, initialSelectedIds: [] });
      // Footer renders ghost "Skip" (back) then the primary "Skip" submit; the
      // submit path is the create-mode no-changes short-circuit under test.
      const skips = screen.getAllByRole('button', { name: /Skip/ });
      await user.click(skips[skips.length - 1]);
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('Cancel_NavigatesBackToList', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });

    it('NewWithManySelections_ShowsAddCountPlural', () => {
      renderForm({ isNew: true, initialSelectedIds: ['a1', 'a2'] });
      expect(
        screen.getByRole('button', { name: /Add 2 items to list/ })
      ).toBeInTheDocument();
    });

    it('NewWithOneSelection_ShowsAddCountSingular', () => {
      renderForm({ isNew: true, initialSelectedIds: ['a1'] });
      expect(
        screen.getByRole('button', { name: /Add 1 item to list/ })
      ).toBeInTheDocument();
    });
  });

  describe('NewItemModal', () => {
    it('CreateNewItem_OpensAndClosesItemForm', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: /Create new item/ }));
      expect(screen.getByTestId('item-form-container')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'close-form' }));
      expect(
        screen.queryByTestId('item-form-container')
      ).not.toBeInTheDocument();
    });

    it('CreateNewItemSuccess_ClosesItemForm', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: /Create new item/ }));
      await user.click(screen.getByRole('button', { name: 'success-form' }));
      expect(
        screen.queryByTestId('item-form-container')
      ).not.toBeInTheDocument();
    });
  });

  describe('EmptyLibrary', () => {
    it('NoItems_RendersEmptyState-CreateItemOpensForm', async () => {
      const user = userEvent.setup();
      renderForm({ items: [] });
      expect(
        screen.getByText('No items in your library yet')
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Create Item' }));
      expect(screen.getByTestId('item-form-container')).toBeInTheDocument();
    });
  });
});
