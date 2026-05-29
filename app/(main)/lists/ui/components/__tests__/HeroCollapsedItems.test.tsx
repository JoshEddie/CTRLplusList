/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The Share menu item exposes its icon as an `aria-hidden` `<svg>` with no
 * accessible name (tag query only), and the FollowDisclosureDialog's open
 * state lives on the native `<dialog>.open` property — a closed dialog is
 * outside the accessibility tree, so `container.querySelector('dialog')` is
 * the only path to assert disclosure gating.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bookmarkList,
  setListVisibility,
  unbookmarkList,
} from '@/app/actions/lists';
import { followUser, unfollowUser } from '@/app/actions/follows';
import { Menu } from '@/app/ui/components/menu';
import { ListTable } from '@/lib/types';
import { VISIBILITY } from '@/lib/visibility';
import toast from 'react-hot-toast';
import {
  BookmarkMenuItem,
  FollowMenuItem,
  ShareMenuItem,
  VisibilityMenuItems,
} from '../HeroCollapsedItems';

vi.mock('@/app/actions/lists', () => ({
  setListVisibility: vi.fn(),
  bookmarkList: vi.fn(),
  unbookmarkList: vi.fn(),
}));

vi.mock('@/app/actions/follows', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((p: Promise<unknown>) => p),
  },
}));

const CANONICAL_URL = 'https://www.ctrlpluslist.com/lists/list-1';

const baseList: ListTable = {
  id: 'list-1',
  name: 'Birthday',
  subtitle: null,
  occasion: 'Birthday',
  date: new Date('2025-01-01'),
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
  user_id: 'owner-1',
  shared: true,
};
const publicList = { ...baseList, visibility: 'public' } as ListTable;
const privateList = { ...baseList, visibility: 'private' } as ListTable;

function renderInMenu(node: ReactNode) {
  return render(
    <Menu open onClose={() => {}}>
      {node}
    </Menu>
  );
}

// FollowMenuItem renders a native <dialog>; jsdom does not implement
// showModal/close, so stub them to flip the `open` property the tests read.
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
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  dialogProto.showModal = originals.showModal;
  dialogProto.close = originals.close;
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
  vi.clearAllMocks();
});

describe('ShareMenuItem', () => {
  const shareItem = () => screen.getByRole('menuitem', { name: 'Share List' });

  it('Default_RendersShareListLabel-IconSvg', () => {
    renderInMenu(<ShareMenuItem list={publicList} />);
    const item = shareItem();
    expect(item).toBeInTheDocument();
    expect(item.querySelector('svg')).not.toBeNull();
  });

  it('PublicListSharePresent_CallsNavigatorShareWithCanonicalUrl-NoHeroParam', async () => {
    const user = userEvent.setup();
    renderInMenu(<ShareMenuItem list={publicList} />);
    await user.click(shareItem());
    expect(navigator.share).toHaveBeenCalledWith({
      title: 'Birthday',
      url: CANONICAL_URL,
    });
    const arg = vi.mocked(navigator.share).mock.calls[0][0] as { url: string };
    expect(arg.url).not.toContain('hero');
  });

  it('ShareAbsent_FallsBackToClipboardWriteText-WrappedInToastPromise', async () => {
    const user = userEvent.setup();
    // Define the stub AFTER userEvent.setup() — setup() installs its own
    // navigator.clipboard mock that would otherwise clobber ours.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderInMenu(<ShareMenuItem list={publicList} />);
    await user.click(shareItem());
    expect(writeText).toHaveBeenCalledWith(CANONICAL_URL);
    expect(toast.promise).toHaveBeenCalled();
  });

  it('NoVisibilityFieldShared_TreatsAsNonPrivate-SharesWithoutPromotion', async () => {
    const user = userEvent.setup();
    // No `visibility` field → falls back to `shared` (true ⇒ link/non-private).
    renderInMenu(<ShareMenuItem list={baseList} />);
    await user.click(shareItem());
    expect(setListVisibility).not.toHaveBeenCalled();
    expect(navigator.share).toHaveBeenCalled();
  });

  it('NoVisibilityFieldUnshared_TreatsAsPrivate-PromotesToLink', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: true,
      message: '',
    });
    const user = userEvent.setup();
    renderInMenu(<ShareMenuItem list={{ ...baseList, shared: false }} />);
    await user.click(shareItem());
    expect(setListVisibility).toHaveBeenCalledWith('list-1', VISIBILITY.LINK);
  });

  it('PrivateList_PromotesToLinkBeforeShare', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: true,
      message: '',
    });
    const user = userEvent.setup();
    renderInMenu(<ShareMenuItem list={privateList} />);
    await user.click(shareItem());
    expect(setListVisibility).toHaveBeenCalledWith('list-1', VISIBILITY.LINK);
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
  });

  it('PrivatePromoteFailure_ToastsEnableSharingError', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: false,
      message: 'denied',
    });
    const user = userEvent.setup();
    renderInMenu(<ShareMenuItem list={privateList} />);
    await user.click(shareItem());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to enable sharing')
    );
  });

  it('ClipboardReject_SwallowsErrorWithoutThrowing', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderInMenu(<ShareMenuItem list={publicList} />);
    await user.click(shareItem());
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(CANONICAL_URL));
    // The toast.promise wrapper owns the error toast; the component's own
    // catch is a no-op, so no extra toast.error fires.
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('ShareAbortError_DoesNotToastError', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(
        Object.assign(new Error('aborted'), { name: 'AbortError' })
      ),
    });
    const user = userEvent.setup();
    renderInMenu(<ShareMenuItem list={publicList} />);
    await user.click(shareItem());
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('ShareOtherError_ToastsFailedToShare', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const user = userEvent.setup();
    renderInMenu(<ShareMenuItem list={publicList} />);
    await user.click(shareItem());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to share list')
    );
  });
});

