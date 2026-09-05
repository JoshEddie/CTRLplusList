/**
 * Pins `profile-permissions` — "An owner SHALL mint a link that names the
 * profile it admits to and the role it grants, chosen at mint time from `owner`
 * and `manager` and defaulting to `manager`" — and the disabled-not-absent
 * treatment a manager gets for it.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mintInvite } from '@/lib/data/profile.members.actions';
import InviteFlow from '../InviteFlow';

vi.mock('@/lib/data/profile.members.actions', () => ({ mintInvite: vi.fn() }));
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

const renderFlow = (viewerIsOwner = true) =>
  render(
    <InviteFlow
      profileId="kiddo"
      profileName="Kiddo"
      viewerIsOwner={viewerIsOwner}
    />
  );

const trigger = () => screen.getByRole('button', { name: /invite someone/i });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mintInvite).mockResolvedValue({
    success: true,
    message: 'Invite link ready',
    id: 'tok-1',
  });
});

describe('InviteFlow', () => {
  describe('OwnerViewer', () => {
    it('OpenTheShell_OffersManagerAsTheStandingChoice', async () => {
      renderFlow();

      await userEvent.click(trigger());

      expect(screen.getByLabelText('Role')).toHaveValue('manager');
    });

    it('SubmitUnchanged_MintsAManagerLink-ToastSuccess-RouterRefresh', async () => {
      renderFlow();
      await userEvent.click(trigger());

      await userEvent.click(screen.getByRole('button', { name: 'Create link' }));

      expect(mintInvite).toHaveBeenCalledWith('kiddo', 'manager');
      expect(toastSuccess).toHaveBeenCalledWith(
        'Invite link added to Permissions'
      );
      expect(refresh).toHaveBeenCalled();
      // The link is not shown here: it lands in the roster as a pending row.
      expect(screen.queryByLabelText('Role')).toBeNull();
    });

    it('ChooseOwner_MintsAnOwnerLink', async () => {
      renderFlow();
      await userEvent.click(trigger());

      await userEvent.selectOptions(screen.getByLabelText('Role'), 'owner');
      await userEvent.click(screen.getByRole('button', { name: 'Create link' }));

      expect(mintInvite).toHaveBeenCalledWith('kiddo', 'owner');
    });

    it('MintRefused_ToastsTheRefusalAndLeavesTheShellOpen', async () => {
      vi.mocked(mintInvite).mockResolvedValue({
        success: false,
        message: 'Forbidden',
        error: 'Forbidden',
      });
      renderFlow();
      await userEvent.click(trigger());

      await userEvent.click(screen.getByRole('button', { name: 'Create link' }));

      expect(toastError).toHaveBeenCalledWith('Forbidden');
      expect(refresh).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Role')).toBeInTheDocument();
    });

    it('Cancel_ClosesTheShellAndMintsNothing', async () => {
      renderFlow();
      await userEvent.click(trigger());

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByLabelText('Role')).toBeNull();
      expect(mintInvite).not.toHaveBeenCalled();
    });
  });

  describe('ManagerViewer', () => {
    it('Trigger_RendersDisabled-OpensNothingOnClick', async () => {
      renderFlow(false);

      // Present, not omitted: the surface states that minting exists and that
      // this viewer does not hold it.
      expect(trigger()).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(trigger());
      expect(screen.queryByLabelText('Role')).toBeNull();
      expect(mintInvite).not.toHaveBeenCalled();
    });
  });
});
