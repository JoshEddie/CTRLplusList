import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { list_visits } from '@/db/schema';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import { updateTag } from 'next/cache';
import ListHeroSection from '../ListHeroSection';

// Decision 4: capture the deferred `after()` callback instead of discarding it,
// so the real visit-recording block can be invoked and asserted.
const afterCbs = vi.hoisted(() => [] as Array<() => unknown>);
vi.mock('next/server', () => ({
  after: (cb: () => unknown) => {
    afterCbs.push(cb);
  },
}));

// Decision 4b: assert the upsert payload via a `@/db` insert-chain spy.
const dbSpy = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn(
    (_config?: {
      target: unknown;
      set: { last_visited_at: unknown; visit_count: unknown };
    }) => Promise.resolve(undefined)
  );
  const values = vi.fn(
    (_row?: {
      user_id: string;
      list_id: string;
      last_visited_at: Date;
      visit_count: number;
    }) => ({ onConflictDoUpdate })
  );
  const insert = vi.fn((_table?: unknown) => ({ values }));
  return { insert, values, onConflictDoUpdate };
});
vi.mock('@/db', () => ({ db: { insert: dbSpy.insert } }));

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({
  getList: vi.fn(),
  getUserById: vi.fn(),
  getUserIdByEmail: vi.fn(),
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
    viewer_id?: string;
    owner_name?: string;
  }) => (
    <div
      data-testid="list-details"
      data-is-owner={String(p.isOwner)}
      data-show-spoilers={String(p.showSpoilers)}
      data-preview-mode={String(p.previewMode)}
      data-item-count={String(p.itemCount)}
      data-viewer-id={p.viewer_id ?? ''}
      data-owner-name={p.owner_name ?? ''}
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
  vi.mocked(getUserById).mockResolvedValue({
    id: 'u-owner',
    name: 'Owner',
    image: null,
  } as never);
  // Default: an authenticated non-owner viewing a non-private (public) list.
  vi.mocked(getList).mockResolvedValue({
    id: 'l1',
    user_id: 'u-owner',
    visibility: 'public',
    items: [{}, {}],
  } as never);
});

describe('ListHeroSection', () => {
  describe('Projection', () => {
    it('OwnerSpoilersPreview_RendersListDetailsWithDerivedProps', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        user_id: 'u-viewer',
        visibility: 'public',
        items: [{}, {}, {}],
      } as never);
      render(
        await ListHeroSection(props('l1', { spoilers: '1', preview: 'viewer' }))
      );
      const d = screen.getByTestId('list-details');
      expect(d).toHaveAttribute('data-is-owner', 'true');
      expect(d).toHaveAttribute('data-show-spoilers', 'true');
      expect(d).toHaveAttribute('data-preview-mode', 'true');
      expect(d).toHaveAttribute('data-item-count', '3');
      expect(d).toHaveAttribute('data-viewer-id', 'u-viewer');
    });

    it('NonOwnerPublicList_RendersListDetailsAsNonOwner', async () => {
      render(await ListHeroSection(props('l1')));
      const d = screen.getByTestId('list-details');
      expect(d).toHaveAttribute('data-is-owner', 'false');
      expect(d).toHaveAttribute('data-show-spoilers', 'false');
      expect(d).toHaveAttribute('data-preview-mode', 'false');
      expect(d).toHaveAttribute('data-item-count', '2');
      expect(d).toHaveAttribute('data-viewer-id', 'u-viewer');
      expect(d).toHaveAttribute('data-owner-name', 'Owner');
    });

    it('MissingOwnerRowAndItems_RendersListDetailsWithEmptyOwnerName-ZeroItems', async () => {
      vi.mocked(getUserById).mockResolvedValue(null as never);
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        user_id: 'u-owner',
        visibility: 'public',
      } as never);
      render(await ListHeroSection(props('l1')));
      const d = screen.getByTestId('list-details');
      expect(d).toHaveAttribute('data-owner-name', '');
      expect(d).toHaveAttribute('data-item-count', '0');
    });

    it('NonOwnerHiddenList_RendersListPrivateLoggedIn', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        user_id: 'u-owner',
        visibility: 'private',
        items: [],
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
        user_id: 'u-owner',
        visibility: 'private',
        items: [],
      } as never);
      render(await ListHeroSection(props('l1')));
      expect(
        screen.getByText(/please login to view it/i)
      ).toBeInTheDocument();
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

      expect(updateTag).toHaveBeenCalledWith('list_visits');
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
        user_id: 'u-viewer',
        visibility: 'public',
        items: [],
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
        user_id: 'u-owner',
        visibility: 'private',
        items: [],
      } as never);
      render(await ListHeroSection(props('l1')));
      expect(afterCbs).toHaveLength(0);
      expect(dbSpy.insert).not.toHaveBeenCalled();
    });
  });
});
