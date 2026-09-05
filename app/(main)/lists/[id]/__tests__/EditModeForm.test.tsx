import { updateList } from '@/lib/data/list.actions';
import { setListItems } from '@/lib/data/listItems.actions';
import { ListTable } from '@/lib/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeForm from '../EditModeForm';
import { entry } from './test-helpers';

vi.mock('@/lib/data/listItems.actions', () => ({ setListItems: vi.fn() }));
vi.mock('@/lib/data/list.actions', () => ({ updateList: vi.fn() }));

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

vi.mock('../EditModeHeader', () => ({
  default: (p: {
    draft: { name: string };
    units: number;
    onChange: (patch: Record<string, string>) => void;
  }) => (
    <div>
      <span data-testid="units">{p.units}</span>
      <button type="button" onClick={() => p.onChange({ name: 'Renamed' })}>
        rename
      </button>
      <button type="button" onClick={() => p.onChange({ date: '' })}>
        break-date
      </button>
      <button type="button" onClick={() => p.onChange({ subtitle: '  ' })}>
        clear-subtitle
      </button>
      <span data-testid="draft-name">{p.draft.name}</span>
    </div>
  ),
}));

vi.mock('../EditModeItems', () => ({
  default: (p: {
    entries: { item_id: string; quantity: number }[];
    pending: ReadonlySet<string>;
    onQuantityChange: (id: string, quantity: number) => void;
    onReorder: (activeId: string, overId: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => p.onQuantityChange('a2', 1)}>
        add-a2
      </button>
      <button type="button" onClick={() => p.onQuantityChange('a2', 0)}>
        remove-a2
      </button>
      <button type="button" onClick={() => p.onQuantityChange('a1', 0)}>
        remove-a1
      </button>
      <button type="button" onClick={() => p.onQuantityChange('b1', 5)}>
        requantify-b1
      </button>
      <button type="button" onClick={() => p.onReorder('a1', 'b1')}>
        move-a1-to-b1
      </button>
      <button type="button" onClick={() => p.onReorder('b1', 'a1')}>
        move-b1-to-a1
      </button>
      <span data-testid="order">
        {p.entries.map((e) => `${e.item_id}:${e.quantity}`).join(',')}
      </span>
      <span data-testid="pending">{[...p.pending].sort().join(',')}</span>
    </div>
  ),
}));

const LIST = {
  id: 'l1',
  name: 'Birthday',
  subtitle: 'Brandy Family',
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
      items={[]}
      initialEntries={[entry('a1'), entry('b1', 2)]}
      isNew={false}
      lists={[]}
      {...overrides}
    />
  );
}

const saveButton = () => screen.getByRole('button', { name: 'Save' });
const confirmSave = () => screen.getByRole('button', { name: 'Save changes' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(setListItems).mockResolvedValue({
    success: true,
    message: 'Saved',
  } as never);
  vi.mocked(updateList).mockResolvedValue({
    success: true,
    message: 'Saved',
  } as never);
});

