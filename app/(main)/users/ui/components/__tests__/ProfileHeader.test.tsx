/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The avatar art carries `alt=""` (no `img` role), and the disc initials,
 * profile-stats, and profile-actions wrapper carry only classes with no role or
 * accessible name. Classed `container.querySelector` is the only path to assert
 * the art, initials fallback, list-count text, and empty actions.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileHeader from '../ProfileHeader';
import type { UserIdentity } from '@/lib/types';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';

vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));
vi.mock('../FollowContainer', () => ({
  default: () => <div data-testid="follow-container" />,
}));

const profile = {
  ...makeProfile('p1', 'Alice Bob'),
  art: null as string | null,
};

function renderHeader(
  overrides: Partial<{
    profile: typeof profile;
    publicListCount: number;
    viewer: UserIdentity | null;
    showFollowButton: boolean;
  }> = {}
) {
  return render(
    <ProfileHeader
      profile={overrides.profile ?? profile}
      publicListCount={overrides.publicListCount ?? 0}
      viewer={overrides.viewer ?? null}
      showFollowButton={overrides.showFollowButton ?? false}
    />
  );
}

describe('ProfileHeader', () => {
  it('HasArt_RendersTheProfilesOwnArt', () => {
    const { container } = renderHeader({
      profile: { ...profile, art: 'data:image/svg+xml,<svg/>', avatarStyle: 'avataaars' },
    });
    expect(container.querySelector('.altvatar-disc-art')).toHaveAttribute(
      'src',
      'data:image/svg+xml,<svg/>'
    );
    expect(container.querySelector('.altvatar-disc-initials')).toBeNull();
  });

  it('NoArt_RendersInitialsFromInitialsOf', () => {
    const { container } = renderHeader();
    expect(
      container.querySelector('.altvatar-disc-initials')
    ).toHaveTextContent('AB');
  });

  it('Name_RendersName', () => {
    renderHeader();
    expect(screen.getByRole('heading')).toHaveTextContent('Alice Bob');
  });

  it('OneList_Singular', () => {
    const { container } = renderHeader({ publicListCount: 1 });
    expect(container.querySelector('.profile-stats')).toHaveTextContent(
      '1 shared list'
    );
    expect(container.querySelector('.profile-stats')).not.toHaveTextContent(
      '1 shared lists'
    );
  });

  it('ZeroOrManyLists_Plural', () => {
    const { container: zero } = renderHeader({ publicListCount: 0 });
    expect(zero.querySelector('.profile-stats')).toHaveTextContent(
      '0 shared lists'
    );
    const { container: many } = renderHeader({ publicListCount: 3 });
    expect(many.querySelector('.profile-stats')).toHaveTextContent(
      '3 shared lists'
    );
  });

  it('OwnProfile_RendersManageConnectionsLink', () => {
    renderHeader({ viewer: makeIdentity('u1', makeProfile('p1')) });
    expect(
      screen.getByRole('link', { name: 'Manage connections' })
    ).toHaveAttribute('href', '/settings/connections');
  });

  it('SelfProfileWhileActingAsAnother_StillRendersManageConnectionsLink', () => {
    renderHeader({
      viewer: makeIdentity('u1', makeProfile('p1'), makeProfile('managed')),
      showFollowButton: true,
    });
    expect(
      screen.getByRole('link', { name: 'Manage connections' })
    ).toHaveAttribute('href', '/settings/connections');
    expect(screen.queryByTestId('follow-container')).not.toBeInTheDocument();
  });

  it('ActiveProfileWhileSelfIsAnother_RendersManageConnectionsLink', () => {
    renderHeader({
      viewer: makeIdentity('u1', makeProfile('self-u1'), makeProfile('p1')),
    });
    expect(
      screen.getByRole('link', { name: 'Manage connections' })
    ).toHaveAttribute('href', '/settings/connections');
  });

  it('NonOwnerShowFollowWithViewer_RendersFollowContainer', () => {
    renderHeader({
      viewer: makeIdentity('viewer', makeProfile('self-viewer')),
      showFollowButton: true,
    });
    expect(screen.getByTestId('follow-container')).toBeInTheDocument();
  });

  it('NoFollowConditions_RendersNothingInActions', () => {
    const { container } = renderHeader({
      viewer: makeIdentity('viewer', makeProfile('self-viewer')),
      showFollowButton: false,
    });
    const actions = container.querySelector('.profile-actions') as HTMLElement;
    expect(actions).toBeEmptyDOMElement();
  });
});
