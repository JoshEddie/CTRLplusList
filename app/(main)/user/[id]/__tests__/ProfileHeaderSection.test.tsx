import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getUserIdentity } from '@/lib/data/profile';
import { getProfileForViewer } from '@/lib/data/profile';
import { getUserIdByEmail } from '@/lib/data/user';
import ProfileHeaderSection from '../ProfileHeaderSection';
import type { UserIdentity } from '@/lib/types';
import { makeProfile as makeProfileRow } from '@/test/helpers/profile';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/profile', () => ({
  getProfileForViewer: vi.fn(),
  getUserIdentity: vi.fn(),
}));
vi.mock('@/lib/data/user', () => ({ getUserIdByEmail: vi.fn() }));

const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NOTFOUND');
  })
);
vi.mock('next/navigation', () => ({ notFound: notFoundMock }));

vi.mock('@/app/(main)/users/ui/components/ProfileHeader', () => ({
  default: (props: {
    profile: { id: string; name: string | null; image: string | null };
    publicListCount: number;
    viewer: UserIdentity | null;
    showFollowButton: boolean;
  }) => (
    <div
      data-testid="profile-header"
      data-profile-id={props.profile.id}
      data-name={props.profile.name ?? ''}
      data-image={props.profile.image ?? ''}
      data-public-list-count={String(props.publicListCount)}
      data-viewer-profile-id={props.viewer?.profile.id ?? ''}
      data-show-follow-button={String(props.showFollowButton)}
    />
  ),
}));
vi.mock('@/app/(main)/users/ui/components/FollowPrompt', () => ({
  default: ({ name }: { name: string | null }) => (
    <div data-testid="follow-prompt" data-name={name ?? ''} />
  ),
}));

const IDENTITY = {
  userId: 'viewer',
  profile: makeProfileRow('self-viewer', 'Viewer'),
};

function makeProfile(
  overrides: Partial<{
    id: string;
    name: string | null;
    image: string | null;
    publicListCount: number;
    viewerIsFollowing: boolean;
    viewerIsBlocked: boolean;
    blockedByViewer: boolean;
  }> = {}
) {
  return {
    id: 'target',
    name: 'Target User',
    image: null,
    publicListCount: 3,
    viewerIsFollowing: false,
    viewerIsBlocked: false,
    blockedByViewer: false,
    ...overrides,
  };
}

function props(overrides: { id?: string; sp?: Record<string, string> } = {}) {
  return {
    params: Promise.resolve({ id: overrides.id ?? 'target' }),
    searchParams: Promise.resolve(overrides.sp ?? {}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'viewer' } as never);
  vi.mocked(getUserIdentity).mockResolvedValue(IDENTITY);
  vi.mocked(getProfileForViewer).mockResolvedValue(makeProfile() as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProfileHeaderSection', () => {
  describe('NotFound', () => {
    it('UnknownProfile_ThrowsNotFound', async () => {
      vi.mocked(getProfileForViewer).mockResolvedValue(null);
      await expect(ProfileHeaderSection(props())).rejects.toThrow('NOTFOUND');
      expect(notFoundMock).toHaveBeenCalledTimes(1);
    });

    it('ViewerIsBlocked_ThrowsSameNotFoundAsUnknownUser', async () => {
      // The cover-story: a blocked viewer gets the identical not-found outcome
      // a non-existent user does, so the account's existence isn't disclosed.
      vi.mocked(getProfileForViewer).mockResolvedValue(
        makeProfile({ viewerIsBlocked: true }) as never
      );
      await expect(ProfileHeaderSection(props())).rejects.toThrow('NOTFOUND');
      expect(notFoundMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('FollowPrompt', () => {
    it('ReachableNonFollowerWithFollowParam_RendersPromptWithName', async () => {
      render(await ProfileHeaderSection(props({ sp: { follow: '1' } })));
      expect(screen.getByTestId('follow-prompt')).toHaveAttribute(
        'data-name',
        'Target User'
      );
      expect(screen.getByTestId('profile-header')).toHaveAttribute(
        'data-show-follow-button',
        'true'
      );
    });

    it('FollowParamAbsent_RendersNoPrompt', async () => {
      render(await ProfileHeaderSection(props()));
      expect(screen.queryByTestId('follow-prompt')).not.toBeInTheDocument();
    });

    it('AlreadyFollowing_RendersNoPrompt', async () => {
      vi.mocked(getProfileForViewer).mockResolvedValue(
        makeProfile({ viewerIsFollowing: true }) as never
      );
      render(await ProfileHeaderSection(props({ sp: { follow: '1' } })));
      expect(screen.queryByTestId('follow-prompt')).not.toBeInTheDocument();
    });

    it('SelfProfile_RendersNoPrompt-ShowFollowButtonFalse', async () => {
      vi.mocked(getUserIdentity).mockResolvedValue({
        userId: 'viewer',
        profile: makeProfileRow('target', 'Viewer'),
      });
      render(await ProfileHeaderSection(props({ sp: { follow: '1' } })));
      expect(screen.queryByTestId('follow-prompt')).not.toBeInTheDocument();
      expect(screen.getByTestId('profile-header')).toHaveAttribute(
        'data-show-follow-button',
        'false'
      );
    });

    it('BlockedByViewer_RendersNoPrompt-ShowFollowButtonFalse', async () => {
      vi.mocked(getProfileForViewer).mockResolvedValue(
        makeProfile({ blockedByViewer: true }) as never
      );
      render(await ProfileHeaderSection(props({ sp: { follow: '1' } })));
      expect(screen.queryByTestId('follow-prompt')).not.toBeInTheDocument();
      expect(screen.getByTestId('profile-header')).toHaveAttribute(
        'data-show-follow-button',
        'false'
      );
    });
  });

  describe('ProfileHeaderProps', () => {
    it('Reachable_ForwardsProfilePublicListCountViewer-ReadsProfileWithIdentity', async () => {
      render(await ProfileHeaderSection(props({ sp: { follow: '1' } })));
      expect(getProfileForViewer).toHaveBeenCalledWith('target', IDENTITY);
      const header = screen.getByTestId('profile-header');
      expect(header).toHaveAttribute('data-profile-id', 'target');
      expect(header).toHaveAttribute('data-name', 'Target User');
      expect(header).toHaveAttribute('data-public-list-count', '3');
      expect(header).toHaveAttribute('data-viewer-profile-id', 'self-viewer');
    });

    it('NoSession_ViewerNull-SkipsUserLookup-ShowFollowButtonFalse', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);
      render(await ProfileHeaderSection(props()));
      expect(getUserIdByEmail).not.toHaveBeenCalled();
      expect(getUserIdentity).not.toHaveBeenCalled();
      expect(getProfileForViewer).toHaveBeenCalledWith('target', null);
      const header = screen.getByTestId('profile-header');
      expect(header).toHaveAttribute('data-viewer-profile-id', '');
      expect(header).toHaveAttribute('data-show-follow-button', 'false');
    });
  });
});
