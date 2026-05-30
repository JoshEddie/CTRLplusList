import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isBlocked, isFollowing, viewerHasAnyFollows } from '@/lib/dal';
import FollowContainer from '../FollowContainer';

vi.mock('@/lib/dal', () => ({
  isFollowing: vi.fn(),
  isBlocked: vi.fn(),
  viewerHasAnyFollows: vi.fn(),
}));

vi.mock('../FollowControls', () => ({
  default: (props: {
    userId: string;
    initialFollowing: boolean;
    requireDisclosure: boolean;
  }) => (
    <div
      data-testid="controls"
      data-user={props.userId}
      data-following={String(props.initialFollowing)}
      data-require={String(props.requireDisclosure)}
    />
  ),
}));

const PROPS = { ownerId: 'owner', ownerName: 'Owner', viewerId: 'viewer' };

beforeEach(() => {
  vi.mocked(isFollowing).mockResolvedValue(false);
  vi.mocked(isBlocked).mockResolvedValue(false);
  vi.mocked(viewerHasAnyFollows).mockResolvedValue(true);
});

describe('FollowContainer', () => {
  it('BlockedByOwner_ReturnsNull', async () => {
    vi.mocked(isBlocked).mockImplementation(
      async (blocker, blocked) => blocker === 'owner' && blocked === 'viewer'
    );
    render(await FollowContainer(PROPS));
    expect(screen.queryByTestId('controls')).not.toBeInTheDocument();
  });

  it('BlockedByViewer_ReturnsNull', async () => {
    vi.mocked(isBlocked).mockImplementation(
      async (blocker, blocked) => blocker === 'viewer' && blocked === 'owner'
    );
    render(await FollowContainer(PROPS));
    expect(screen.queryByTestId('controls')).not.toBeInTheDocument();
  });

  it('NotBlocked_PassesOwnerIdAndIsFollowingToControls', async () => {
    vi.mocked(isFollowing).mockResolvedValue(true);
    render(await FollowContainer(PROPS));
    const controls = screen.getByTestId('controls');
    expect(controls).toHaveAttribute('data-user', 'owner');
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
