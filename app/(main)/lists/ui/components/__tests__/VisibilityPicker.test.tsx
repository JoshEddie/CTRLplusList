import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setListVisibility } from '@/lib/data/list.actions';
import { VISIBILITY } from '@/lib/visibility';
import toast from 'react-hot-toast';
import VisibilityPicker from '../VisibilityPicker';

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/data/list.actions', () => ({ setListVisibility: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function trigger() {
  return screen.getByRole('button', { name: /Visibility:/ });
}

async function openAndSelect(
  user: ReturnType<typeof userEvent.setup>,
  name: RegExp
) {
  await user.click(trigger());
  await user.click(screen.getByRole('menuitemradio', { name }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VisibilityPicker', () => {
  it('SelectDifferentRow_CallsSetVisibility-OptimisticLabel-ToastSuccess-RouterRefresh', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: true,
      message: '',
    });
    const user = userEvent.setup();
    render(
      <VisibilityPicker listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );
    expect(
      screen.getByRole('button', { name: /Visibility: Hidden/ })
    ).toBeInTheDocument();

    await openAndSelect(user, /Shared/);

    expect(setListVisibility).toHaveBeenCalledWith(
      'list-1',
      VISIBILITY.FOLLOWERS
    );
    // Optimistic: the trigger pill advances to the selected label immediately.
    expect(
      screen.getByRole('button', { name: /Visibility: Shared/ })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Shared — your followers can now find it'
      )
    );
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('FailedApply_RollsBackPill-ToastError-NoRefresh', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: false,
      message: 'Could not update visibility',
    });
    const user = userEvent.setup();
    render(
      <VisibilityPicker listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );

    await openAndSelect(user, /Shared/);

    // Rolls back from the optimistic "Shared" to the prior "Hidden".
    expect(
      await screen.findByRole('button', { name: /Visibility: Hidden/ })
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Could not update visibility');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('ReselectCurrentRow_NoSetVisibilityCall', async () => {
    const user = userEvent.setup();
    render(
      <VisibilityPicker listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );

    await openAndSelect(user, /Hidden/);

    expect(setListVisibility).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('EscapeKey_ClosesMenu', async () => {
    const user = userEvent.setup();
    render(
      <VisibilityPicker listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );
    await user.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('PendingChange_DisablesMenuRows', async () => {
    let resolveApply: (v: {
      success: boolean;
      message: string;
    }) => void = () => {};
    vi.mocked(setListVisibility).mockReturnValue(
      new Promise((r) => {
        resolveApply = r;
      })
    );
    const user = userEvent.setup();
    render(
      <VisibilityPicker listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );

    await openAndSelect(user, /Shared/);
    // The selection closed the menu while the transition is in flight; reopen
    // it to observe the rows under the pending state.
    await user.click(trigger());

    for (const row of screen.getAllByRole('menuitemradio')) {
      expect(row).toBeDisabled();
    }

    resolveApply({ success: true, message: '' });
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });
});