describe('VisibilityMenuItems', () => {
  const row = (label: string) =>
    screen.getByRole('menuitemradio', { name: new RegExp(`^${label}`) });

  it('Default_RendersThreeRadioRowsInSourceOrder', () => {
    renderInMenu(
      <VisibilityMenuItems listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );
    const labels = screen
      .getAllByRole('menuitemradio')
      .map((el) => el.querySelector('.menu-item-radio__label')?.textContent);
    expect(labels).toEqual(['Hidden', 'Private', 'Shared']);
  });

  it('InitialVisibility_ChecksMatchingRowOnly', () => {
    renderInMenu(
      <VisibilityMenuItems listId="list-1" initialVisibility={VISIBILITY.LINK} />
    );
    expect(row('Private')).toHaveAttribute('aria-checked', 'true');
    expect(row('Hidden')).toHaveAttribute('aria-checked', 'false');
    expect(row('Shared')).toHaveAttribute('aria-checked', 'false');
  });

  it('SelectRow_OptimisticallyChecks-CallsSetListVisibility-ToastsRowCopy', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: true,
      message: '',
    });
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );
    await user.click(row('Private'));
    expect(row('Private')).toHaveAttribute('aria-checked', 'true');
    expect(setListVisibility).toHaveBeenCalledWith('list-1', VISIBILITY.LINK);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Anyone with the link can view')
    );
  });

  it('SelectRowFailure_RevertsChecked-ToastsError', async () => {
    vi.mocked(setListVisibility).mockResolvedValue({
      success: false,
      message: 'Nope',
    });
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );
    await user.click(row('Private'));
    await waitFor(() =>
      expect(row('Hidden')).toHaveAttribute('aria-checked', 'true')
    );
    expect(toast.error).toHaveBeenCalledWith('Nope');
  });

  it('SelectAlreadyCheckedRow_IsNoOp', async () => {
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );
    await user.click(row('Hidden'));
    expect(setListVisibility).not.toHaveBeenCalled();
  });

  it('PendingTransition_RowsDisabled', async () => {
    let resolve!: (v: { success: boolean; message: string }) => void;
    vi.mocked(setListVisibility).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const user = userEvent.setup();
    renderInMenu(
      <VisibilityMenuItems listId="list-1" initialVisibility={VISIBILITY.OWNER} />
    );
    await user.click(row('Private'));
    await waitFor(() => expect(row('Hidden')).toBeDisabled());
    expect(row('Private')).toBeDisabled();
    expect(row('Shared')).toBeDisabled();
    resolve({ success: true, message: '' });
  });
});

