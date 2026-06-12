import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blockUser,
  removeFollower,
  unblockUser,
  unfollowUser,
} from '@/lib/data/user.actions';
import toast from 'react-hot-toast';
import ConnectionsAction from '../ConnectionsActions';

vi.mock('@/lib/data/user.actions', () => ({
  unfollowUser: vi.fn(),
  removeFollower: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const TARGET = 't-target';

const CASES = [
  {
    action: 'unfollow',
    label: 'Unfollow',
    fnName: 'UnfollowUser',
    mock: unfollowUser,
  },
  {
    action: 'remove',
    label: 'Remove',
    fnName: 'RemoveFollower',
    mock: removeFollower,
  },
  { action: 'block', label: 'Block', fnName: 'BlockUser', mock: blockUser },
  {
    action: 'unblock',
    label: 'Unblock',
    fnName: 'UnblockUser',
    mock: unblockUser,
  },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConnectionsAction', () => {
  describe('Label', () => {
    for (const c of CASES) {
      it(`${c.label}Action_Renders${c.label}Button`, () => {
        render(<ConnectionsAction action={c.action} targetId={TARGET} />);
        expect(
          screen.getByRole('button', { name: c.label })
        ).toBeInTheDocument();
      });
    }
  });

  describe('Dispatch', () => {
    for (const c of CASES) {
      it(`Click${c.label}_Calls${c.fnName}WithTargetId-ToastSuccess-RouterRefresh`, async () => {
        const user = userEvent.setup();
        vi.mocked(c.mock).mockResolvedValue({ success: true, message: 'done' });
        render(<ConnectionsAction action={c.action} targetId={TARGET} />);

        await user.click(screen.getByRole('button', { name: c.label }));

        await waitFor(() => expect(c.mock).toHaveBeenCalledWith(TARGET));
        expect(c.mock).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('done'));
        expect(router.refresh).toHaveBeenCalledTimes(1);
        expect(toast.error).not.toHaveBeenCalled();
      });
    }
  });

  describe('Branches', () => {
    it('ActionFails_ToastError-NoRouterRefresh', async () => {
      const user = userEvent.setup();
      vi.mocked(unfollowUser).mockResolvedValue({
        success: false,
        message: 'Cannot unfollow',
      });
      render(<ConnectionsAction action="unfollow" targetId={TARGET} />);

      await user.click(screen.getByRole('button', { name: 'Unfollow' }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Cannot unfollow')
      );
      expect(router.refresh).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('WhilePending_AriaDisabled-SecondClickNoOp', async () => {
      const user = userEvent.setup();
      let resolve!: (v: { success: boolean; message: string }) => void;
      vi.mocked(blockUser).mockReturnValue(
        new Promise((r) => {
          resolve = r;
        })
      );
      render(<ConnectionsAction action="block" targetId={TARGET} />);
      const btn = screen.getByRole('button', { name: 'Block' });

      await user.click(btn);
      await waitFor(() => expect(btn).toHaveAttribute('aria-disabled', 'true'));

      await user.click(btn);
      expect(blockUser).toHaveBeenCalledTimes(1);

      resolve({ success: true, message: 'Blocked' });
      await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    });
  });
});
