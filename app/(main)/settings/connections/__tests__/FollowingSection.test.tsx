import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getFollowingByUser, getUserIdByEmail } from '@/lib/data/user';
import FollowingSection from '../FollowingSection';
import { makeSession, makeViewer, redirectMock } from './test-helpers';

// The real ConnectionsAction (rendered through, per spec) imports the real
// follows action → @/db, which constructs a neon client from DATABASE_URL at
// import. Set a dummy URL so the lazy HTTP client builds; no query ever runs
// (the reads are mocked and the action buttons are never clicked here).
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://u:p@localhost/db';
});

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/user', () => ({
  getFollowingByUser: vi.fn(),
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

const FOLLOWING = [
  {
    followee_id: 'fa',
    followee: { id: 'fa', name: 'Alice', image: null },
    created_at: new Date(2026, 4, 19),
  },
  {
    followee_id: 'fb',
    followee: { id: 'fb', name: null, image: null },
    created_at: new Date(2026, 4, 20),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(makeSession() as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue(makeViewer() as never);
  vi.mocked(getFollowingByUser).mockResolvedValue(FOLLOWING as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FollowingSection', () => {
  describe('Guards', () => {
    it('NoSession_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);
      await expect(FollowingSection()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getFollowingByUser).not.toHaveBeenCalled();
    });

    it('EmailResolvesToNoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null);
      await expect(FollowingSection()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getFollowingByUser).not.toHaveBeenCalled();
    });
  });

  describe('Rendered', () => {
    it('TwoFollowees_RendersHeadingCount-LinkedRows-SinceDate-UnfollowAction', async () => {
      render(await FollowingSection());

      expect(getFollowingByUser).toHaveBeenCalledWith('viewer');
      expect(
        screen.getByRole('heading', { name: 'Following (2)' })
      ).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);

      const alice = screen.getByRole('link', { name: 'Alice' });
      expect(alice).toHaveAttribute('href', '/user/fa');
      const unnamed = screen.getByRole('link', { name: 'Unnamed' });
      expect(unnamed).toHaveAttribute('href', '/user/fb');

      expect(screen.getByText('May 19, 2026')).toBeInTheDocument();

      const unfollow = screen.getAllByRole('button', { name: 'Unfollow' });
      expect(unfollow).toHaveLength(2);
    });

    it('NoFollowees_RendersZeroHeading-EmptyMessage', async () => {
      vi.mocked(getFollowingByUser).mockResolvedValue([] as never);
      render(await FollowingSection());

      expect(
        screen.getByRole('heading', { name: 'Following (0)' })
      ).toBeInTheDocument();
      expect(screen.getByText('Not following anyone yet.')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
