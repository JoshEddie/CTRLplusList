import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blockUser,
  unblockUser,
  unfollowUser,
} from '@/lib/data/profile.actions';
import { removeFollower } from '@/lib/data/user.actions';
import toast from 'react-hot-toast';
import ConnectionsAction from '../ConnectionsActions';

vi.mock('@/lib/data/profile.actions', () => ({
  unfollowUser: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));
vi.mock('@/lib/data/user.actions', () => ({ removeFollower: vi.fn() }));

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const ACCOUNT_ID = 'follower-account';
const PROFILE_ID = 'target-profile';

const CASES = [
  {
    props: { action: 'unfollow', targetProfileId: PROFILE_ID },
    id: PROFILE_ID,
    idKind: 'TargetProfileId',
    label: 'Unfollow',
    fnName: 'UnfollowUser',
    mock: unfollowUser,
  },
  {
    props: { action: 'remove', followerAccountId: ACCOUNT_ID },
    id: ACCOUNT_ID,
    idKind: 'FollowerAccountId',
    label: 'Remove',
    fnName: 'RemoveFollower',
    mock: removeFollower,
  },
  {
    props: { action: 'block', targetProfileId: PROFILE_ID },
    id: PROFILE_ID,
    idKind: 'TargetProfileId',
    label: 'Block',
    fnName: 'BlockUser',
    mock: blockUser,
  },
  {
    props: { action: 'unblock', targetProfileId: PROFILE_ID },
    id: PROFILE_ID,
    idKind: 'TargetProfileId',
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
        render(<ConnectionsAction {...c.props} />);
        expect(
          screen.getByRole('button', { name: c.label })
        ).toBeInTheDocument();
      });
    }
  });

  describe('Dispatch', () => {
    for (const c of CASES) {
      it(`Click${c.label}_Calls${c.fnName}With${c.idKind}-ToastSuccess-RouterRefresh`, async () => {
        const user = userEvent.setup();
        vi.mocked(c.mock).mockResolvedValue({ success: true, message: 'done' });
        render(<ConnectionsAction {...c.props} />);

        await user.click(screen.getByRole('button', { name: c.label }));

        await waitFor(() => expect(c.mock).toHaveBeenCalledWith(c.id));
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
      render(
        <ConnectionsAction action="unfollow" targetProfileId={PROFILE_ID} />
      );

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
      render(<ConnectionsAction action="block" targetProfileId={PROFILE_ID} />);
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
