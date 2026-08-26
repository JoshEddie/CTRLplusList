/**
 * Pins `profiles-surface` — "The Profiles page SHALL list every profile the
 * viewer runs" and "The Profiles page SHALL state what selecting a profile
 * does".
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProfileCardsForUser } from '@/lib/data/profile';
import { authedIdentity } from '@/lib/data/user.session';
import type { ProfileCardView } from '@/lib/types';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import ProfilesPage from '../ProfilesPage';

vi.mock('@/lib/data/profile', () => ({ getProfileCardsForUser: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));
vi.mock('../ui/components/NewProfileButton', () => ({
  default: () => <button type="button">New Profile</button>,
}));
vi.mock('../ui/components/ProfileCard', () => ({
  default: ({ profile }: { profile: ProfileCardView }) => (
    <div data-testid="profile-card">{profile.name}</div>
  ),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

function card(id: string, name: string): ProfileCardView {
  return {
    id,
    name,
    tagline: null,
    role: 'owner',
    listCount: 0,
    itemCount: 0,
    accent: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedIdentity).mockResolvedValue(
    makeIdentity('viewer', makeProfile('p1', 'Test Viewer'))
  );
  vi.mocked(getProfileCardsForUser).mockResolvedValue([]);
});

describe('ProfilesPage', () => {
  it('NoSession_RedirectsToRoot', async () => {
    vi.mocked(authedIdentity).mockResolvedValue(null);
    await expect(ProfilesPage()).rejects.toThrow('REDIRECT:/');
    expect(getProfileCardsForUser).not.toHaveBeenCalled();
  });

  it('AuthedViewer_RendersOneCardPerReadRowInReadOrder', async () => {
    vi.mocked(getProfileCardsForUser).mockResolvedValue([
      card('p1', 'Test Viewer'),
      card('p2', 'Ada'),
    ]);
    render(await ProfilesPage());

    expect(getProfileCardsForUser).toHaveBeenCalledWith('viewer');
    expect(
      screen.getAllByTestId('profile-card').map((n) => n.textContent)
    ).toEqual(['Test Viewer', 'Ada']);
  });

  it('AuthedViewer_RendersHeaderWithNewProfileControl', async () => {
    render(await ProfilesPage());
    expect(screen.getByText('Profiles')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New Profile' })
    ).toBeInTheDocument();
  });

  it('AuthedViewer_RendersTheLede', async () => {
    render(await ProfilesPage());
    expect(
      screen.getByText(/everything you create belongs to it/i)
    ).toBeInTheDocument();
  });

  it('SingleSelfCard_RendersNoEmptyState', async () => {
    vi.mocked(getProfileCardsForUser).mockResolvedValue([
      card('p1', 'Test Viewer'),
    ]);
    render(await ProfilesPage());
    expect(screen.getAllByTestId('profile-card')).toHaveLength(1);
    expect(screen.queryByText(/no profiles found/i)).not.toBeInTheDocument();
  });
});
