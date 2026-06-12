import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getFollowersOfUser, getUserIdByEmail } from '@/lib/data/user';
import FollowersSection from '../FollowersSection';
import { makeSession, makeViewer, redirectMock } from './test-helpers';

// See FollowingSection.test.tsx — the real ConnectionsAction needs a
// constructible (never-queried) @/db, hence the dummy DATABASE_URL.
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://u:p@localhost/db';
});

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/user', () => ({
  getFollowersOfUser: vi.fn(),
  getUserIdByEmail: vi.fn(),
}));
vi.mock('next/navigation', async () => ({
  redirect: (await import('./test-helpers')).redirectMock,
  useRouter: () => ({ refresh: () => {} }),
}));
vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

const FOLLOWERS = [
  {
    follower_id: 'ua',
    follower: { id: 'ua', name: 'Alice', image: null },
    created_at: new Date(2026, 4, 19),
  },
  {
    follower_id: 'ub',
    follower: { id: 'ub', name: null, image: null },
    created_at: new Date(2026, 4, 20),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(makeSession() as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue(makeViewer() as never);
  vi.mocked(getFollowersOfUser).mockResolvedValue(FOLLOWERS as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FollowersSection', () => {
  describe('Guards', () => {
    it('NoSession_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);
      await expect(FollowersSection()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getFollowersOfUser).not.toHaveBeenCalled();
    });

    it('EmailResolvesToNoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null);
      await expect(FollowersSection()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getFollowersOfUser).not.toHaveBeenCalled();
    });
  });

  describe('Rendered', () => {
    it('TwoFollowers_RendersHeadingCount-LinkedRows-RemoveAndBlockActions', async () => {
      render(await FollowersSection());

      expect(getFollowersOfUser).toHaveBeenCalledWith('viewer');
      expect(
        screen.getByRole('heading', { name: 'Followers (2)' })
      ).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);

      expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute(
        'href',
        '/user/ua'
      );
      expect(screen.getByRole('link', { name: 'Unnamed' })).toHaveAttribute(
        'href',
        '/user/ub'
      );

      expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Block' })).toHaveLength(2);
    });

    it('NoFollowers_RendersZeroHeading-EmptyMessage', async () => {
      vi.mocked(getFollowersOfUser).mockResolvedValue([] as never);
      render(await FollowersSection());

      expect(
        screen.getByRole('heading', { name: 'Followers (0)' })
      ).toBeInTheDocument();
      expect(screen.getByText('No followers yet.')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
