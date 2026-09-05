/* eslint-disable testing-library/no-node-access --
 * A removed row's strike-through and a library card's membership outline land
 * on classed wrappers that carry no role; those few assertions query by class.
 */
import { setListItems } from '@/lib/data/listItems.actions';
import { ItemDisplay, ListTable } from '@/lib/types';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeForm from '../EditModeForm';
import { entry } from './test-helpers';

vi.mock('@/lib/data/listItems.actions', () => ({ setListItems: vi.fn() }));

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
const spHolder = vi.hoisted(() => ({
  value: new URLSearchParams('edit=1') as URLSearchParams | null,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/lists/l1',
  useSearchParams: () => spHolder.value,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    promise: <T,>(p: Promise<T>, opts: { error?: (e: Error) => unknown }) =>
      p.catch((e) => {
        opts.error?.(e as Error);
        throw e;
      }),
  },
}));

vi.mock('@/app/(main)/items/ui/components/ItemPhoto', () => ({
  default: () => <div data-testid="photo" />,
}));
vi.mock('@/app/(main)/items/ui/components/itemform/ItemFormContainer', () => ({
  default: (p: { onClose: () => void; onSuccess?: (id?: string) => void }) => (
    <div data-testid="item-form-container">
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

// The drop is dnd-kit's to deliver; what the mode owns is how it reads one, so
// the context is replaced with a button that hands it a drop of a1 onto b1.
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  type Drop = { active: { id: string }; over: { id: string } | null };
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd: (event: Drop) => void;
    }) => (
      <div>
        <button
          type="button"
          onClick={() =>
            onDragEnd({ active: { id: 'a1' }, over: { id: 'b1' } })
          }
        >
          drop-a1-on-b1
        </button>
        <button
          type="button"
          onClick={() =>
            onDragEnd({ active: { id: 'b1' }, over: { id: 'a1' } })
          }
        >
          drop-b1-on-a1
        </button>
        <button
          type="button"
          onClick={() => onDragEnd({ active: { id: 'a1' }, over: null })}
        >
          drop-a1-nowhere
        </button>
        <button
          type="button"
          onClick={() =>
            onDragEnd({ active: { id: 'a1' }, over: { id: 'a1' } })
          }
        >
          drop-a1-on-itself
        </button>
        {children}
      </div>
    ),
  };
});

const item = (id: string, name: string, extra: Partial<ItemDisplay> = {}) =>
  ({
    id,
    name,
    description: '',
    created_at: new Date(`2024-01-0${id.length}T00:00:00Z`),
    store: null,
    ...extra,
  }) as ItemDisplay;

// Newest first is the library's default sort: c2, then b1, a1, a2.
const ITEMS = [
  item('a1', 'Apple', {
    created_at: new Date('2024-01-01T00:00:00Z'),
    store: { name: 'Amazon', price: '5.00', link: 'https://a.example' },
  }),
  item('b1', 'Banana', { created_at: new Date('2024-01-02T00:00:00Z') }),
  item('a2', 'Cherry', { created_at: new Date('2024-01-01T00:00:00Z') }),
  item('c2', 'Damson', {
    created_at: new Date('2024-01-03T00:00:00Z'),
    store: { name: 'Target', price: '15.00', link: 'https://t.example' },
  }),
];

const LIST = {
  id: 'l1',
  name: 'Birthday',
  subtitle: null,
  occasion: 'Birthday',
  date: new Date('2026-03-04T00:00:00.000Z'),
  created_at: new Date(),
  updated_at: new Date(),
  profile_id: 'p1',
  shared: false,
} as ListTable;

function renderForm(
  overrides: Partial<React.ComponentProps<typeof EditModeForm>> = {},
  query = 'edit=1'
) {
  spHolder.value = new URLSearchParams(query);
  return render(
    <EditModeForm
      list={LIST}
      items={ITEMS}
      initialEntries={[entry('a1'), entry('b1', 2)]}
      isNew={false}
      lists={[]}
      {...overrides}
    />
  );
}

