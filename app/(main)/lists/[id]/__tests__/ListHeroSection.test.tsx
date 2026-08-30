import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNextHeaders } from '@/test/helpers/next-headers';
import { list_visits } from '@/db/schema';
import { auth } from '@/lib/auth';
import { getList } from '@/lib/data/list';
import { getUserIdentity } from '@/lib/data/profile';
import { getMembershipsForUser } from '@/lib/data/profile.active';
import { getUserIdByEmail } from '@/lib/data/user';
import { updateTag } from 'next/cache';
import ListHeroSection from '../ListHeroSection';
import { makeProfile } from '@/test/helpers/profile';

mockNextHeaders();

// Capture the deferred `after()` callback instead of discarding it,
// so the real visit-recording block can be invoked and asserted.
const afterCbs = vi.hoisted(() => [] as Array<() => unknown>);
vi.mock('next/server', () => ({
  after: (cb: () => unknown) => {
    afterCbs.push(cb);
  },
}));

// Spy the `@/db` insert chain rather than seeding PGlite — assert the upsert
// payload shape, not DB semantics.
const dbSpy = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn<
    (config?: {
      target: unknown;
      set: { last_visited_at: unknown; visit_count: unknown };
    }) => Promise<undefined>
  >(() => Promise.resolve(undefined));
  const values = vi.fn<
    (row?: {
      user_id: string;
      list_id: string;
      last_visited_at: Date;
      visit_count: number;
    }) => { onConflictDoUpdate: typeof onConflictDoUpdate }
  >(() => ({ onConflictDoUpdate }));
  const insert = vi.fn<(table?: unknown) => { values: typeof values }>(() => ({
    values,
  }));
  return { insert, values, onConflictDoUpdate };
});
vi.mock('@/db', () => ({ db: { insert: dbSpy.insert } }));

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/list', () => ({ getList: vi.fn() }));
vi.mock('@/lib/data/user', () => ({
  getUserIdByEmail: vi.fn(),
}));
vi.mock('@/lib/data/profile', () => ({ getUserIdentity: vi.fn() }));
// Mocked at the seam rather than through `next/cache`: the section reads the
// viewer's role off the memberships the request already resolved, and that
// read is `'use cache'`.
vi.mock('@/lib/data/profile.active', () => ({
  getMembershipsForUser: vi.fn(async () => []),
}));
vi.mock('@/lib/listAccess', () => ({
  guardListViewable: vi.fn(async (list: unknown) => list),
}));
vi.mock('@/app/(main)/lists/ui/components/ListDetails', () => ({
  default: (p: {
    isOwner: boolean;
    showSpoilers: boolean;
    previewMode: boolean;
    itemCount: number;
    viewer_user_id?: string;
    viewer_self_profile_id?: string;
    viewerIsManager?: boolean;
    owner: { name: string };
  }) => (
    <div
      data-testid="list-details"
      data-is-owner={String(p.isOwner)}
      data-show-spoilers={String(p.showSpoilers)}
      data-preview-mode={String(p.previewMode)}
      data-item-count={String(p.itemCount)}
      data-viewer-user-id={p.viewer_user_id ?? ''}
      data-viewer-self-profile-id={p.viewer_self_profile_id ?? ''}
      data-viewer-is-manager={String(!!p.viewerIsManager)}
      data-owner-name={p.owner.name}
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
  afterCbs.length = 0;
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'u-viewer' } as never);
  vi.mocked(getUserIdentity).mockImplementation(async (userId: string) => ({
    userId,
    selfProfile: makeProfile(`self-${userId}`, userId),
    activeProfile: makeProfile(`self-${userId}`, userId),
  }));
  // Default: an authenticated non-owner viewing a non-private (public) list.
  vi.mocked(getList).mockResolvedValue({
    id: 'l1',
    profile_id: 'self-u-owner',
    visibility: 'public',
    item_count: 2,
    profile: { id: 'self-u-owner', name: 'Owner' },
  } as never);
});

