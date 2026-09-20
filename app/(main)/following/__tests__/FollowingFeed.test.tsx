import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFollowingFeedProfiles } from '@/lib/data/user';
import { authedUserId } from '@/lib/data/user.session';
import { updateTag } from 'next/cache';
import FollowingFeed from '../FollowingFeed';

vi.mock('@/lib/data/user', () => ({ getFollowingFeedProfiles: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedUserId: vi.fn() }));
vi.mock('next/cache', () => ({ updateTag: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const afterHolder = vi.hoisted(() => ({
  cb: undefined as undefined | (() => Promise<void>),
}));
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

vi.mock('@/app/(main)/users/ui/components/UserCardGrid', () => ({
  default: ({ profiles }: { profiles: unknown[] }) => (
    <div data-testid="user-card-grid" data-count={profiles.length} />
  ),
}));

const FEED = [
  {
    id: 'a',
    name: 'Alice',
    accent: null,
    art: null,
    avatarStyle: null,
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
  vi.mocked(getFollowingFeedProfiles).mockResolvedValue(FEED as never);
  vi.mocked(authedUserId).mockResolvedValue('viewer');
  redirectMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FollowingFeed', () => {
  it('UnresolvedActor_RedirectsToRootWithoutReadingTheFeed', async () => {
    vi.mocked(authedUserId).mockResolvedValue(null);
    await expect(FollowingFeed()).rejects.toThrow('REDIRECT:/');
    expect(getFollowingFeedProfiles).not.toHaveBeenCalled();
  });

  it('ResolvedActor_ReadsThatViewersFeedIntoTheGrid', async () => {
    render(await FollowingFeed());
    expect(getFollowingFeedProfiles).toHaveBeenCalledWith('viewer');
    expect(screen.getByTestId('user-card-grid')).toHaveAttribute(
      'data-count',
      '1'
    );
  });

  it('AfterCallback_WritesLastSeenWithoutFiringTags', async () => {
    render(await FollowingFeed());
    expect(afterHolder.cb).toBeTypeOf('function');
    await afterHolder.cb!();

    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(dbMock.set).toHaveBeenCalledTimes(1);
    expect((dbMock.set.mock.calls[0] as unknown[])[0]).toHaveProperty(
      'last_seen_following_at'
    );
    expect(dbMock.where).toHaveBeenCalledTimes(1);
    // updateTag throws inside after() (render scope) and the feed read is
    // uncached, so the callback must not fire any tag (#305).
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('AfterCallback_SwallowsError', async () => {
    dbMock.where.mockRejectedValue(new Error('boom'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(await FollowingFeed());
    await expect(afterHolder.cb!()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
