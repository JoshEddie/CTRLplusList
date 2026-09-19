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

function option(name: RegExp) {
  return screen.getByRole('radio', { name });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VisibilityPicker', () => {
  it('BelowTheOwnerFloor_RendersAllOptionsDisabled', () => {
    render(
      <VisibilityPicker
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled
      />
    );

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });

  it('CurrentVisibility_AriaCheckedTrue', () => {
    render(
      <VisibilityPicker
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );
    expect(option(/Hidden/)).toHaveAttribute('aria-checked', 'true');
    expect(option(/Shared/)).toHaveAttribute('aria-checked', 'false');
  });

  it('SelectDifferentOption_CallsSetVisibility-OptimisticUpdate-ToastSuccess-RouterRefresh', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: true,
      message: '',
    });
    const user = userEvent.setup();
    render(
      <VisibilityPicker
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );

    await user.click(option(/Shared/));

    expect(setListVisibility).toHaveBeenCalledWith(
      'list-1',
      VISIBILITY.FOLLOWERS
    );
    expect(option(/Shared/)).toHaveAttribute('aria-checked', 'true');
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Shared — your followers can now find it'
      )
    );
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('FailedApply_RollsBackSelection-ToastError-NoRefresh', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: false,
      message: 'Could not update visibility',
    });
    const user = userEvent.setup();
    render(
      <VisibilityPicker
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );

    await user.click(option(/Shared/));

    expect(
      await screen.findByRole('radio', { name: /Hidden/, checked: true })
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Could not update visibility');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('ReselectCurrentOption_NoSetVisibilityCall', async () => {
    const user = userEvent.setup();
    render(
      <VisibilityPicker
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );

    await user.click(option(/Hidden/));

    expect(setListVisibility).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('PendingChange_DisablesAllOptions', async () => {
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
      <VisibilityPicker
        listId="list-1"
        initialVisibility={VISIBILITY.OWNER}
        disabled={false}
      />
    );

    await user.click(option(/Shared/));

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }

    resolveApply({ success: true, message: '' });
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });
});