const user = () => userEvent.setup();
const inListTab = () => screen.getByRole('tab', { name: /^In this list/ });
const addTab = () => screen.getByRole('tab', { name: /^Add items/ });
const inList = () => screen.getByRole('tabpanel', { name: /^In this list/ });
const library = () => screen.getByRole('tabpanel', { name: /^Add items/ });
const rowNames = () =>
  within(inList())
    .getAllByText(/./, { selector: '.edit-mode-row-name-static' })
    .map((el) => el.textContent);
const rowOf = (name: string) =>
  within(inList())
    .getByText(name, { selector: '.edit-mode-row-name-static' })
    .closest('li') as HTMLElement;
const cardOf = (name: string) =>
  within(library())
    .getByRole('heading', { name })
    .closest('.item-container') as HTMLElement;
const stepperOf = (scope: HTMLElement) =>
  within(scope).getByRole('group', { name: /Quantity for|Wants|Not in list/ });
const changeCount = () => screen.getByText(/change|No changes/);
const saveButton = () => screen.getByRole('button', { name: 'Save' });
const confirmSave = () => screen.getByRole('button', { name: 'Save changes' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(setListItems).mockResolvedValue({
    success: true,
    message: 'Saved',
  } as never);
});

describe('EditModeForm', () => {
  describe('Band', () => {
    it('Render_CarriesTheListNameAndNoListDetailsFields', () => {
      renderForm();
      expect(
        screen.getByRole('heading', { level: 1, name: 'Birthday' })
      ).toBeInTheDocument();
      expect(screen.queryByLabelText(/Name/)).toBeNull();
      expect(screen.queryByLabelText(/Date/)).toBeNull();
      expect(screen.queryByText(/units/)).toBeNull();
    });
  });

  describe('Tabs', () => {
    it('Default_OpensOnInThisListWithBothTabsCounted', () => {
      renderForm();
      expect(inListTab()).toHaveTextContent('In this list · 2');
      expect(addTab()).toHaveTextContent('Add items · 4');
      expect(inListTab()).toHaveAttribute('aria-selected', 'true');
      expect(rowNames()).toEqual(['Apple', 'Banana']);
    });

    it('ClickAddItems_ShowsTheWholeLibraryNewestFirst-EntriesIncluded', async () => {
      const u = user();
      renderForm();
      await u.click(addTab());
      expect(
        within(library())
          .getAllByRole('heading')
          .map((h) => h.textContent)
      ).toEqual(['Damson', 'Banana', 'Apple', 'Cherry']);
      expect(
        within(cardOf('Banana')).getByText('On this list')
      ).toBeInTheDocument();
      expect(cardOf('Banana')).toHaveClass('is-on');
      expect(within(cardOf('Cherry')).queryByText('On this list')).toBeNull();
    });

    it('StageOnAddItems_MarksTheCardInPlace-CountsOnTheOtherTab-TabIsRemembered', async () => {
      const u = user();
      renderForm();
      await u.click(addTab());
      await u.click(
        within(cardOf('Cherry')).getByRole('button', { name: 'Increase' })
      );
      expect(within(cardOf('Cherry')).getByText('Added')).toBeInTheDocument();
      expect(
        within(library())
          .getAllByRole('heading')
          .map((h) => h.textContent)
      ).toEqual(['Damson', 'Banana', 'Apple', 'Cherry']);
      expect(inListTab()).toHaveTextContent('In this list · 3');

      await u.click(inListTab());
      expect(rowNames()).toEqual(['Apple', 'Banana', 'Cherry']);
      expect(
        within(rowOf('Cherry')).getByRole('img', { name: 'Unsaved change' })
      ).toBeInTheDocument();
      await u.click(addTab());
      expect(within(cardOf('Cherry')).getByText('Added')).toBeInTheDocument();
    });

    it('LibraryCardToZero_ReadsRemovedAndKeepsItsPlace', async () => {
      const u = user();
      renderForm();
      await u.click(addTab());
      await u.click(
        within(cardOf('Banana')).getByRole('button', {
          name: 'Set to minimum, 0',
        })
      );
      expect(within(cardOf('Banana')).getByText('Removed')).toBeInTheDocument();
      expect(
        within(library())
          .getAllByRole('heading')
          .map((h) => h.textContent)
      ).toEqual(['Damson', 'Banana', 'Apple', 'Cherry']);
    });
  });

  describe('InThisList', () => {
    it('RowToZero_StaysInPlaceStruckThroughAndMarkedRemoved', async () => {
      const u = user();
      renderForm();
      await u.click(
        within(rowOf('Apple')).getByRole('button', { name: 'Decrease' })
      );
      expect(rowNames()).toEqual(['Apple', 'Banana']);
      expect(rowOf('Apple')).toHaveClass('is-removed');
      expect(within(rowOf('Apple')).getByText('Removed')).toBeInTheDocument();
      expect(
        within(rowOf('Apple')).queryByRole('button', {
          name: 'Drag to reorder',
        })
      ).toBeNull();
      expect(inListTab()).toHaveTextContent('In this list · 1');
      expect(changeCount()).toHaveTextContent('1 change');
    });

    it('RemovedRowBumpedBack_RestoresInPlaceAndClearsTheMark', async () => {
      const u = user();
      renderForm();
      await u.click(
        within(rowOf('Apple')).getByRole('button', { name: 'Decrease' })
      );
      await u.click(
        within(rowOf('Apple')).getByRole('button', { name: 'Increase' })
      );
      expect(rowNames()).toEqual(['Apple', 'Banana']);
      expect(rowOf('Apple')).not.toHaveClass('is-removed');
      expect(
        within(rowOf('Apple')).queryByRole('img', { name: 'Unsaved change' })
      ).toBeNull();
      expect(changeCount()).toHaveTextContent('No changes');
      expect(saveButton()).toBeDisabled();
    });

    it('Requantify_MarksTheRowWhereItIs', async () => {
      const u = user();
      renderForm();
      await u.click(
        within(rowOf('Banana')).getByRole('button', { name: 'Increase' })
      );
      expect(rowNames()).toEqual(['Apple', 'Banana']);
      expect(stepperOf(rowOf('Banana'))).toHaveAccessibleName('Wants 3');
      expect(
        within(rowOf('Banana')).getByRole('img', { name: 'Unsaved change' })
      ).toBeInTheDocument();
      expect(changeCount()).toHaveTextContent('1 change');
    });

    it('Drag_MarksOnlyTheDraggedRow-DragBackClearsIt', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));
      expect(rowNames()).toEqual(['Banana', 'Apple']);
      expect(
        within(rowOf('Apple')).getByRole('img', { name: 'Unsaved change' })
      ).toBeInTheDocument();
      expect(
        within(rowOf('Banana')).queryByRole('img', { name: 'Unsaved change' })
      ).toBeNull();
      expect(changeCount()).toHaveTextContent('1 change');

      await u.click(screen.getByRole('button', { name: 'drop-b1-on-a1' }));
      expect(rowNames()).toEqual(['Apple', 'Banana']);
      expect(screen.queryByRole('img', { name: 'Unsaved change' })).toBeNull();
      expect(saveButton()).toBeDisabled();
    });

    it('TwoRowsRemovedThenOneRestored_ComesBackWhereItsStruckRowStood', async () => {
      const u = user();
      renderForm({ initialEntries: [entry('a1'), entry('b1'), entry('a2')] });
      await u.click(
        within(rowOf('Apple')).getByRole('button', { name: 'Decrease' })
      );
      await u.click(
        within(rowOf('Banana')).getByRole('button', { name: 'Decrease' })
      );
      await u.click(
        within(rowOf('Banana')).getByRole('button', { name: 'Increase' })
      );
      expect(rowNames()).toEqual(['Apple', 'Banana', 'Cherry']);
      expect(rowOf('Apple')).toHaveClass('is-removed');
      expect(rowOf('Banana')).not.toHaveClass('is-removed');
      expect(changeCount()).toHaveTextContent('1 change');
    });

    it('MovedRowRemovedThenRestored_ReturnsToItsSavedIndexUnmarked', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));
      await u.click(
        within(rowOf('Apple')).getByRole('button', { name: 'Decrease' })
      );
      expect(rowNames()).toEqual(['Apple', 'Banana']);
      await u.click(
        within(rowOf('Apple')).getByRole('button', { name: 'Increase' })
      );
      expect(rowNames()).toEqual(['Apple', 'Banana']);
      expect(screen.queryByRole('img', { name: 'Unsaved change' })).toBeNull();
    });

    it('DropNowhere_ChangesNothing', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-nowhere' }));
      expect(rowNames()).toEqual(['Apple', 'Banana']);
      expect(saveButton()).toBeDisabled();
    });

    it('DropOnItself_ChangesNothing', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-itself' }));
      expect(rowNames()).toEqual(['Apple', 'Banana']);
      expect(saveButton()).toBeDisabled();
    });

    it('ClickARemovedRowsName_OpensTheSheetAtZeroWithoutAddingItBack', async () => {
      const u = user();
      renderForm();
      await u.click(
        within(rowOf('Apple')).getByRole('button', { name: 'Decrease' })
      );
      await u.click(screen.getByRole('button', { name: 'Apple' }));
      expect(
        screen.getByRole('group', { name: 'Not in list · bump to add' })
      ).toBeInTheDocument();
      expect(rowOf('Apple')).toHaveClass('is-removed');
    });

    it('NoEntries_OpensOnAddItems-InThisListShowsTheEmptyCopy', async () => {
      renderForm({ initialEntries: [] });
      expect(addTab()).toHaveAttribute('aria-selected', 'true');
      await user().click(inListTab());
      expect(
        screen.getByText(
          'Your list is empty. Add any item from the Add items tab.'
        )
      ).toBeInTheDocument();
    });

    it('ClickRowName_OpensTheSheetAtTheStagedQuantity-DoneCloses', async () => {
      const u = user();
      renderForm();
      expect(screen.getAllByRole('group', { name: 'Wants 2' })).toHaveLength(1);
      await u.click(screen.getByRole('button', { name: 'Banana' }));
      expect(screen.getAllByRole('group', { name: 'Wants 2' })).toHaveLength(2);
      await u.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getAllByRole('group', { name: 'Wants 2' })).toHaveLength(1);
    });
  });

  describe('Library', () => {
    it('Filters_NarrowTheCards-NoMatchesShowsCopy', async () => {
      const u = user();
      renderForm({}, 'edit=1&store=Amazon');
      await u.click(addTab());
      expect(
        within(library())
          .getAllByRole('heading')
          .map((h) => h.textContent)
      ).toEqual(['Apple']);
      expect(within(library()).queryByText('No items match.')).toBeNull();
    });

    it('FilteredToNothing_ShowsNoMatchesCopy', async () => {
      const u = user();
      renderForm({}, 'edit=1&q=zzz');
      await u.click(addTab());
      expect(screen.getByText('No items match.')).toBeInTheDocument();
    });

    it('SortParam_OrdersTheCards-ListOrderIsNotOffered', async () => {
      const u = user();
      renderForm({}, 'edit=1&sort=name_desc');
      await u.click(addTab());
      expect(
        within(library())
          .getAllByRole('heading')
          .map((h) => h.textContent)
      ).toEqual(['Damson', 'Cherry', 'Banana', 'Apple']);
      const sortSelect = screen.getByRole('combobox', { name: 'Sort items' });
      expect(
        within(sortSelect).queryByRole('option', { name: 'List order' })
      ).toBeNull();
      expect(
        within(sortSelect).getByRole('option', { name: 'Newest' })
      ).toBeInTheDocument();
    });

    it('LibraryPaged_PagerSitsInTheBarAndThePageParamSlices', async () => {
      const u = user();
      const many = Array.from({ length: 30 }, (_, i) =>
        item(`m${i}`, `Many ${String(i).padStart(2, '0')}`, {
          created_at: new Date(2024, 0, 1, 0, 30 - i),
        })
      );
      renderForm(
        { items: many, initialEntries: [entry('m0')] },
        'edit=1&page=2'
      );
      expect(
        screen.queryByRole('navigation', { name: 'Pagination' })
      ).toBeNull();
      await u.click(addTab());
      expect(within(library()).getAllByRole('heading')).toHaveLength(6);
      const pager = screen.getByRole('navigation', { name: 'Pagination' });
      expect(pager.closest('.edit-mode-footer')).not.toBeNull();
      expect(
        within(pager).getByRole('button', { name: 'Page 2' })
      ).toHaveAttribute('aria-current', 'page');
    });

    it('NoSpoilerControl_AnywhereInTheMode', async () => {
      const u = user();
      renderForm();
      await u.click(addTab());
      expect(screen.queryByText(/Spoilers/)).toBeNull();
    });

    it('EmptyLibrary_ShowsTheEmptyStateWithNewItem-NoToolbarNoPager', async () => {
      const u = user();
      renderForm({ items: [], initialEntries: [] });
      await u.click(addTab());
      expect(
        screen.getByText('No items in your library yet')
      ).toBeInTheDocument();
      expect(screen.queryByRole('searchbox')).toBeNull();
      expect(
        screen.queryByRole('navigation', { name: 'Pagination' })
      ).toBeNull();
      await u.click(
        within(library()).getByRole('button', { name: 'New item' })
      );
      expect(screen.getByTestId('item-form-container')).toBeInTheDocument();
    });
  });

  describe('NewItem', () => {
    it('BandButton_OpensTheForm-CreatedItemIsStagedAtOne', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'New item' }));
      expect(screen.getByTestId('item-form-container')).toBeInTheDocument();
      await u.click(screen.getByRole('button', { name: 'success-form' }));
      expect(screen.queryByTestId('item-form-container')).toBeNull();
      expect(inListTab()).toHaveTextContent('In this list · 3');
      expect(changeCount()).toHaveTextContent('1 change');
    });

    it('CloseForm_StagesNothing', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'New item' }));
      await u.click(screen.getByRole('button', { name: 'close-form' }));
      expect(screen.queryByTestId('item-form-container')).toBeNull();
      expect(changeCount()).toHaveTextContent('No changes');
    });

    it('CreatedWithoutAnId_StagesNothing', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'New item' }));
      await u.click(screen.getByRole('button', { name: 'success-form-no-id' }));
      expect(changeCount()).toHaveTextContent('No changes');
    });
  });

  describe('Save', () => {
    it('ClickSave_ConfirmsWithTheCountsBeforeWriting', async () => {
      const u = user();
      renderForm();
      await u.click(addTab());
      await u.click(
        within(cardOf('Cherry')).getByRole('button', { name: 'Increase' })
      );
      await u.click(saveButton());
      expect(
        screen.getByText('Save changes to this list?')
      ).toBeInTheDocument();
      expect(screen.getByText(/1 added and 0 removed/)).toBeInTheDocument();
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('ConfirmSave_WritesTheStagedEntriesOnce-ExitsToTheList', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));
      await u.click(
        within(rowOf('Banana')).getByRole('button', { name: 'Increase' })
      );
      await u.click(saveButton());
      await u.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledExactlyOnceWith('l1', [
          entry('b1', 3),
          entry('a1'),
        ])
      );
      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith('/lists/l1')
      );
      expect(router.refresh).toHaveBeenCalled();
    });

    it('RemovedEntry_NeverReachesTheWrite', async () => {
      const u = user();
      renderForm();
      await u.click(
        within(rowOf('Apple')).getByRole('button', { name: 'Decrease' })
      );
      await u.click(saveButton());
      await u.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', [entry('b1', 2)])
      );
    });

    it('DismissSaveConfirm_WritesNothing', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));
      await u.click(saveButton());
      await u.click(screen.getByRole('button', { name: 'Keep editing' }));
      expect(setListItems).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('WriteFails_StaysInModeWithTheStagedEditIntact', async () => {
      vi.mocked(setListItems).mockResolvedValue({
        success: false,
        message: '',
      } as never);
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));
      await u.click(saveButton());
      await u.click(confirmSave());
      await waitFor(() => expect(setListItems).toHaveBeenCalled());
      expect(router.push).not.toHaveBeenCalled();
      expect(rowNames()).toEqual(['Banana', 'Apple']);
    });

    it('Pristine_SaveIsDisabled', () => {
      renderForm();
      expect(saveButton()).toBeDisabled();
    });
  });

  describe('Cancel', () => {
    it('Dirty_ConfirmsThenDiscardsAndExits', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));
      await u.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
      await u.click(screen.getByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('Pristine_ExitsWithoutConfirming', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Discard changes?')).toBeNull();
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });
  });

  describe('ExitHref', () => {
    it('OtherSearchParams_SurviveTheToggle-PageDoesNot', async () => {
      const u = user();
      renderForm({}, 'edit=1&new=1&spoiler=progress&q=cake&page=2');
      await u.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(router.push).toHaveBeenCalledWith(
        '/lists/l1?spoiler=progress&q=cake'
      );
    });

    describe('SearchParamsNull', () => {
      const renderWithoutParams = () => {
        spHolder.value = null;
        return render(
          <EditModeForm
            list={LIST}
            items={ITEMS}
            initialEntries={[entry('a1'), entry('b1', 2)]}
            isNew={false}
            lists={[]}
          />
        );
      };

      it('Cancel_ExitsToTheBareListPath', async () => {
        renderWithoutParams();
        await user().click(screen.getByRole('button', { name: 'Cancel' }));
        expect(router.push).toHaveBeenCalledWith('/lists/l1');
      });

      it('PageSizeChange_ReplacesWithTheBareListPath', async () => {
        renderWithoutParams();
        const u = user();
        await u.click(addTab());
        await u.selectOptions(
          screen.getByRole('combobox', { name: 'Items per page' }),
          '48'
        );
        expect(router.replace).toHaveBeenCalledWith('/lists/l1');
      });
    });
  });

  describe('BackGuard', () => {
    const dirty = async (u: ReturnType<typeof userEvent.setup>) =>
      u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));

    it('DirtyThenBack_ConfirmsInsteadOfLeaving', async () => {
      const u = user();
      renderForm();
      await dirty(u);
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('DirtyThenBackThenDiscard_LeavesTheMode', async () => {
      const u = user();
      renderForm();
      await dirty(u);
      window.dispatchEvent(new PopStateEvent('popstate'));
      await u.click(await screen.findByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });

    it('DirtyThenBackThenKeepEditing_ReArmsTheGuard', async () => {
      const pushState = vi.spyOn(window.history, 'pushState');
      const u = user();
      renderForm();
      await dirty(u);
      const armed = pushState.mock.calls.length;
      window.dispatchEvent(new PopStateEvent('popstate'));
      await u.click(
        await screen.findByRole('button', { name: 'Keep editing' })
      );
      expect(pushState.mock.calls.length).toBe(armed + 1);
      expect(router.push).not.toHaveBeenCalled();
      pushState.mockRestore();
    });

    it('Pristine_BackIsNotIntercepted', () => {
      renderForm();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(screen.queryByText('Discard changes?')).toBeNull();
    });
  });

  describe('DirtyExitGuard', () => {
    it('Dirty_BeforeUnloadIsCancelled', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('Pristine_BeforeUnloadPassesThrough', () => {
      renderForm();
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });

    it('ChangeReverted_BeforeUnloadPassesThroughAgain', async () => {
      const u = user();
      renderForm();
      await u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));
      await u.click(screen.getByRole('button', { name: 'drop-b1-on-a1' }));
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  // The app's own navigation is an anchor the mode never renders, so one is
  // planted beside it — a plain same-origin link, exactly what the nav is.
  describe('InAppLinkGuard', () => {
    function renderWithLink(href = '/items', target?: string) {
      const view = renderForm();
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'planted-link';
      if (target) link.target = target;
      // Something a browser would follow, which jsdom refuses to.
      link.addEventListener('click', (e) => e.preventDefault());
      document.body.appendChild(link);
      return { ...view, link };
    }
    const dirty = async (u: ReturnType<typeof userEvent.setup>) =>
      u.click(screen.getByRole('button', { name: 'drop-a1-on-b1' }));

    it('DirtyClickOnAnInAppLink_OpensTheDiscardConfirmWithoutNavigating', async () => {
      const u = user();
      const { link } = renderWithLink('/items?tab=archived');
      await dirty(u);
      await u.click(link);
      expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
      link.remove();
    });

    it('ConfirmLeaving_FollowsTheLink', async () => {
      const u = user();
      const { link } = renderWithLink('/items?tab=archived');
      await dirty(u);
      await u.click(link);
      await u.click(await screen.findByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/items?tab=archived');
      expect(setListItems).not.toHaveBeenCalled();
      link.remove();
    });

    it('DismissLeaving_StaysAndForgetsTheLink', async () => {
      const u = user();
      const { link } = renderWithLink();
      await dirty(u);
      await u.click(link);
      await u.click(
        await screen.findByRole('button', { name: 'Keep editing' })
      );
      expect(router.push).not.toHaveBeenCalled();
      await u.click(screen.getByRole('button', { name: 'Cancel' }));
      await u.click(await screen.findByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
      link.remove();
    });

    it('PristineClickOnAnInAppLink_IsNotIntercepted', async () => {
      const u = user();
      const { link } = renderWithLink();
      await u.click(link);
      expect(screen.queryByText('Discard changes?')).toBeNull();
      link.remove();
    });

    it('NewTabLink_IsNotIntercepted', async () => {
      const u = user();
      const { link } = renderWithLink('/items', '_blank');
      await dirty(u);
      await u.click(link);
      expect(screen.queryByText('Discard changes?')).toBeNull();
      link.remove();
    });

    it('ModifiedClick_IsNotIntercepted', async () => {
      const u = user();
      const { link } = renderWithLink();
      await dirty(u);
      await u.keyboard('{Shift>}');
      await u.click(link);
      await u.keyboard('{/Shift}');
      expect(screen.queryByText('Discard changes?')).toBeNull();
      link.remove();
    });

    it('OffSiteLink_IsNotIntercepted', async () => {
      const u = user();
      const { link } = renderWithLink('https://example.com/shop');
      await dirty(u);
      await u.click(link);
      expect(screen.queryByText('Discard changes?')).toBeNull();
      link.remove();
    });

    it('ClickOnANonLink_IsNotIntercepted', async () => {
      const u = user();
      renderForm();
      await dirty(u);
      await u.click(inListTab());
      expect(screen.queryByText('Discard changes?')).toBeNull();
    });
  });

  describe('CreateFork', () => {
    const newList = () =>
      renderForm({ isNew: true, initialEntries: [] }, 'edit=1&new=1');

    it('New_OpensOnAddItems-RevertReadsSkip-PrimaryReadsSave', () => {
      newList();
      expect(addTab()).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
      expect(saveButton()).toBeEnabled();
    });

    it('NewWithNothingStaged_SaveExitsWithoutWriting', async () => {
      const u = user();
      newList();
      await u.click(saveButton());
      expect(setListItems).not.toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });

    it('NewWithSelection_PrimaryCountsTheAdds-ConfirmsLikeAnyOtherSave', async () => {
      const u = user();
      newList();
      await u.click(
        within(cardOf('Cherry')).getByRole('button', { name: 'Increase' })
      );
      await u.click(screen.getByRole('button', { name: /Add 1 item/ }));
      expect(
        screen.getByText('Save changes to this list?')
      ).toBeInTheDocument();
      await u.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', [entry('a2')])
      );
    });

    it('NewWithSelection_SkipConfirmsBeforeDiscarding', async () => {
      const u = user();
      newList();
      await u.click(
        within(cardOf('Cherry')).getByRole('button', { name: 'Increase' })
      );
      await u.click(screen.getByRole('button', { name: 'Skip' }));
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
      await u.click(screen.getByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
      expect(setListItems).not.toHaveBeenCalled();
    });
  });
});
