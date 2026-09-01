/**
 * Pins `profile-permissions` — "A profile SHALL admit a member only by
 * single-use invite link", from the page's side: it states what the link grants
 * and redeems nothing on load, and a spent, expired or unknown token is
 * indistinguishable from one that never existed.
 */
import { ROLES } from '@/lib/data/profile.roles';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { writableMembership } from '@/lib/data/profile.gate';
import { getLiveInvite, getSpoilerDefault } from '@/lib/data/profile.members';
import { PROTECTED_TIER } from '@/lib/spoilers';
import { authedUserId } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import InvitePage from '../InvitePage';

vi.mock('@/lib/data/profile.members', () => ({
  getLiveInvite: vi.fn(),
  getSpoilerDefault: vi.fn(),
}));
vi.mock('@/lib/data/profile.gate', () => ({ writableMembership: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedUserId: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('../InviteCard', () => ({
  default: ({
    token,
    signedIn,
    offeredBaseline,
  }: {
    token: string;
    signedIn: boolean;
    offeredBaseline: string;
  }) => (
    <div
      data-testid="card"
      data-token={token}
      data-signed-in={String(signedIn)}
      data-offered={offeredBaseline}
    />
  ),
}));

const invite = {
  id: 'kiddo',
  name: 'Kiddo',
  tagline: null,
  role: 'manager',
  accent: null,
  art: null,
  avatarStyle: null,
};

const renderPage = async (token = 'tok-1') =>
  render(await InvitePage({ params: Promise.resolve({ token }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getLiveInvite).mockResolvedValue(invite as never);
  vi.mocked(getSpoilerDefault).mockResolvedValue(PROTECTED_TIER);
  vi.mocked(authedUserId).mockResolvedValue('recipient');
  vi.mocked(writableMembership).mockResolvedValue(null);
});

describe('InvitePage', () => {
  it('LiveTokenSignedInNonMember_HandsTheTokenToTheCardAsSignedIn', async () => {
    await renderPage('tok-1');

    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('data-token', 'tok-1');
    expect(card).toHaveAttribute('data-signed-in', 'true');
  });

  it('LiveToken_OffersTheProfilesSpoilerDefaultReadAtOpen', async () => {
    vi.mocked(getSpoilerDefault).mockResolvedValue('identity');

    await renderPage();

    expect(getSpoilerDefault).toHaveBeenCalledWith('kiddo');
    expect(screen.getByTestId('card')).toHaveAttribute('data-offered', 'identity');
  });

  it('NoLiveInvite_RefusesWithoutSayingWhichConditionApplied', async () => {
    vi.mocked(getLiveInvite).mockResolvedValue(null);

    await renderPage();

    expect(
      screen.getByRole('heading', { name: 'This invite link is no longer valid' })
    ).toBeInTheDocument();
    // Nothing distinguishes unknown from expired from spent, and no membership
    // is ever looked up for a token that did not resolve.
    expect(screen.queryByTestId('card')).toBeNull();
    expect(writableMembership).not.toHaveBeenCalled();
  });

  it('SignedInMember_RedirectsToTheProfileWithoutRenderingAnything', async () => {
    vi.mocked(writableMembership).mockResolvedValue({
      name: 'Kiddo',
      role: ROLES.owner,
      last_active_at: null,
    });

    // A member has nothing to accept: the page says nothing and takes them
    // there. The link is untouched, because loading never redeems.
    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/altvatar/kiddo');
  });

  it('SignedOutVisitor_HandsTheCardASignedOutStateWithoutResolvingAMembership', async () => {
    vi.mocked(authedUserId).mockResolvedValue(null);

    await renderPage();

    expect(screen.getByTestId('card')).toHaveAttribute(
      'data-signed-in',
      'false'
    );
    expect(writableMembership).not.toHaveBeenCalled();
  });
});
