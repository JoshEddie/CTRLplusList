import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getUserIdentity } from '@/lib/data/profile';
import { getBlockedByProfile } from '@/lib/data/profile';
import { getUserIdByEmail } from '@/lib/data/user';
import BlockedSection from '../BlockedSection';
import { makeSession, makeViewer, redirectMock } from './test-helpers';
import { makeProfile } from '@/test/helpers/profile';

// See FollowingSection.test.tsx — the real ConnectionsAction needs a
// constructible (never-queried) @/db, hence the dummy DATABASE_URL.
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://u:p@localhost/db';
});

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/profile', () => ({
  getBlockedByProfile: vi.fn(),
  getUserIdentity: vi.fn(),
}));
vi.mock('@/lib/data/user', () => ({ getUserIdByEmail: vi.fn() }));
vi.mock('next/navigation', async () => ({
  redirect: (await import('./test-helpers')).redirectMock,
  useRouter: () => ({ refresh: () => {} }),
}));
vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

const BLOCKED = [
  {
    blocker_profile_id: 'self-viewer',
    blocked_profile_id: 'self-ba',
    blocked: { id: 'self-ba', name: 'Alice', image: null },
    created_at: new Date(2026, 4, 19),
  },
  {
    blocker_profile_id: 'self-viewer',
    blocked_profile_id: 'self-bb',
    blocked: { id: 'self-bb', name: null, image: null },
    created_at: new Date(2026, 4, 20),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(makeSession() as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue(makeViewer() as never);
  vi.mocked(getUserIdentity).mockResolvedValue({
    userId: 'viewer',
    profile: makeProfile('self-viewer', 'Viewer', 'viewer'),
  });
  vi.mocked(getBlockedByProfile).mockResolvedValue(BLOCKED as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BlockedSection', () => {
  describe('Guards', () => {
    it('NoSession_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);
      await expect(BlockedSection()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getBlockedByProfile).not.toHaveBeenCalled();
    });

    it('EmailResolvesToNoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null);
      await expect(BlockedSection()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getBlockedByProfile).not.toHaveBeenCalled();
    });
  });

  describe('Rendered', () => {
    it('TwoBlocked_RendersHeadingCount-LinkedRows-UnblockAction', async () => {
      render(await BlockedSection());

      expect(getBlockedByProfile).toHaveBeenCalledWith('self-viewer');
      expect(
        screen.getByRole('heading', { name: 'Blocked (2)' })
      ).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);

      expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute(
        'href',
        '/user/self-ba'
      );
      expect(screen.getByRole('link', { name: 'Unnamed' })).toHaveAttribute(
        'href',
        '/user/self-bb'
      );

      expect(screen.getAllByRole('button', { name: 'Unblock' })).toHaveLength(
        2
      );
    });

    it('NoBlocked_RendersZeroHeading-EmptyMessage', async () => {
      vi.mocked(getBlockedByProfile).mockResolvedValue([] as never);
      render(await BlockedSection());

      expect(
        screen.getByRole('heading', { name: 'Blocked (0)' })
      ).toBeInTheDocument();
      expect(screen.getByText('No blocked users.')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
