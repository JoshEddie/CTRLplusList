/**
 * Pins `profile-permissions` — the invite surface names the profile it admits
 * to and the role it grants, and redemption is an explicit act rather than a
 * side effect of the page being open.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redeemInvite } from '@/lib/data/profile.members.actions';
import InviteCard, { type InviteView } from '../InviteCard';

vi.mock('@/lib/data/profile.members.actions', () => ({
  redeemInvite: vi.fn(),
}));
vi.mock('@/lib/data/user.actions', () => ({
  signInUser: Object.assign(vi.fn(), { bind: () => vi.fn() }),
}));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

const invite: InviteView = {
  id: 'kiddo',
  name: 'Kiddo',
  tagline: null,
  role: 'manager',
  accent: null,
  art: null,
  avatarStyle: null,
};

const renderCard = (
  overrides: Partial<InviteView> = {},
  signedIn = true
) =>
  render(
    <InviteCard
      token="tok-1"
      invite={{ ...invite, ...overrides }}
      signedIn={signedIn}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InviteCard', () => {
  describe('WhatItStates', () => {
    it('ManagerToken_NamesTheProfileAndTheRoleItGrants', () => {
      renderCard();

      expect(
        screen.getByText('You’ve been invited to help run')
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Kiddo' })).toBeInTheDocument();
      expect(screen.getByText(/^as a manager —/)).toBeInTheDocument();
      // Open is not accepted: nothing is redeemed until the control is pressed.
      expect(redeemInvite).not.toHaveBeenCalled();
    });

    it('OwnerToken_StatesItGrantsOwnership', () => {
      renderCard({ role: 'owner' });

      expect(screen.getByText(/^as an owner —/)).toBeInTheDocument();
    });

    it('UnlabelledRole_FallsBackToTheStoredValue', () => {
      renderCard({ role: 'curator' });

      expect(screen.getByText('as curator.')).toBeInTheDocument();
    });

    it('ProfileWithATagline_ShowsItUnderTheName', () => {
      renderCard({ tagline: 'Turning eight in June' });

      expect(screen.getByText('Turning eight in June')).toBeInTheDocument();
    });
  });

  describe('SignedIn', () => {
    it('Accept_CallsRedeemInvite-ToastSuccess-RoutesToTheProfile', async () => {
      vi.mocked(redeemInvite).mockResolvedValue({
        success: true,
        message: 'You now run this profile',
      });
      renderCard();

      await userEvent.click(
        screen.getByRole('button', { name: 'Accept invite' })
      );

      expect(redeemInvite).toHaveBeenCalledWith('tok-1');
      expect(toastSuccess).toHaveBeenCalledWith('You now run this profile');
      expect(push).toHaveBeenCalledWith('/altvatar/kiddo');
    });

    it('Refused_ToastsTheRefusalAndStaysPut', async () => {
      vi.mocked(redeemInvite).mockResolvedValue({
        success: false,
        message: 'This invite link is no longer valid',
        error: 'Invalid invite',
      });
      renderCard();

      await userEvent.click(
        screen.getByRole('button', { name: 'Accept invite' })
      );

      expect(toastError).toHaveBeenCalledWith(
        'This invite link is no longer valid'
      );
      expect(push).not.toHaveBeenCalled();
    });

    it('Cancel_LeavesForHomeWithoutRedeeming', async () => {
      renderCard();

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(redeemInvite).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith('/');
    });
  });

  describe('SignedOut', () => {
    it('Render_OffersSignInInPlaceOfAcceptance', () => {
      renderCard({}, false);

      expect(
        screen.getByRole('button', { name: 'Sign in to accept' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Accept invite' })
      ).toBeNull();
    });
  });
});