describe('BookmarkMenuItem', () => {
  it('NotBookmarked_RendersBookmarkLabel-IconSvg', () => {
    renderInMenu(<BookmarkMenuItem listId="list-1" initialBookmarked={false} />);
    const item = screen.getByRole('menuitem', { name: 'Bookmark' });
    expect(item).toBeInTheDocument();
    expect(item.querySelector('svg')).not.toBeNull();
  });

  it('Bookmarked_RendersBookmarkedLabel', () => {
    renderInMenu(<BookmarkMenuItem listId="list-1" initialBookmarked={true} />);
    expect(
      screen.getByRole('menuitem', { name: 'Bookmarked' })
    ).toBeInTheDocument();
  });

  it('ClickFromNotBookmarked_OptimisticToggle-CallsBookmarkList-ToastsBookmarked', async () => {
    vi.mocked(bookmarkList).mockResolvedValue({ success: true, message: '' });
    const user = userEvent.setup();
    renderInMenu(<BookmarkMenuItem listId="list-1" initialBookmarked={false} />);
    await user.click(screen.getByRole('menuitem', { name: 'Bookmark' }));
    expect(
      screen.getByRole('menuitem', { name: 'Bookmarked' })
    ).toBeInTheDocument();
    await waitFor(() => expect(bookmarkList).toHaveBeenCalledWith('list-1'));
    expect(toast.success).toHaveBeenCalledWith('Bookmarked');
  });

  it('ClickFromBookmarked_CallsUnbookmarkList-ToastsBookmarkRemoved', async () => {
    vi.mocked(unbookmarkList).mockResolvedValue({ success: true, message: '' });
    const user = userEvent.setup();
    renderInMenu(<BookmarkMenuItem listId="list-1" initialBookmarked={true} />);
    await user.click(screen.getByRole('menuitem', { name: 'Bookmarked' }));
    await waitFor(() => expect(unbookmarkList).toHaveBeenCalledWith('list-1'));
    expect(toast.success).toHaveBeenCalledWith('Bookmark removed');
  });

  it('ClickFailure_RevertsState-ToastsError', async () => {
    vi.mocked(bookmarkList).mockResolvedValue({
      success: false,
      message: 'Failed',
    });
    const user = userEvent.setup();
    renderInMenu(<BookmarkMenuItem listId="list-1" initialBookmarked={false} />);
    await user.click(screen.getByRole('menuitem', { name: 'Bookmark' }));
    expect(
      await screen.findByRole('menuitem', { name: 'Bookmark' })
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Failed');
  });

  it('WhilePending_SecondClickIsNoOp', async () => {
    let resolve!: (v: { success: boolean; message: string }) => void;
    vi.mocked(bookmarkList).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const user = userEvent.setup();
    renderInMenu(<BookmarkMenuItem listId="list-1" initialBookmarked={false} />);
    await user.click(screen.getByRole('menuitem', { name: 'Bookmark' }));
    await user.click(screen.getByRole('menuitem', { name: 'Bookmarked' }));
    expect(bookmarkList).toHaveBeenCalledTimes(1);
    resolve({ success: true, message: '' });
  });
});

describe('FollowMenuItem', () => {
  const props = {
    ownerId: 'owner-1',
    ownerName: 'Bob',
    initialFollowing: false,
    requireDisclosure: false,
  };

  describe('NotFollowing', () => {
    it('WithOwnerName_RendersFollowOwnerName-IconSvg', () => {
      renderInMenu(<FollowMenuItem {...props} />);
      const item = screen.getByRole('menuitem', { name: 'Follow Bob' });
      expect(item).toBeInTheDocument();
      expect(item.querySelector('svg')).not.toBeNull();
    });

    it('NullOwnerName_RendersFollow', () => {
      renderInMenu(<FollowMenuItem {...props} ownerName={null} />);
      expect(screen.getByRole('menuitem', { name: 'Follow' })).toBeInTheDocument();
    });

    it('RequireDisclosure_ClickOpensDialog-NoImmediateFollow-ConfirmFollows', async () => {
      vi.mocked(followUser).mockResolvedValue({ success: true, message: '' });
      const user = userEvent.setup();
      const { container } = renderInMenu(
        <FollowMenuItem {...props} requireDisclosure={true} />
      );
      await user.click(screen.getByRole('menuitem', { name: 'Follow Bob' }));
      expect((container.querySelector('dialog') as HTMLDialogElement).open).toBe(
        true
      );
      expect(followUser).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Follow' }));
      await waitFor(() => expect(followUser).toHaveBeenCalledWith('owner-1'));
    });

    it('RequireDisclosure_DialogCancelClosesWithoutFollowing', async () => {
      const user = userEvent.setup();
      const { container } = renderInMenu(
        <FollowMenuItem {...props} requireDisclosure={true} />
      );
      await user.click(screen.getByRole('menuitem', { name: 'Follow Bob' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect((container.querySelector('dialog') as HTMLDialogElement).open).toBe(
        false
      );
      expect(followUser).not.toHaveBeenCalled();
    });

    it('NoDisclosure_ClickCallsFollowUser-OptimisticFollowing-ToastsFollowingName', async () => {
      vi.mocked(followUser).mockResolvedValue({ success: true, message: '' });
      const user = userEvent.setup();
      renderInMenu(<FollowMenuItem {...props} />);
      await user.click(screen.getByRole('menuitem', { name: 'Follow Bob' }));
      expect(
        screen.getByRole('menuitem', { name: 'Following' })
      ).toBeInTheDocument();
      await waitFor(() => expect(followUser).toHaveBeenCalledWith('owner-1'));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Following Bob')
      );
    });

    it('NullOwnerNameNoDisclosure_FollowSuccess-ToastsFollowingUser', async () => {
      vi.mocked(followUser).mockResolvedValue({ success: true, message: '' });
      const user = userEvent.setup();
      renderInMenu(<FollowMenuItem {...props} ownerName={null} />);
      await user.click(screen.getByRole('menuitem', { name: 'Follow' }));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Following user')
      );
    });

    it('WhilePending_SecondClickIsNoOp', async () => {
      let resolve!: (v: { success: boolean; message: string }) => void;
      vi.mocked(followUser).mockReturnValue(
        new Promise((r) => {
          resolve = r;
        })
      );
      const user = userEvent.setup();
      renderInMenu(<FollowMenuItem {...props} />);
      await user.click(screen.getByRole('menuitem', { name: 'Follow Bob' }));
      await user.click(screen.getByRole('menuitem', { name: 'Following' }));
      expect(followUser).toHaveBeenCalledTimes(1);
      resolve({ success: true, message: '' });
    });

    it('FollowFailure_RevertsToNotFollowing-ToastsError', async () => {
      vi.mocked(followUser).mockResolvedValue({
        success: false,
        message: 'Cannot follow',
      });
      const user = userEvent.setup();
      renderInMenu(<FollowMenuItem {...props} />);
      await user.click(screen.getByRole('menuitem', { name: 'Follow Bob' }));
      expect(
        await screen.findByRole('menuitem', { name: 'Follow Bob' })
      ).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith('Cannot follow');
    });
  });

  describe('Following', () => {
    it('Default_RendersFollowing-IconSvg', () => {
      renderInMenu(<FollowMenuItem {...props} initialFollowing={true} />);
      const item = screen.getByRole('menuitem', { name: 'Following' });
      expect(item).toBeInTheDocument();
      expect(item.querySelector('svg')).not.toBeNull();
    });

    it('Click_CallsUnfollowUser', async () => {
      vi.mocked(unfollowUser).mockResolvedValue({ success: true, message: '' });
      const user = userEvent.setup();
      renderInMenu(<FollowMenuItem {...props} initialFollowing={true} />);
      await user.click(screen.getByRole('menuitem', { name: 'Following' }));
      await waitFor(() => expect(unfollowUser).toHaveBeenCalledWith('owner-1'));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Unfollowed')
      );
    });

    it('UnfollowFailure_RevertsToFollowing-ToastsError', async () => {
      vi.mocked(unfollowUser).mockResolvedValue({
        success: false,
        message: 'Cannot unfollow',
      });
      const user = userEvent.setup();
      renderInMenu(<FollowMenuItem {...props} initialFollowing={true} />);
      await user.click(screen.getByRole('menuitem', { name: 'Following' }));
      expect(
        await screen.findByRole('menuitem', { name: 'Following' })
      ).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith('Cannot unfollow');
    });
  });
});
