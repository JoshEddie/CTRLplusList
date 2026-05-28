import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getFollowingFeedUsers, getUserIdByEmail } from '@/lib/dal';
import { updateTag } from 'next/cache';
import FollowingPage from '../FollowingPage';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({
  getUserIdByEmail: vi.fn(),
  getFollowingFeedUsers: vi.fn(),
}));
vi.mock('next/cache', () => ({ updateTag: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const afterHolder = vi.hoisted(() => ({ cb: undefined as undefined | (() => Promise<void>) }));
vi.mock('next/server', () => ({
  after: (fn: () => Promise<void>) => {
    afterHolder.cb = fn;
  },
}));

const dbMock = vi.hoisted(() => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { update, set, where };
});
vi.mock('@/db', () => ({ db: { update: dbMock.update } }));

vi.mock('@/app/ui/components/ListCollectionsNav', () => ({
  default: () => <nav data-testid="list-collections-nav" />,
}));
vi.mock('@/app/(main)/users/ui/components/UserCardGrid', () => ({
  default: ({ users }: { users: unknown[] }) => (
    <div data-testid="user-card-grid" data-count={users.length} />
  ),
}));

const FEED = [
  {
    id: 'a',
    name: 'Alice',
    image: null,
    new_count: 1,
    latest_shared_at: null,
  },
];

beforeEach(() => {
  afterHolder.cb = undefined;
  dbMock.update.mockClear();
  dbMock.set.mockClear();
  dbMock.where.mockClear().mockResolvedValue(undefined);
  vi.mocked(updateTag).mockClear();
  redirectMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FollowingPage', () => {
  it('NoSessionEmail_RedirectsToRoot', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    await expect(FollowingPage()).rejects.toThrow('REDIRECT:/');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('UnknownUser_RedirectsToRoot', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: 'x@test.local' },
    } as never);
    vi.mocked(getUserIdByEmail).mockResolvedValue(null);
    await expect(FollowingPage()).rejects.toThrow('REDIRECT:/');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('HappyPath_RendersListCollectionsNavAndUserCardGrid', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: 'x@test.local' },
    } as never);
    vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'viewer' } as never);
    vi.mocked(getFollowingFeedUsers).mockResolvedValue(FEED as never);

    render(await FollowingPage());
    expect(screen.getByTestId('list-collections-nav')).toBeInTheDocument();
    expect(screen.getByTestId('user-card-grid')).toHaveAttribute(
      'data-count',
      '1'
    );
    expect(getFollowingFeedUsers).toHaveBeenCalledWith('viewer');
  });

  it('AfterCallback_SingleStatementLastSeenWrite_ThenUpdateTag', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: 'x@test.local' },
    } as never);
    vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'viewer' } as never);
    vi.mocked(getFollowingFeedUsers).mockResolvedValue(FEED as never);

    render(await FollowingPage());
    expect(afterHolder.cb).toBeTypeOf('function');
    await afterHolder.cb!();

    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(dbMock.set).toHaveBeenCalledTimes(1);
    expect((dbMock.set.mock.calls[0] as unknown[])[0]).toHaveProperty(
      'last_seen_following_at'
    );
    expect(dbMock.where).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith('user_follows');
    expect(dbMock.where.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(updateTag).mock.invocationCallOrder[0]
    );
  });

  it('AfterCallback_SwallowsError', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: 'x@test.local' },
    } as never);
    vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'viewer' } as never);
    vi.mocked(getFollowingFeedUsers).mockResolvedValue(FEED as never);
    dbMock.where.mockRejectedValue(new Error('boom'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(await FollowingPage());
    await expect(afterHolder.cb!()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