describe('ListHeroSection', () => {
  describe('Projection', () => {
    it('OwnerSpoilersPreview_RendersListDetailsWithDerivedProps', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        profile_id: 'self-u-viewer',
        visibility: 'public',
        item_count: 3,
        profile: { id: 'self-u-viewer', name: 'Owner' },
      } as never);
      render(
        await ListHeroSection(props('l1', { spoilers: '1', preview: 'viewer' }))
      );
      const d = screen.getByTestId('list-details');
      expect(d).toHaveAttribute('data-is-owner', 'true');
      expect(d).toHaveAttribute('data-show-spoilers', 'true');
      expect(d).toHaveAttribute('data-preview-mode', 'true');
      expect(d).toHaveAttribute('data-item-count', '3');
      expect(d).toHaveAttribute('data-viewer-user-id', 'u-viewer');
      expect(d).toHaveAttribute('data-viewer-self-profile-id', 'self-u-viewer');
      expect(d).toHaveAttribute('data-viewer-is-manager', 'false');
    });

    it('OwnerHoldingManagerOnTheOwningProfile_MarksTheViewerAManager', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        profile_id: 'self-u-viewer',
        visibility: 'public',
        item_count: 3,
        profile: { id: 'self-u-viewer', name: 'Owner' },
      } as never);
      vi.mocked(getMembershipsForUser).mockResolvedValue([
        { id: 'self-u-viewer', role: 'manager' },
      ] as never);

      render(await ListHeroSection(props('l1')));

      // The ownership comparison passes and the role is what narrows the
      // owner-floor affordances the hero renders.
      const d = screen.getByTestId('list-details');
      expect(d).toHaveAttribute('data-is-owner', 'true');
      expect(d).toHaveAttribute('data-viewer-is-manager', 'true');
    });

    it('NonOwnerPublicList_RendersListDetailsAsNonOwner', async () => {
      render(await ListHeroSection(props('l1')));
      const d = screen.getByTestId('list-details');
      expect(d).toHaveAttribute('data-is-owner', 'false');
      expect(d).toHaveAttribute('data-show-spoilers', 'false');
      expect(d).toHaveAttribute('data-preview-mode', 'false');
      expect(d).toHaveAttribute('data-item-count', '2');
      expect(d).toHaveAttribute('data-viewer-user-id', 'u-viewer');
      expect(d).toHaveAttribute('data-viewer-self-profile-id', 'self-u-viewer');
      expect(d).toHaveAttribute('data-owner-name', 'Owner');
    });

    it('OwnerWithoutAvatar_RendersOwnerNameWithoutImage', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        profile_id: 'self-u-owner',
        visibility: 'public',
        item_count: 0,
        profile: { id: 'self-u-owner', name: 'Owner' },
      } as never);
      render(await ListHeroSection(props('l1')));
      const d = screen.getByTestId('list-details');
      expect(d).toHaveAttribute('data-owner-name', 'Owner');
      expect(d).toHaveAttribute('data-item-count', '0');
    });

    it('NonOwnerHiddenList_RendersListPrivateLoggedIn', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        profile_id: 'self-u-owner',
        visibility: 'private',
        item_count: 0,
        profile: { id: 'self-u-owner', name: 'Owner' },
      } as never);
      render(await ListHeroSection(props('l1')));
      expect(
        screen.getByRole('heading', { name: /This list is private/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/please login to view it/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('list-details')).not.toBeInTheDocument();
    });

    it('UnauthenticatedHiddenList_RendersListPrivateLoggedOut', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        profile_id: 'self-u-owner',
        visibility: 'private',
        item_count: 0,
        profile: { id: 'self-u-owner', name: 'Owner' },
      } as never);
      render(await ListHeroSection(props('l1')));
      expect(screen.getByText(/please login to view it/i)).toBeInTheDocument();
    });
  });

  describe('VisitRecording', () => {
    it('AuthedNonOwnerNonPrivate_RecordsVisitUpsert', async () => {
      render(await ListHeroSection(props('l1')));
      expect(afterCbs).toHaveLength(1);

      await Promise.all(afterCbs.map((cb) => cb()));

      expect(dbSpy.insert).toHaveBeenCalledWith(list_visits);
      expect(dbSpy.values).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-viewer',
          list_id: 'l1',
          visit_count: 1,
        })
      );
      expect(dbSpy.values.mock.calls[0]?.[0]?.last_visited_at).toBeInstanceOf(
        Date
      );

      const conflictArg = dbSpy.onConflictDoUpdate.mock.calls[0]?.[0];
      expect(conflictArg?.target).toEqual([
        list_visits.user_id,
        list_visits.list_id,
      ]);
      expect(conflictArg?.set.last_visited_at).toBeInstanceOf(Date);
      expect(conflictArg?.set.visit_count).toBeDefined();

      // updateTag throws inside after() (render scope) and visit-recency
      // reads are uncached, so the callback must not fire any tag (#305).
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('UpsertThrows_LogsError-NoUpdateTag', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      dbSpy.onConflictDoUpdate.mockRejectedValueOnce(new Error('db down'));
      render(await ListHeroSection(props('l1')));

      await Promise.all(afterCbs.map((cb) => cb()));

      expect(errorSpy).toHaveBeenCalledWith(
        'Error recording visit:',
        expect.any(Error)
      );
      expect(updateTag).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('Owner_DoesNotRecord', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        profile_id: 'self-u-viewer',
        visibility: 'public',
        item_count: 0,
        profile: { id: 'self-u-viewer', name: 'Owner' },
      } as never);
      render(await ListHeroSection(props('l1')));
      expect(afterCbs).toHaveLength(0);
      expect(dbSpy.insert).not.toHaveBeenCalled();
    });

    it('Unauthenticated_DoesNotRecord', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      render(await ListHeroSection(props('l1')));
      expect(afterCbs).toHaveLength(0);
      expect(dbSpy.insert).not.toHaveBeenCalled();
    });

    it('NonOwnerHiddenList_DoesNotRecord', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        profile_id: 'self-u-owner',
        visibility: 'private',
        item_count: 0,
        profile: { id: 'self-u-owner', name: 'Owner' },
      } as never);
      render(await ListHeroSection(props('l1')));
      expect(afterCbs).toHaveLength(0);
      expect(dbSpy.insert).not.toHaveBeenCalled();
    });
  });
});
