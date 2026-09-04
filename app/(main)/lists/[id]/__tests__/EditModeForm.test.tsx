import { updateList } from '@/lib/data/list.actions';
import { setListItems } from '@/lib/data/listItems.actions';
import { ROLES } from '@/lib/data/profile.roles';
import { ListTable } from '@/lib/types';
import { makeProfile } from '@/test/helpers/profile';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeForm from '../EditModeForm';

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
    onChange: (patch: Record<string, string>) => void;
  }) => (
    <div>
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
  default: (p: { onToggle: (id: string) => void }) => (
    <div>
      <button type="button" onClick={() => p.onToggle('a2')}>
        toggle-a2
      </button>
      <button type="button" onClick={() => p.onToggle('a1')}>
        toggle-a1
      </button>
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
      initialSelectedIds={['a1']}
      isNew={false}
      actor={makeProfile('p1', 'p1', ROLES.owner)}
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', ['a1', 'a2'])
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(saveButton());
      await user.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', ['a1', 'a2'])
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      await user.click(saveButton());
      expect(
        screen.getByText('Save changes to this list?')
      ).toBeInTheDocument();
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('DismissSaveConfirm_WritesNothing', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
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
      renderForm({ isNew: true, initialSelectedIds: [] }, 'edit=1&new=1');
      await user.click(screen.getByRole('button', { name: 'break-date' }));
      const skips = screen.getAllByRole('button', { name: /Skip/ });
      expect(skips[skips.length - 1]).toBeDisabled();
    });
  });

  describe('Cancel', () => {
    it('Dirty_ConfirmsThenDiscardsAndExits', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
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
          initialSelectedIds={['a1']}
          isNew={false}
          actor={makeProfile('p1', 'p1', ROLES.owner)}
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('DirtyThenBackThenDiscard_LeavesTheMode', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      window.dispatchEvent(new PopStateEvent('popstate'));
      await user.click(await screen.findByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });

    it('DirtyThenBackThenKeepEditing_ReArmsTheGuard', async () => {
      const pushState = vi.spyOn(window.history, 'pushState');
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
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
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('CreateMode', () => {
    it('NewWithSelection_ConfirmsLikeAnyOtherSave', async () => {
      const user = userEvent.setup();
      renderForm({ isNew: true, initialSelectedIds: [] }, 'edit=1&new=1');
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      await user.click(screen.getByRole('button', { name: /Add 1 item/ }));
      expect(
        screen.getByText('Save changes to this list?')
      ).toBeInTheDocument();
      expect(setListItems).not.toHaveBeenCalled();
      await user.click(confirmSave());
      await waitFor(() =>
        expect(setListItems).toHaveBeenCalledWith('l1', ['a2'])
      );
    });

    it('NewWithSelection_SkipConfirmsBeforeDiscarding', async () => {
      const user = userEvent.setup();
      renderForm({ isNew: true, initialSelectedIds: [] }, 'edit=1&new=1');
      await user.click(screen.getByRole('button', { name: 'toggle-a2' }));
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
      expect(router.push).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Discard' }));
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
      expect(setListItems).not.toHaveBeenCalled();
    });

    it('NewWithNoChanges_SkipExitsWithoutWriting', async () => {
      const user = userEvent.setup();
      renderForm({ isNew: true, initialSelectedIds: [] }, 'edit=1&new=1');
      const skips = screen.getAllByRole('button', { name: /Skip/ });
      await user.click(skips[skips.length - 1]);
      expect(setListItems).not.toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });
  });
});
