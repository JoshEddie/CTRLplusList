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

const onQuantityChange = vi.fn();
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
      onQuantityChange={onQuantityChange}
      onReorder={onReorder}
      lists={[]}
      {...overrides}
    />
  );
}

const section = (name: RegExp) => screen.getByRole('region', { name });
// The row's name button is the only control whose accessible name is the item's
// own, which is what makes it the row's identity here.
const ITEM_NAMES = /^(Apple|Banana|Cherry)$/;
const rowNames = (name: RegExp) =>
  within(section(name))
    .queryAllByRole('button', { name: ITEM_NAMES })
    .map((button) => button.textContent);

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
      expect(rowNames(/In this list/)).toEqual(['Cherry', 'Apple']);
      expect(rowNames(/Not in this list/)).toEqual(['Banana']);
    });

    it('Render_MountsTheToolbarSlotInEditModeWithoutTheGridToggle', () => {
      renderItems();
      const toolbar = screen.getByTestId('toolbar');
      expect(toolbar).toHaveAttribute('data-mode', 'edit');
      expect(toolbar).toHaveAttribute('data-grid-toggle', 'false');
    });

    it('StepUpANotInListRow_StagesItAtTheNumberReached', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(
        within(section(/Not in this list/)).getByRole('button', {
          name: 'Increase',
        })
      );
      expect(onQuantityChange).toHaveBeenCalledExactlyOnceWith('a2', 1);
    });

    it('OpenARowsSheet_ShowsItAtItsStagedQuantity-ClosesOnDone', async () => {
      const user = userEvent.setup();
      renderItems({ entries: [entry('a3'), entry('a1', 4)] });
      // The row carries a stepper of its own under the same name, so the
      // sheet's is the second one to appear and the first one to go.
      expect(screen.getAllByRole('group', { name: 'Wants 4' })).toHaveLength(1);
      await user.click(screen.getByRole('button', { name: 'Apple' }));
      expect(screen.getAllByRole('group', { name: 'Wants 4' })).toHaveLength(2);
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getAllByRole('group', { name: 'Wants 4' })).toHaveLength(1);
    });

    it('OpenANotInListRowsSheet_PromptsToBumpWithoutAdding', async () => {
      const user = userEvent.setup();
      renderItems();
      await user.click(screen.getByRole('button', { name: 'Banana' }));
      expect(
        screen.getByRole('group', { name: 'Not in list · bump to add' })
      ).toBeInTheDocument();
      expect(onQuantityChange).not.toHaveBeenCalled();
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
          onQuantityChange={onQuantityChange}
          onReorder={onReorder}
          lists={[]}
        />
      );
      expect(rowNames(/In this list/)).toEqual(['Apple']);
      expect(rowNames(/Not in this list/)).toEqual(['Banana', 'Cherry']);
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
      expect(rowNames(/Not in this list/)).toEqual(['Banana']);
    });

    it('Store_FiltersByStoreName', () => {
      renderItems({}, 'store=Amazon');
      expect(rowNames(/In this list/)).toEqual(['Apple']);
      expect(screen.getByText('No other items match.')).toBeInTheDocument();
    });

    it('PriceMin_FiltersLowerBound', () => {
      renderItems({}, 'price_min=10');
      expect(rowNames(/In this list/)).toEqual([]);
      expect(rowNames(/Not in this list/)).toEqual(['Banana']);
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
      expect(rowNames(/Not in this list/)).toEqual([
        'Apple',
        'Banana',
        'Cherry',
      ]);
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
      expect(onQuantityChange).toHaveBeenCalledWith('new-1', 1);
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
      expect(onQuantityChange).not.toHaveBeenCalled();
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
