import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getBlockedByUser, getUserIdByEmail } from '@/lib/dal';
import BlockedSection from '../BlockedSection';
import { makeSession, makeViewer, redirectMock } from './test-helpers';

// See FollowingSection.test.tsx — the real ConnectionsAction needs a
// constructible (never-queried) @/db, hence the dummy DATABASE_URL.
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://u:p@localhost/db';
});

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({
  getBlockedByUser: vi.fn(),
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

const BLOCKED = [
  {
    blocked_id: 'ba',
    blocked: { id: 'ba', name: 'Alice', image: null },
    created_at: new Date(2026, 4, 19),
  },
  {
    blocked_id: 'bb',
    blocked: { id: 'bb', name: null, image: null },
    created_at: new Date(2026, 4, 20),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(makeSession() as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue(makeViewer() as never);
  vi.mocked(getBlockedByUser).mockResolvedValue(BLOCKED as never);
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
      expect(getBlockedByUser).not.toHaveBeenCalled();
    });

    it('EmailResolvesToNoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null);
      await expect(BlockedSection()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getBlockedByUser).not.toHaveBeenCalled();
    });
  });

  describe('Rendered', () => {
    it('TwoBlocked_RendersHeadingCount-LinkedRows-UnblockAction', async () => {
      render(await BlockedSection());

      expect(getBlockedByUser).toHaveBeenCalledWith('viewer');
      expect(
        screen.getByRole('heading', { name: 'Blocked (2)' })
      ).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);

      expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute(
        'href',
        '/user/ba'
      );
      expect(screen.getByRole('link', { name: 'Unnamed' })).toHaveAttribute(
        'href',
        '/user/bb'
      );

      expect(screen.getAllByRole('button', { name: 'Unblock' })).toHaveLength(
        2
      );
    });

    it('NoBlocked_RendersZeroHeading-EmptyMessage', async () => {
      vi.mocked(getBlockedByUser).mockResolvedValue([] as never);
      render(await BlockedSection());

      expect(
        screen.getByRole('heading', { name: 'Blocked (0)' })
      ).toBeInTheDocument();
      expect(screen.getByText('No blocked users.')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
