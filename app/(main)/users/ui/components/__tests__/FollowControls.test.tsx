/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * Asserting the disclosure dialog's open/closed state requires reading the
 * native <dialog>'s `open` property; a closed dialog is not in the
 * accessibility tree, so classed `container.querySelector('dialog')` is the
 * only path.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { followUser, unfollowUser } from '@/app/actions/follows';
import toast from 'react-hot-toast';
import FollowControls from '../FollowControls';

vi.mock('@/app/actions/follows', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const USER_ID = 'u-target';

const dialogProto = HTMLDialogElement.prototype as unknown as Record<
  string,
  unknown
>;
const originals = { showModal: dialogProto.showModal, close: dialogProto.close };

beforeEach(() => {
  dialogProto.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  dialogProto.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

afterEach(() => {
  dialogProto.showModal = originals.showModal;
  dialogProto.close = originals.close;
  vi.mocked(followUser).mockReset();
  vi.mocked(unfollowUser).mockReset();
  router.refresh.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

function renderControls(
  overrides: Partial<React.ComponentProps<typeof FollowControls>> = {}
) {
  return render(
    <FollowControls
      userId={USER_ID}
      userName={overrides.userName ?? 'Bob'}
      initialFollowing={overrides.initialFollowing ?? false}
      requireDisclosure={overrides.requireDisclosure ?? false}
    />
  );
}

const mainFollow = () => screen.getByRole('button', { name: 'Follow Bob' });
const mainFollowing = () => screen.getByRole('button', { name: 'Following' });

describe('FollowControls', () => {
  it('ClickFollow_OptimisticFlip-CallsFollowUser-ToastSuccess-RouterRefresh', async () => {
    const user = userEvent.setup();
    vi.mocked(followUser).mockResolvedValue({
      success: true,
      message: 'Following',
    });
    renderControls();
    await user.click(mainFollow());
    expect(mainFollowing()).toBeInTheDocument();
    await waitFor(() => expect(followUser).toHaveBeenCalledWith(USER_ID));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Following Bob')
    );
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('FollowFails_RevertsToFalse-ToastError', async () => {
    const user = userEvent.setup();
    vi.mocked(followUser).mockResolvedValue({
      success: false,
      message: 'Cannot follow',
    });
    renderControls();
    await user.click(mainFollow());
    await waitFor(() => expect(mainFollow()).toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith('Cannot follow');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('ClickUnfollow_OptimisticFalse-CallsUnfollowUser-ToastSuccess', async () => {
    const user = userEvent.setup();
    vi.mocked(unfollowUser).mockResolvedValue({
      success: true,
      message: 'Unfollowed',
    });
    renderControls({ initialFollowing: true });
    await user.click(mainFollowing());
    expect(mainFollow()).toBeInTheDocument();
    await waitFor(() => expect(unfollowUser).toHaveBeenCalledWith(USER_ID));
    expect(toast.success).toHaveBeenCalledWith('Unfollowed');
  });

  it('UnfollowFails_RevertsToTrue-ToastError', async () => {
    const user = userEvent.setup();
    vi.mocked(unfollowUser).mockResolvedValue({
      success: false,
      message: 'Failed to unfollow',
    });
    renderControls({ initialFollowing: true });
    await user.click(mainFollowing());
    await waitFor(() => expect(mainFollowing()).toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith('Failed to unfollow');
  });

  it('WhilePending_ClickIsNoOp', async () => {
    const user = userEvent.setup();
    let resolve!: (v: { success: boolean; message: string }) => void;
    vi.mocked(followUser).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    renderControls();
    await user.click(mainFollow());
    await waitFor(() =>
      expect(mainFollowing()).toHaveAttribute('aria-disabled', 'true')
    );
    await user.click(mainFollowing());
    expect(followUser).toHaveBeenCalledTimes(1);
    resolve({ success: true, message: 'Following' });
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it('DisclosureRequired_ClickOpensDialog-NoFollowYet', async () => {
    const user = userEvent.setup();
    const { container } = renderControls({ requireDisclosure: true });
    await user.click(mainFollow());
    expect(
      (container.querySelector('dialog') as HTMLDialogElement).open
    ).toBe(true);
    expect(followUser).not.toHaveBeenCalled();
  });

  it('DialogConfirm_ClosesAndPerformsFollow', async () => {
    const user = userEvent.setup();
    vi.mocked(followUser).mockResolvedValue({
      success: true,
      message: 'Following',
    });
    const { container } = renderControls({ requireDisclosure: true });
    await user.click(mainFollow());
    await user.click(screen.getByRole('button', { name: 'Follow' }));
    expect(
      (container.querySelector('dialog') as HTMLDialogElement).open
    ).toBe(false);
    await waitFor(() => expect(followUser).toHaveBeenCalledWith(USER_ID));
  });

  it('DialogCancel_ClosesWithoutFollowing', async () => {
    const user = userEvent.setup();
    const { container } = renderControls({ requireDisclosure: true });
    await user.click(mainFollow());
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      (container.querySelector('dialog') as HTMLDialogElement).open
    ).toBe(false);
    expect(followUser).not.toHaveBeenCalled();
  });

  it('NullName_DialogSaysThisUser-ToastSaysUser', async () => {
    const user = userEvent.setup();
    vi.mocked(followUser).mockResolvedValue({
      success: true,
      message: 'Following',
    });
    const { container } = render(
      <FollowControls
        userId={USER_ID}
        userName={null}
        initialFollowing={false}
        requireDisclosure={false}
      />
    );
    expect(
      (container.querySelector('.follow-disclosure-title') as HTMLElement)
        .textContent
    ).toContain('this user');
    await user.click(screen.getAllByRole('button', { name: 'Follow' })[0]);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Following user')
    );
  });

  it('Following_UnfollowsWithoutDisclosureGate', async () => {
    const user = userEvent.setup();
    vi.mocked(unfollowUser).mockResolvedValue({
      success: true,
      message: 'Unfollowed',
    });
    const { container } = renderControls({
      initialFollowing: true,
      requireDisclosure: true,
    });
    await user.click(mainFollowing());
    expect(
      (container.querySelector('dialog') as HTMLDialogElement).open
    ).toBe(false);
    await waitFor(() => expect(unfollowUser).toHaveBeenCalledWith(USER_ID));
  });
});
