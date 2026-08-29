import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFollowersOfProfile } from '@/lib/data/profile';
import { authedIdentity } from '@/lib/data/user.session';
import FollowersSection from '../FollowersSection';
import { redirectMock } from './test-helpers';
import { makeProfile } from '@/test/helpers/profile';

vi.mock('@/lib/data/profile', () => ({ getFollowersOfProfile: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));
vi.mock('next/navigation', async () => ({
  redirect: (await import('./test-helpers')).redirectMock,
  useRouter: () => ({ refresh: () => {} }),
}));
vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

// The row threads two id kinds through one component — Remove takes an account
// id, Block a profile id — and neither reaches the DOM through the real
// button. Surfacing both here is what fails if they are ever swapped.
vi.mock('../ConnectionsActions', () => ({
  default: ({ action, targetId }: { action: string; targetId: string }) => (
    <button type="button" data-target-id={targetId}>
      {action}
    </button>
  ),
}));

const FOLLOWERS = [
  {
    follower_id: 'ua',
    followee_profile_id: 'self-viewer',
    follower: { id: 'ua', profile_id: 'self-ua', name: 'Alice', image: null },
    created_at: new Date(2026, 4, 19),
  },
  {
    follower_id: 'ub',
    followee_profile_id: 'self-viewer',
    follower: { id: 'ub', profile_id: 'self-ub', name: null, image: null },
    created_at: new Date(2026, 4, 20),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedIdentity).mockResolvedValue({
    userId: 'viewer',
    selfProfile: makeProfile('self-viewer', 'Viewer'),
    activeProfile: makeProfile('self-viewer', 'Viewer'),
  });
  vi.mocked(getFollowersOfProfile).mockResolvedValue(FOLLOWERS as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FollowersSection', () => {
  describe('Guards', () => {
    it('UnresolvableIdentity_RedirectsToRoot', async () => {
      vi.mocked(authedIdentity).mockResolvedValue(null);
      await expect(FollowersSection()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getFollowersOfProfile).not.toHaveBeenCalled();
    });
  });

  describe('Rendered', () => {
    it('TwoFollowers_RendersHeadingCount-LinkedRows-RemoveAndBlockActions', async () => {
      render(await FollowersSection());

      expect(getFollowersOfProfile).toHaveBeenCalledWith('self-viewer');
      expect(
        screen.getByRole('heading', { name: 'Followers (2)' })
      ).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);

      expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute(
        'href',
        '/altvatar/self-ua'
      );
      expect(screen.getByRole('link', { name: 'Unnamed' })).toHaveAttribute(
        'href',
        '/altvatar/self-ub'
      );

      expect(screen.getAllByRole('button', { name: 'remove' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'block' })).toHaveLength(2);
    });

    it('FollowerRow_RemoveTargetsAccountId-BlockTargetsProfileId', async () => {
      render(await FollowersSection());

      const [aliceRow] = screen.getAllByRole('listitem');
      const alice = within(aliceRow);
      expect(alice.getByRole('button', { name: 'remove' })).toHaveAttribute(
        'data-target-id',
        'ua'
      );
      expect(alice.getByRole('button', { name: 'block' })).toHaveAttribute(
        'data-target-id',
        'self-ua'
      );
    });

    it('ActingAsAManagedProfile_StillReadsTheSelfProfile', async () => {
      vi.mocked(authedIdentity).mockResolvedValue({
        userId: 'viewer',
        selfProfile: makeProfile('self-viewer', 'Viewer'),
        activeProfile: makeProfile('kiddo', 'Kiddo'),
      });

      render(await FollowersSection());

      expect(getFollowersOfProfile).toHaveBeenCalledWith('self-viewer');
      expect(getFollowersOfProfile).not.toHaveBeenCalledWith('kiddo');
    });

    it('NoFollowers_RendersZeroHeading-EmptyMessage', async () => {
      vi.mocked(getFollowersOfProfile).mockResolvedValue([] as never);
      render(await FollowersSection());

      expect(
        screen.getByRole('heading', { name: 'Followers (0)' })
      ).toBeInTheDocument();
      expect(screen.getByText('No followers yet.')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
