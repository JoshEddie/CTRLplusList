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

vi.mock('@/app/(main)/items/ui/components/EmptyListCTA', () => ({
  default: (p: { listId: string }) => (
    <div data-testid="empty-list-cta" data-list-id={p.listId} />
  ),
}));
vi.mock('@/app/(main)/items/ui/components/ItemsContainer', () => ({
  default: (p: {
    listId: string;
    viewerSelfProfileId?: string;
    tier?: string;
    emptyState?: React.ReactNode;
  }) => (
    <div
      data-testid="items-container"
      data-list-id={p.listId}
      data-viewer-self-profile-id={p.viewerSelfProfileId ?? ''}
      data-tier={String(p.tier)}
    >
      {p.emptyState}
    </div>
  ),
}));

function props(id = 'l1', sp: Record<string, string> = {}) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(sp),
  };
}

const asViewer = () =>
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'u2',
    name: 'Viewer',
  } as never);

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
  // The owner's default view is a member's view: the same read-only surface,
  // at the owner's own resolved tier, with the owner's empty-list door inside.
  describe('Owner', () => {
    it('Default_MountsTheReadOnlyItemsContainerAtTheOwnersTier', async () => {
      render(await ListItemsSection(props('l1')));
      const c = screen.getByTestId('items-container');
      expect(c).toHaveAttribute('data-list-id', 'l1');
      expect(c).toHaveAttribute('data-tier', 'surprise');
      expect(c).toHaveAttribute('data-viewer-self-profile-id', 'p-u1');
    });

    it('RaisedTier_MountsTheSameContainerAtTheRaisedTier', async () => {
      vi.mocked(getSpoilerBaseline).mockResolvedValue(MAXIMAL_TIER);
      render(await ListItemsSection(props('l1')));
      expect(screen.getByTestId('items-container')).toHaveAttribute(
        'data-tier',
        'claims'
      );
    });

    it('Default_HandsTheContainerTheEmptyListDoor', async () => {
      render(await ListItemsSection(props('l1')));
      expect(screen.getByTestId('empty-list-cta')).toHaveAttribute(
        'data-list-id',
        'l1'
      );
    });

    it('PreviewParam_IsIgnored-SameContainerSameTier', async () => {
      render(await ListItemsSection(props('l1', { preview: 'viewer' })));
      const c = screen.getByTestId('items-container');
      expect(c).toHaveAttribute('data-tier', 'surprise');
      expect(screen.getByTestId('empty-list-cta')).toBeInTheDocument();
    });
  });

  describe('Viewer', () => {
    beforeEach(asViewer);

    it('Default_MountsItemsContainerWithViewerProfileId', async () => {
      render(await ListItemsSection(props('l1')));
      expect(screen.getByTestId('items-container')).toHaveAttribute(
        'data-viewer-self-profile-id',
        'p-u2'
      );
    });

    it('Default_GetsNoEmptyListDoor', async () => {
      render(await ListItemsSection(props('l1')));
      expect(screen.queryByTestId('empty-list-cta')).not.toBeInTheDocument();
    });

    it('OwnerOnlyList_RendersNothing', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        profile_id: 'p-u1',
        visibility: 'private',
      } as never);
      const { container } = render(await ListItemsSection(props('l1')));
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('EditMode', () => {
    it('Owner_RendersNothingSoTheModeOwnsTheItemSurface', async () => {
      const { container } = render(
        await ListItemsSection(props('l1', { edit: '1' }))
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('NonOwner_StillRendersTheOrdinaryItemsContainer', async () => {
      asViewer();
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
      asViewer();
      vi.mocked(hasBlocked).mockResolvedValue(true as never);
      await expect(ListItemsSection(props('l1'))).rejects.toThrow(
        'REDIRECT:/lists'
      );
    });
  });
});
