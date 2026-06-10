/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The async composers render a FollowMenuItem whose disclosure gating is only
 * observable via the native `<dialog>.open` property; a closed dialog is
 * outside the accessibility tree, so `container.querySelector('dialog')` is
 * the only path to assert it.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasBlocked, isFollowing, viewerHasAnyFollows } from '@/lib/data/user';
import { getBookmarkStatus } from '@/lib/data/visit';
import { followUser } from '@/lib/data/user.actions';
import { ListTable } from '@/lib/types';
import { VISIBILITY } from '@/lib/visibility';
import {
  HeroCollapsedOwnerItems,
  HeroCollapsedViewerItems,
} from '../HeroCollapsedItemsContainer';

vi.mock('@/lib/data/visit', () => ({
  getBookmarkStatus: vi.fn(),
}));
vi.mock('@/lib/data/user', () => ({
  isFollowing: vi.fn(),
  hasBlocked: vi.fn(),
  viewerHasAnyFollows: vi.fn(),
}));

// The composed child factories reach the DB/network boundary via these
// modules; mocking them keeps the container unit test off the server graph.
vi.mock('@/lib/data/list.actions', () => ({
  setListVisibility: vi.fn(),
}));
vi.mock('@/lib/data/visit.actions', () => ({
  bookmarkList: vi.fn(),
  unbookmarkList: vi.fn(),
}));
vi.mock('@/lib/data/user.actions', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((p: Promise<unknown>) => p),
  },
}));

const OWNER_ID = 'owner-1';
const VIEWER_ID = 'viewer-1';

const list: ListTable = {
  id: 'list-1',
  name: 'Birthday',
  subtitle: null,
  occasion: 'Birthday',
  date: new Date('2025-01-01'),
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
  user_id: OWNER_ID,
  shared: true,
};

const viewerProps = {
  list,
  ownerId: OWNER_ID,
  ownerName: 'Bob',
  viewerId: VIEWER_ID,
};

const dialogProto = HTMLDialogElement.prototype as unknown as Record<
  string,
  unknown
>;
const originals = {
  showModal: dialogProto.showModal,
  close: dialogProto.close,
};

beforeEach(() => {
  dialogProto.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  dialogProto.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  vi.mocked(getBookmarkStatus).mockResolvedValue(false);
  vi.mocked(isFollowing).mockResolvedValue(false);
  vi.mocked(hasBlocked).mockResolvedValue(false);
  vi.mocked(viewerHasAnyFollows).mockResolvedValue(true);
});

afterEach(() => {
  dialogProto.showModal = originals.showModal;
  dialogProto.close = originals.close;
  vi.clearAllMocks();
});

const radioLabels = () =>
  screen
    .getAllByRole('menuitemradio')
    .map((el) => el.querySelector('.menu-item-radio__label')?.textContent);

describe('HeroCollapsedOwnerItems', () => {
  it('Default_RendersShareThenVisibilitySeededFromProp-NoBookmarkOrFollow', async () => {
    render(
      await HeroCollapsedOwnerItems({ list, visibility: VISIBILITY.LINK })
    );
    expect(
      screen.getByRole('menuitem', { name: 'Share List' })
    ).toBeInTheDocument();
    expect(radioLabels()).toEqual(['Hidden', 'Private', 'Shared']);
    expect(
      screen.getByRole('menuitemradio', { name: /^Private/ })
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.queryByRole('menuitem', { name: /Bookmark/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /Follow/ })
    ).not.toBeInTheDocument();
  });

  it('Default_PerformsNoDalReads', async () => {
    await HeroCollapsedOwnerItems({ list, visibility: VISIBILITY.OWNER });
    expect(getBookmarkStatus).not.toHaveBeenCalled();
    expect(isFollowing).not.toHaveBeenCalled();
    expect(hasBlocked).not.toHaveBeenCalled();
    expect(viewerHasAnyFollows).not.toHaveBeenCalled();
  });
});

describe('HeroCollapsedViewerItems', () => {
  it('NeitherBlocks_RendersShareBookmarkFollow-SeededFromDal', async () => {
    vi.mocked(getBookmarkStatus).mockResolvedValue(true);
    vi.mocked(isFollowing).mockResolvedValue(false);
    render(await HeroCollapsedViewerItems(viewerProps));
    expect(
      screen.getByRole('menuitem', { name: 'Share List' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Bookmarked' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Follow Bob' })
    ).toBeInTheDocument();
  });

  it('OwnerBlocksViewer_SuppressesFollow-KeepsShareBookmark', async () => {
    vi.mocked(hasBlocked).mockImplementation(
      async ({ userId, blockedId }) =>
        userId === OWNER_ID && blockedId === VIEWER_ID
    );
    render(await HeroCollapsedViewerItems(viewerProps));
    expect(
      screen.queryByRole('menuitem', { name: /Follow/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Share List' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /Bookmark/ })
    ).toBeInTheDocument();
  });

  it('ViewerBlocksOwner_SuppressesFollow', async () => {
    vi.mocked(hasBlocked).mockImplementation(
      async ({ userId, blockedId }) =>
        userId === VIEWER_ID && blockedId === OWNER_ID
    );
    render(await HeroCollapsedViewerItems(viewerProps));
    expect(
      screen.queryByRole('menuitem', { name: /Follow/ })
    ).not.toBeInTheDocument();
  });

  it('ViewerHasNoFollows_SeedsRequireDisclosure-ClickOpensDialog', async () => {
    vi.mocked(viewerHasAnyFollows).mockResolvedValue(false);
    const user = userEvent.setup();
    const { container } = render(await HeroCollapsedViewerItems(viewerProps));
    await user.click(screen.getByRole('menuitem', { name: 'Follow Bob' }));
    expect((container.querySelector('dialog') as HTMLDialogElement).open).toBe(
      true
    );
    expect(followUser).not.toHaveBeenCalled();
  });

  it('ViewerHasFollows_SeedsNoDisclosure-ClickFollowsDirectly', async () => {
    vi.mocked(viewerHasAnyFollows).mockResolvedValue(true);
    vi.mocked(followUser).mockResolvedValue({ success: true, message: '' });
    const user = userEvent.setup();
    const { container } = render(await HeroCollapsedViewerItems(viewerProps));
    await user.click(screen.getByRole('menuitem', { name: 'Follow Bob' }));
    expect((container.querySelector('dialog') as HTMLDialogElement).open).toBe(
      false
    );
    expect(followUser).toHaveBeenCalledWith(OWNER_ID);
  });
});
