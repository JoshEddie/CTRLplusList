import { ROLES } from '@/lib/data/profile.roles';
import { makeProfile } from '@/test/helpers/profile';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeItems from '../EditModeItems';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
const spHolder = vi.hoisted(() => ({
  value: new URLSearchParams() as URLSearchParams | null,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/lists/l1',
  useSearchParams: () => spHolder.value,
}));

vi.mock('@/app/(main)/items/ui/components/Item', () => ({
  default: (p: { item: { id: string }; preview?: boolean }) => (
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
    store: { name: 'Amazon', price: '5.00', link: 'https://a.example' },
    purchases: [],
  },
  {
    id: 'a2',
    name: 'Banana',
    description: '',
    store: { name: 'Target', price: '15.00', link: 'https://t.example' },
    purchases: [],
  },
  { id: 'a3', name: 'Cherry', description: '', store: null, purchases: [] },
] as never[];

const onToggle = vi.fn();

function renderItems(
  overrides: Partial<React.ComponentProps<typeof EditModeItems>> = {},
  query = ''
) {
  spHolder.value = new URLSearchParams(query);
  return render(
    <EditModeItems
      items={ITEMS}
      selected={new Set(['a1'])}
      initialSelected={new Set(['a1'])}
      onToggle={onToggle}
      actor={makeProfile('p1', 'p1', ROLES.owner)}
      lists={[]}
      {...overrides}
    />
  );
}

const rowIds = () =>
  screen.getAllByTestId('item').map((e) => e.getAttribute('data-id'));
const checkboxes = () => screen.getAllByRole('checkbox');

beforeEach(() => {
  vi.clearAllMocks();
  spHolder.value = new URLSearchParams();
});

describe('EditModeItems', () => {
  describe('Rows', () => {
    it('Render_ComposesItemPreviewAndCheckboxPerRow', () => {
      renderItems();
      expect(screen.getAllByTestId('item')).toHaveLength(3);
      expect(screen.getAllByTestId('item')[0]).toHaveAttribute(
        'data-preview',
        'true'
      );
      expect(checkboxes()[0]).toBeChecked();
      expect(checkboxes()[1]).not.toBeChecked();
    });

    it('ClickCheckbox_CallsOnToggleWithItemId', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(checkboxes()[1]);
      expect(onToggle).toHaveBeenCalledWith('a2');
    });

    it('NamelessItem_RendersARowWithABlankCheckboxLabel', () => {
      renderItems({
        items: [
          {
            id: 'n1',
            name: null,
            description: null,
            store: null,
            purchases: [],
          },
        ] as never,
      });
      expect(screen.getAllByTestId('item')).toHaveLength(1);
      expect(screen.getByRole('checkbox')).toHaveAccessibleName('');
    });

    it('DeselectedInitialMember_MarksRowRemoving', () => {
      renderItems({ selected: new Set(), initialSelected: new Set(['a1']) });
      // eslint-disable-next-line testing-library/no-node-access -- the row's staged state is a class on the wrapping <label>, which carries no role or accessible name of its own
      const row = screen.getAllByTestId('item')[0].closest('label');
      expect(row).toHaveClass('is-removing');
      expect(row).not.toHaveClass('is-on');
    });
  });

  describe('Filters', () => {
    it('Query_FiltersByNameOrDescription', () => {
      renderItems({}, 'q=apple');
      expect(rowIds()).toEqual(['a1']);
    });

    it('ShowOn_ShowsOnlySelected', () => {
      renderItems({}, 'show=on');
      expect(rowIds()).toEqual(['a1']);
    });

    it('Store_FiltersByStoreName', () => {
      renderItems({}, 'store=Amazon');
      expect(rowIds()).toEqual(['a1']);
    });

    it('PriceMin_FiltersLowerBound', () => {
      renderItems({}, 'price_min=10');
      expect(rowIds()).toEqual(['a2']);
    });

    it('SortNameDesc_OrdersDescending', () => {
      renderItems({}, 'sort=name_desc');
      expect(rowIds()).toEqual(['a3', 'a2', 'a1']);
    });

    it('SearchParamsNull_RendersEveryItem', () => {
      spHolder.value = null;
      render(
        <EditModeItems
          items={ITEMS}
          selected={new Set(['a1'])}
          initialSelected={new Set(['a1'])}
          onToggle={onToggle}
          actor={makeProfile('p1', 'p1', ROLES.owner)}
          lists={[]}
        />
      );
      expect(screen.getAllByTestId('item')).toHaveLength(3);
    });

    it('FilterMatchesNothing_ClearFiltersReplacesWithBarePath', async () => {
      const user = userEvent.setup();
      renderItems({}, 'q=zzz');
      expect(
        screen.getByText('No items match your filters.')
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(router.replace).toHaveBeenCalledWith('/lists/l1');
    });

    it('ClearFilters_PreservesNonFilterParams', async () => {
      const user = userEvent.setup();
      renderItems({}, 'q=zzz&edit=1');
      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(router.replace).toHaveBeenCalledWith('/lists/l1?edit=1');
    });
  });

  describe('NewItemModal', () => {
    it('CreateNewItem_OpensThenClosesItemForm', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(screen.getByRole('button', { name: /Create new item/ }));
      expect(screen.getByTestId('item-form-container')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'close-form' }));
      expect(
        screen.queryByTestId('item-form-container')
      ).not.toBeInTheDocument();
    });

    it('CreateNewItemSuccess_ClosesItemForm', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(screen.getByRole('button', { name: /Create new item/ }));
      await user.click(screen.getByRole('button', { name: 'success-form' }));
      expect(
        screen.queryByTestId('item-form-container')
      ).not.toBeInTheDocument();
    });
  });

  describe('EmptyLibrary', () => {
    it('NoItems_RendersEmptyState-HidesToolbar', () => {
      renderItems({ items: [] });
      expect(
        screen.getByText('No items in your library yet')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
    });

    it('NoItems_CreateNewItemOpensForm', async () => {
      const user = userEvent.setup();
      renderItems({ items: [] });
      await user.click(screen.getByRole('button', { name: /Create new item/ }));
      expect(screen.getByTestId('item-form-container')).toBeInTheDocument();
    });
  });
});