describe('EditModeForm', () => {
  describe('Save', () => {
    it('EntriesChanged_ConfirmWritesEntriesOnly-ExitsToList', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', [
          entry('a1'),
          entry('b1', 2),
          entry('a2'),
        ])
      );
      expect(updateList).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith('/lists/l1')
      );
      expect(router.refresh).toHaveBeenCalled();
    });

    it('ListRowChanged_ConfirmWritesListRowOnly', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() =>
        expect(updateList).toHaveBeenCalledWith(
          'l1',
          expect.objectContaining({ name: 'Renamed' })
        )
      );
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('BothSlicesChanged_ConfirmWritesEntriesAndListRow', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', [
          entry('a1'),
          entry('b1', 2),
          entry('a2'),
        ])
      );
      expect(updateList).toHaveBeenCalledWith(
        'l1',
        expect.objectContaining({ name: 'Renamed' })
      );
    });

    it('SubtitleClearedToWhitespace_WritesNullRatherThanBlank', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'clear-subtitle' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() =>
        expect(updateList).toHaveBeenCalledWith(
          'l1',
          expect.objectContaining({ subtitle: null })
        )
      );
    });

    it('ClickSave_ConfirmsBeforeWriting', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(saveButton());
      expect(
        screen.getByText('Save changes to this list?')
      ).toBeInTheDocument();
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('DismissSaveConfirm_WritesNothing', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(saveButton());
      await user.click(screen.getByRole('button', { name: 'Keep editing' }));
      expect(setListItems).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('EntryWriteFails_StaysInModeWithoutWritingTheListRow', async () => {
      vi.mocked(setListItems).mockResolvedValue({
        success: false,
        message: 'nope',
      } as never);
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() => expect(setListItems).toHaveBeenCalled());
      expect(updateList).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('WriteRejectsWithBlankMessage_FallsBackToTheGenericSaveError', async () => {
      vi.mocked(setListItems).mockResolvedValue({
        success: false,
        message: '',
      } as never);
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() => expect(setListItems).toHaveBeenCalled());
      expect(router.push).not.toHaveBeenCalled();
      // The mode survives the failure with the staged edit intact.
      expect(screen.getByText('+1 added')).toBeInTheDocument();
    });

    it('ListRowWriteFails_StaysInModeWithTheEntriesAlreadyWritten', async () => {
      vi.mocked(updateList).mockResolvedValue({
        success: false,
        message: 'list write rejected',
      } as never);
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() => expect(updateList).toHaveBeenCalled());
      expect(setListItems).toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('InvalidDate_SaveDisabled', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(screen.getByRole('button', { name: 'break-date' }));
      expect(saveButton()).toBeDisabled();
    });

    it('InvalidDateInCreateMode_SaveStillDisabled', async () => {
      const user = userEvent.setup();
      renderForm({ isNew: true, initialEntries: [] }, 'edit=1&new=1');
      await user.click(screen.getByRole('button', { name: 'break-date' }));
      const skips = screen.getAllByRole('button', { name: /Skip/ });
      expect(skips[skips.length - 1]).toBeDisabled();
    });
  });

  describe('Reorder', () => {
    it('Drag_StagesTheOrder-MarksOnlyTheDraggedRow-EnablesSave', async () => {
      const user = userEvent.setup();
      renderForm();
      expect(saveButton()).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'move-a1-to-b1' }));
      expect(screen.getByTestId('order')).toHaveTextContent('b1:2,a1:1');
      expect(screen.getByTestId('pending')).toHaveTextContent(/^a1$/);
      expect(saveButton()).toBeEnabled();
    });

    it('DragBack_ClearsEveryMark-DisablesSave', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'move-a1-to-b1' }));
      await user.click(screen.getByRole('button', { name: 'move-b1-to-a1' }));
      expect(screen.getByTestId('order')).toHaveTextContent('a1:1,b1:2');
      expect(screen.getByTestId('pending')).toBeEmptyDOMElement();
      expect(saveButton()).toBeDisabled();
    });

    it('DragThenSave_WritesTheStagedOrderWithQuantities', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'move-a1-to-b1' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', [
          entry('b1', 2),
          entry('a1'),
        ])
      );
    });

    it('RemoveARow_MarksItPendingWhileItSitsBelowTheDivider', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'remove-a1' }));
      expect(screen.getByTestId('order')).toHaveTextContent(/^b1:2$/);
      expect(screen.getByTestId('pending')).toHaveTextContent(/^a1$/);
    });
  });

  describe('Units', () => {
    it('StagedEntries_SumTheirQuantitiesIntoTheHeader', async () => {
      const user = userEvent.setup();
      renderForm();
      expect(screen.getByTestId('units')).toHaveTextContent('3');
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      expect(screen.getByTestId('units')).toHaveTextContent('4');
    });

    it('RequantifyARow_KeepsItsPlaceAndMarksItPending', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'requantify-b1' }));
      expect(screen.getByTestId('order')).toHaveTextContent(/^a1:1,b1:5$/);
      expect(screen.getByTestId('pending')).toHaveTextContent(/^b1$/);
      expect(screen.getByTestId('units')).toHaveTextContent('6');
    });
  });

  describe('Cancel', () => {
    it('Dirty_ConfirmsThenDiscardsAndExits', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('Pristine_ExitsWithoutConfirming', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });
  });

  describe('ExitHref', () => {
    it('OtherSearchParams_SurviveTheToggle', async () => {
      const user = userEvent.setup();
      renderForm({}, 'edit=1&new=1&tier=progress&q=cake');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(router.push).toHaveBeenCalledWith(
        '/lists/l1?tier=progress&q=cake'
      );
    });

    it('SearchParamsNull_ExitsToBareListPath', async () => {
      const user = userEvent.setup();
      spHolder.value = null;
      render(
        <EditModeForm
          list={LIST}
          items={[]}
          initialEntries={[entry('a1'), entry('b1', 2)]}
          isNew={false}
          lists={[]}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });
  });

  describe('NullListColumns', () => {
    it('NullSubtitle_SeedsTheDraftBlankAndReadsPristine', () => {
      renderForm({ list: { ...LIST, subtitle: null } as ListTable });
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
  });

  describe('BackGuard', () => {
    it('DirtyThenBack_ConfirmsInsteadOfLeaving', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('DirtyThenBackThenDiscard_LeavesTheMode', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      window.dispatchEvent(new PopStateEvent('popstate'));
      await user.click(await screen.findByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });

    it('DirtyThenBackThenKeepEditing_ReArmsTheGuard', async () => {
      const pushState = vi.spyOn(window.history, 'pushState');
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      const armed = pushState.mock.calls.length;
      window.dispatchEvent(new PopStateEvent('popstate'));
      await user.click(
        await screen.findByRole('button', { name: 'Keep editing' })
      );
      expect(pushState.mock.calls.length).toBe(armed + 1);
      expect(router.push).not.toHaveBeenCalled();
      pushState.mockRestore();
    });

    it('Pristine_BackIsNotIntercepted', () => {
      renderForm();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
    });
  });

  describe('DirtyExitGuard', () => {
    it('Dirty_BeforeUnloadIsCancelled', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
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
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(screen.getByRole('button', { name: 'remove-a2' }));
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('CreateMode', () => {
    it('NewWithSelection_ConfirmsLikeAnyOtherSave', async () => {
      const user = userEvent.setup();
      renderForm({ isNew: true, initialEntries: [] }, 'edit=1&new=1');
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(screen.getByRole('button', { name: /Add 1 item/ }));
      expect(
        screen.getByText('Save changes to this list?')
      ).toBeInTheDocument();
      expect(setListItems).not.toHaveBeenCalled();
      await user.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', [entry('a2')])
      );
    });

    it('NewWithSelection_SkipConfirmsBeforeDiscarding', async () => {
      const user = userEvent.setup();
      renderForm({ isNew: true, initialEntries: [] }, 'edit=1&new=1');
      await user.click(screen.getByRole('button', { name: 'add-a2' }));
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('NewWithNoChanges_SkipExitsWithoutWriting', async () => {
      const user = userEvent.setup();
      renderForm({ isNew: true, initialEntries: [] }, 'edit=1&new=1');
      const skips = screen.getAllByRole('button', { name: /Skip/ });
      await user.click(skips[skips.length - 1]);
      expect(setListItems).not.toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });
  });
});
