import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNextHeaders } from '@/test/helpers/next-headers';
import { auth } from '@/lib/auth';
import { getList } from '@/lib/data/list';
import { getUserIdentity, hasBlocked } from '@/lib/data/profile';
import { getSpoilerBaseline } from '@/lib/data/profile.members';
import { getUserIdByEmail } from '@/lib/data/user';
import { MAXIMAL_TIER, PROTECTED_TIER } from '@/lib/spoilers';
import ListItemsSection from '../ListItemsSection';
import { makeProfile } from '@/test/helpers/profile';

mockNextHeaders();

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/list', () => ({ getList: vi.fn() }));
vi.mock('@/lib/data/profile', () => ({
  getUserIdentity: vi.fn(),
  hasBlocked: vi.fn(),
}));
vi.mock('@/lib/data/user', () => ({
  getUserIdByEmail: vi.fn(),
  isFollowing: vi.fn(),
}));
vi.mock('@/lib/data/profile.members', () => ({
  getSpoilerBaseline: vi.fn(),
}));
// guardListViewable (lib/listAccess) statically imports `@/db`, which calls
// neon() at module load. The query path (isItemViewable) is never reached here,
// so an empty stub satisfies the import without a live connection string.
vi.mock('@/db', () => ({ db: {} }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/items/ui/components/SortItemsContainer', () => ({
  default: (p: { listId: string; tier?: string }) => (
    <div
      data-testid="sort-items-container"
      data-list-id={p.listId}
      data-tier={String(p.tier)}
    />
  ),
}));
vi.mock('@/app/(main)/items/ui/components/ItemsContainer', () => ({
  default: (p: {
    listId: string;
    viewerSelfProfileId?: string;
    tier?: string;
  }) => (
    <div
      data-testid="items-container"
      data-list-id={p.listId}
      data-viewer-self-profile-id={p.viewerSelfProfileId ?? ''}
      data-tier={String(p.tier)}
    />
  ),
}));

function props(id = 'l1', sp: Record<string, string> = {}) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(sp),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'u1',
    name: 'Owner',
  } as never);
  vi.mocked(getUserIdentity).mockImplementation(async (userId: string) => ({
    userId,
    selfProfile: makeProfile(`p-${userId}`, userId),
    activeProfile: makeProfile(`p-${userId}`, userId),
  }));
  vi.mocked(hasBlocked).mockResolvedValue(false as never);
  vi.mocked(getSpoilerBaseline).mockResolvedValue(PROTECTED_TIER);
  vi.mocked(getList).mockResolvedValue({
    id: 'l1',
    profile_id: 'p-u1',
    visibility: 'public',
  } as never);
});

describe('ListItemsSection', () => {
  it('OwnerSurpriseTierUnfiltered_MountsSortItemsContainer', async () => {
    vi.mocked(getList).mockResolvedValue({
      id: 'l1',
      profile_id: 'p-u1',
      visibility: 'private',
    } as never);
    render(await ListItemsSection(props('l1')));
    const c = screen.getByTestId('sort-items-container');
    expect(c).toHaveAttribute('data-list-id', 'l1');
    expect(c).toHaveAttribute('data-tier', 'surprise');
  });

  // Raising the tier changes what each row discloses, not which rows are
  // present or their order, so the reorder layout stays put — only the filter
  // condition leaves it.
  it('OwnerRaisedTierUnfiltered_StillMountsSortItemsContainerAtRaisedTier', async () => {
    vi.mocked(getSpoilerBaseline).mockResolvedValue(MAXIMAL_TIER);
    render(await ListItemsSection(props('l1')));
    const c = screen.getByTestId('sort-items-container');
    expect(c).toHaveAttribute('data-tier', 'claims');
    expect(screen.queryByTestId('items-container')).not.toBeInTheDocument();
  });

  it('OwnerWithAStoreFilter_MountsItemsContainerInstead', async () => {
    render(await ListItemsSection(props('l1', { store: 'Amazon' })));
    expect(screen.getByTestId('items-container')).toBeInTheDocument();
    expect(
      screen.queryByTestId('sort-items-container')
    ).not.toBeInTheDocument();
  });

  it('Viewer_MountsItemsContainerWithViewerProfileId', async () => {
    vi.mocked(getUserIdByEmail).mockResolvedValue({
      id: 'u2',
      name: 'Viewer',
    } as never);
    render(await ListItemsSection(props('l1')));
    const c = screen.getByTestId('items-container');
    expect(c).toHaveAttribute('data-viewer-self-profile-id', 'p-u2');
  });

  // Preview renders claim information at the OWNER's own resolved tier, not at
  // the tier a non-member would resolve to.
  it('OwnerPreviewMode_MountsItemsContainerAtTheOwnersOwnTier', async () => {
    render(await ListItemsSection(props('l1', { preview: 'viewer' })));
    const c = screen.getByTestId('items-container');
    expect(c).toHaveAttribute('data-tier', 'surprise');
    expect(c).toHaveAttribute('data-viewer-self-profile-id', 'p-u1');
  });

  it('OwnerOnlyListNonOwner_RendersNothing', async () => {
    vi.mocked(getUserIdByEmail).mockResolvedValue({
      id: 'u2',
      name: 'Viewer',
    } as never);
    vi.mocked(getList).mockResolvedValue({
      id: 'l1',
      profile_id: 'p-u1',
      visibility: 'private',
    } as never);
    const { container } = render(await ListItemsSection(props('l1')));
    expect(container).toBeEmptyDOMElement();
  });

  describe('EditMode', () => {
    it('Owner_RendersNothingSoTheModeOwnsTheItemSurface', async () => {
      const { container } = render(
        await ListItemsSection(props('l1', { edit: '1' }))
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('NonOwner_StillRendersTheOrdinaryItemsContainer', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue({
        id: 'u2',
        name: 'Viewer',
      } as never);
      render(await ListItemsSection(props('l1', { edit: '1' })));
      expect(screen.getByTestId('items-container')).toBeInTheDocument();
    });
  });

  describe('GuardRedirects', () => {
    it('MissingListAuthedViewer_RedirectsToLists', async () => {
      vi.mocked(getList).mockResolvedValue(null as never);
      await expect(ListItemsSection(props('l1'))).rejects.toThrow(
        'REDIRECT:/lists'
      );
    });

    it('MissingListUnauthenticated_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      vi.mocked(getList).mockResolvedValue(null as never);
      await expect(ListItemsSection(props('l1'))).rejects.toThrow('REDIRECT:/');
    });

    it('BlockedViewer_RedirectsToLists', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue({
        id: 'u2',
        name: 'Viewer',
      } as never);
      vi.mocked(hasBlocked).mockResolvedValue(true as never);
      await expect(ListItemsSection(props('l1'))).rejects.toThrow(
        'REDIRECT:/lists'
      );
    });
  });
});
