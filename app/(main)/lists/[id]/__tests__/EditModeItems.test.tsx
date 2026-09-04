import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeItems from '../EditModeItems';
import { entry } from './test-helpers';

const spHolder = vi.hoisted(() => ({
  value: new URLSearchParams() as URLSearchParams | null,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/lists/l1',
  useSearchParams: () => spHolder.value,
}));

vi.mock('@/app/(main)/items/ui/components/itemsToolbar/ToolbarSlot', () => ({
  default: (p: { mode: string; showGridToggle?: boolean }) => (
    <div
      data-testid="toolbar"
      data-mode={p.mode}
      data-grid-toggle={String(p.showGridToggle)}
    />
  ),
}));
vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: () => <div data-testid="photo" />,
}));
vi.mock('@/app/(main)/items/ui/components/itemform/ItemFormContainer', () => ({
  default: (p: {
    lists: { id: string }[];
    onClose: () => void;
    onSuccess?: (id?: string) => void;
  }) => (
    <div data-testid="item-form-container" data-lists={p.lists.length}>
      <button type="button" onClick={p.onClose}>
        close-form
      </button>
      <button type="button" onClick={() => p.onSuccess?.('new-1')}>
        success-form
      </button>
      <button type="button" onClick={() => p.onSuccess?.()}>
        success-form-no-id
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
  },
  {
    id: 'a2',
    name: 'Banana',
    description: '',
    store: { name: 'Target', price: '15.00', link: 'https://t.example' },
  },
  { id: 'a3', name: 'Cherry', description: '', store: null },
] as never[];

const onToggle = vi.fn();
const onReorder = vi.fn();

function renderItems(
  overrides: Partial<React.ComponentProps<typeof EditModeItems>> = {},
  query = ''
) {
  spHolder.value = new URLSearchParams(query);
  return render(
    <EditModeItems
      items={ITEMS}
      entries={[entry('a3'), entry('a1')]}
      pending={new Set()}
      onToggle={onToggle}
      onReorder={onReorder}
      lists={[]}
      {...overrides}
    />
  );
}

const section = (name: RegExp) => screen.getByRole('region', { name });
const rowNames = (name: RegExp) =>
  within(section(name))
    .queryAllByRole('checkbox')
    .map((box) => box.getAttribute('id')?.replace('edit-mode-item-', ''));

beforeEach(() => {
  vi.clearAllMocks();
  spHolder.value = new URLSearchParams();
});

describe('EditModeItems', () => {
  describe('Partition', () => {
    it('Render_SplitsMembersInStagedOrderFromTheRestByName', () => {
      renderItems();
      expect(
        screen.getByRole('heading', { name: 'In this list · 2' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Not in this list · 1' })
      ).toBeInTheDocument();
      expect(rowNames(/In this list/)).toEqual(['a3', 'a1']);
      expect(rowNames(/Not in this list/)).toEqual(['a2']);
    });

    it('Render_MountsTheToolbarSlotInEditModeWithoutTheGridToggle', () => {
      renderItems();
      const toolbar = screen.getByTestId('toolbar');
      expect(toolbar).toHaveAttribute('data-mode', 'edit');
      expect(toolbar).toHaveAttribute('data-grid-toggle', 'false');
    });

    it('ClickCheckbox_CallsOnToggleWithItemId', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(
        within(section(/Not in this list/)).getByRole('checkbox')
      );
      expect(onToggle).toHaveBeenCalledWith('a2');
    });

    it('PendingIds_MarkTheirRowsInEitherSection', () => {
      renderItems({ pending: new Set(['a1', 'a2']) });
      expect(
        within(section(/In this list/)).getAllByRole('img', {
          name: 'Unsaved change',
        })
      ).toHaveLength(1);
      expect(
        within(section(/Not in this list/)).getAllByRole('img', {
          name: 'Unsaved change',
        })
      ).toHaveLength(1);
    });

    it('SearchParamsNull_RendersEverySection', () => {
      spHolder.value = null;
      render(
        <EditModeItems
          items={ITEMS}
          entries={[entry('a1')]}
          pending={new Set()}
          onToggle={onToggle}
          onReorder={onReorder}
          lists={[]}
        />
      );
      expect(rowNames(/In this list/)).toEqual(['a1']);
      expect(rowNames(/Not in this list/)).toEqual(['a2', 'a3']);
    });
  });

  describe('Filters', () => {
    it('Query_NarrowsBothSections-HeadingsCountShownOfTotal', () => {
      renderItems({}, 'q=an');
      expect(
        screen.getByRole('heading', { name: 'In this list · 0 of 2' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Not in this list · 1 of 1' })
      ).toBeInTheDocument();
      expect(
        screen.getByText('Nothing in your list matches.')
      ).toBeInTheDocument();
      expect(rowNames(/Not in this list/)).toEqual(['a2']);
    });

    it('Store_FiltersByStoreName', () => {
      renderItems({}, 'store=Amazon');
      expect(rowNames(/In this list/)).toEqual(['a1']);
      expect(screen.getByText('No other items match.')).toBeInTheDocument();
    });

    it('PriceMin_FiltersLowerBound', () => {
      renderItems({}, 'price_min=10');
      expect(rowNames(/In this list/)).toEqual([]);
      expect(rowNames(/Not in this list/)).toEqual(['a2']);
    });

    it('FilterActive_ShowsReorderHintAndDisablesHandles', () => {
      renderItems({}, 'store=Amazon');
      expect(screen.getByText('Clear search to reorder')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Drag to reorder' })
      ).toHaveAttribute('aria-disabled', 'true');
    });

    it('NoFilter_HandlesAreLive-NoHint', () => {
      renderItems();
      expect(
        screen.queryByText('Clear search to reorder')
      ).not.toBeInTheDocument();
      for (const handle of screen.getAllByRole('button', {
        name: 'Drag to reorder',
      })) {
        expect(handle).not.toHaveAttribute('aria-disabled', 'true');
      }
    });
  });

  describe('EmptySections', () => {
    it('NoEntries_ShowsListEmptyCopy', () => {
      renderItems({ entries: [] });
      expect(
        screen.getByText('Your list is empty. Add any item below.')
      ).toBeInTheDocument();
      expect(rowNames(/Not in this list/)).toEqual(['a1', 'a2', 'a3']);
    });

    it('WholeLibraryOnList_ShowsLibraryExhaustedCopy', () => {
      renderItems({ entries: [entry('a1'), entry('a2'), entry('a3')] });
      expect(
        screen.getByText('Every item you own is already on this list.')
      ).toBeInTheDocument();
    });
  });

  describe('NewItem', () => {
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

    it('CreateRowInLibrarySection_OpensItemForm', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(
        within(section(/Not in this list/)).getByRole('button', {
          name: /Create new item/,
        })
      );
      expect(screen.getByTestId('item-form-container')).toBeInTheDocument();
    });

    it('CreateSuccess_ClosesFormAndStagesTheNewItem', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(screen.getByRole('button', { name: /Create new item/ }));
      await user.click(screen.getByRole('button', { name: 'success-form' }));
      expect(
        screen.queryByTestId('item-form-container')
      ).not.toBeInTheDocument();
      expect(onToggle).toHaveBeenCalledWith('new-1');
    });
  });

  describe('NewItemWithoutId', () => {
    it('CreateSuccessWithoutId_ClosesFormAndStagesNothing', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(screen.getByRole('button', { name: /Create new item/ }));
      await user.click(
        screen.getByRole('button', { name: 'success-form-no-id' })
      );
      expect(
        screen.queryByTestId('item-form-container')
      ).not.toBeInTheDocument();
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('EmptyLibrary', () => {
    it('NoItems_RendersEmptyState-HidesToolbarAndSections', () => {
      renderItems({ items: [], entries: [] });
      expect(
        screen.getByText('No items in your library yet')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('NoItems_CreateNewItemOpensForm', async () => {
      const user = userEvent.setup();
      renderItems({ items: [], entries: [] });
      await user.click(screen.getByRole('button', { name: /Create new item/ }));
      expect(screen.getByTestId('item-form-container')).toBeInTheDocument();
    });
  });
});
