/**
 * Pins `profile-permissions` — the invite surface names the profile it admits
 * to and the role it grants, and redemption is an explicit act rather than a
 * side effect of the page being open.
 */
import { PROTECTED_TIER } from '@/lib/spoilers';
import { ROLES } from '@/lib/data/profile.roles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redeemInvite } from '@/lib/data/profile.members.actions';
import InviteCard, {
  CLAIM_VISIBILITY_LABEL,
  type InviteView,
} from '../InviteCard';

vi.mock('@/lib/data/profile.members.actions', () => ({
  redeemInvite: vi.fn(),
}));
// `bind` records its arguments rather than throwing them away: the destination
// threaded into the form action is the whole point of the signed-out door, and
// a mock that swallowed it would ship a wrong path green.
const signInBind = vi.hoisted(() =>
  vi.fn((...args: unknown[]) => vi.fn(() => args))
);
vi.mock('@/lib/data/user.actions', () => ({
  signInUser: Object.assign(vi.fn(), {
    bind: (...args: unknown[]) => signInBind(...args),
  }),
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
  role: ROLES.manager,
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
      offeredBaseline={PROTECTED_TIER}
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
      renderCard({ role: ROLES.owner });

      expect(screen.getByText(/^as an owner —/)).toBeInTheDocument();
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

      expect(redeemInvite).toHaveBeenCalledWith('tok-1', PROTECTED_TIER);
      expect(toastSuccess).toHaveBeenCalledWith('You now run this profile');
      expect(push).toHaveBeenCalledWith('/altvatar/kiddo');
    });

    it('AdjustedTier_SubmitsTheAdjustedTierRatherThanTheOffered', async () => {
      vi.mocked(redeemInvite).mockResolvedValue({
        success: true,
        message: 'You now run this profile',
      });
      renderCard();

      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: CLAIM_VISIBILITY_LABEL }),
        'identity'
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Accept invite' })
      );

      expect(redeemInvite).toHaveBeenCalledWith('tok-1', 'identity');
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

    it('Render_BindsThisInvitesPathAsTheSignInDestination', () => {
      renderCard({}, false);

      expect(signInBind).toHaveBeenCalledWith(null, '/invite/tok-1');
    });
  });
});
