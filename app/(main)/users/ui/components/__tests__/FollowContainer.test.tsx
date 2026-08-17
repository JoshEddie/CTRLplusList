import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasBlocked } from '@/lib/data/profile';
import { isFollowing, viewerHasAnyFollows } from '@/lib/data/user';
import FollowContainer from '../FollowContainer';

vi.mock('@/lib/data/profile', () => ({
  hasBlocked: vi.fn(),
}));
vi.mock('@/lib/data/user', () => ({
  isFollowing: vi.fn(),
  viewerHasAnyFollows: vi.fn(),
}));

vi.mock('../FollowControls', () => ({
  default: (props: {
    profileId: string;
    initialFollowing: boolean;
    requireDisclosure: boolean;
  }) => (
    <div
      data-testid="controls"
      data-profile={props.profileId}
      data-following={String(props.initialFollowing)}
      data-require={String(props.requireDisclosure)}
    />
  ),
}));

const PROPS = {
  ownerProfileId: 'owner-profile',
  ownerName: 'Owner',
  viewerUserId: 'viewer',
  viewerProfileId: 'viewer-profile',
};

beforeEach(() => {
  vi.mocked(isFollowing).mockResolvedValue(false);
  vi.mocked(hasBlocked).mockResolvedValue(false);
  vi.mocked(viewerHasAnyFollows).mockResolvedValue(true);
});

describe('FollowContainer', () => {
  it('BlockedByOwner_ReturnsNull', async () => {
    vi.mocked(hasBlocked).mockImplementation(
      async ({ blockerProfileId, blockedProfileId }) =>
        blockerProfileId === 'owner-profile' &&
        blockedProfileId === 'viewer-profile'
    );
    render(await FollowContainer(PROPS));
    expect(screen.queryByTestId('controls')).not.toBeInTheDocument();
  });

  it('BlockedByViewer_ReturnsNull', async () => {
    vi.mocked(hasBlocked).mockImplementation(
      async ({ blockerProfileId, blockedProfileId }) =>
        blockerProfileId === 'viewer-profile' &&
        blockedProfileId === 'owner-profile'
    );
    render(await FollowContainer(PROPS));
    expect(screen.queryByTestId('controls')).not.toBeInTheDocument();
  });

  it('NotBlocked_PassesOwnerProfileIdAndIsFollowingToControls', async () => {
    vi.mocked(isFollowing).mockResolvedValue(true);
    render(await FollowContainer(PROPS));
    const controls = screen.getByTestId('controls');
    expect(controls).toHaveAttribute('data-profile', 'owner-profile');
    expect(controls).toHaveAttribute('data-following', 'true');
  });

  it('ViewerHasNoFollows_RequireDisclosureTrue', async () => {
    vi.mocked(viewerHasAnyFollows).mockResolvedValue(false);
    render(await FollowContainer(PROPS));
    expect(screen.getByTestId('controls')).toHaveAttribute(
      'data-require',
      'true'
    );
  });

  it('ViewerHasFollows_RequireDisclosureFalse', async () => {
    vi.mocked(viewerHasAnyFollows).mockResolvedValue(true);
    render(await FollowContainer(PROPS));
    expect(screen.getByTestId('controls')).toHaveAttribute(
      'data-require',
      'false'
    );
  });
});
