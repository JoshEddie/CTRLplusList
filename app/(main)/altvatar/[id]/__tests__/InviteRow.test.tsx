/**
 * Pins the Permissions roster's pending-invite row: a seat that has been
 * offered but not taken, carrying the link to copy, the role it grants, and
 * the withdrawal of both — in the row's two shapes, discrete controls from
 * 600px up and the kebab below it.
 */
import { ROLES } from '@/lib/data/profile.roles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PendingInvite } from '@/lib/data/profile.members';
import InviteRow from '../InviteRow';

const revokeInvite = vi.fn();
const setInviteRole = vi.fn();
vi.mock('@/lib/data/profile.members.actions', () => ({
  revokeInvite: (...args: unknown[]) => revokeInvite(...args),
  setInviteRole: (...args: unknown[]) => setInviteRole(...args),
}));
const toastPromise = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
    promise: (...args: unknown[]) => toastPromise(...args),
  },
}));
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const invite: PendingInvite = {
  token: 'tok-123',
  role: ROLES.manager,
  created_at: new Date(),
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

const writeText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText } });

const renderRow = (daysLeft = 7) =>
  render(
    <InviteRow profileId="kiddo" invite={invite} daysLeft={daysLeft} />
  );

const openMenu = () =>
  userEvent.click(screen.getByRole('button', { name: 'Invite link actions' }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InviteRow', () => {
  describe('DiscreteControls', () => {
    it('ChangeRoleThenOwner_CallsSetInviteRoleWithOwner', async () => {
      setInviteRole.mockResolvedValue({ success: true, message: 'ok' });
      renderRow();

      await userEvent.click(
        screen.getByRole('button', { name: 'Change role' })
      );
      await userEvent.click(
        screen.getByRole('menuitemradio', { name: 'Owner' })
      );

      expect(setInviteRole).toHaveBeenCalledWith('kiddo', 'tok-123', 'owner');
    });

    it('EscapeWithTheRoleMenuOpen_ClosesItWithoutChangingTheRole', async () => {
      renderRow();
      await userEvent.click(
        screen.getByRole('button', { name: 'Change role' })
      );
      expect(
        screen.getByRole('menu', { name: 'Invite link role' })
      ).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      expect(
        screen.queryByRole('menu', { name: 'Invite link role' })
      ).toBeNull();
      expect(setInviteRole).not.toHaveBeenCalled();
    });

    it('Revoke_OpensTheConfirmationRatherThanRevokingOutright', async () => {
      renderRow();

      await userEvent.click(
        screen.getByRole('button', { name: 'Revoke this invite link' })
      );

      expect(
        screen.getByText('Revoke this invite link?')
      ).toBeInTheDocument();
      expect(revokeInvite).not.toHaveBeenCalled();
    });
  });

  it('EscapeWithTheMenuOpen_ClosesItWithoutActing', async () => {
    renderRow();
    await openMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Render_StatesTheRoleAndThatNobodyHasAccepted', () => {
    renderRow();

    expect(screen.getByText('Invite link')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    // The expiry is stated forward, not as an age: the row exists only while
    // the link is still live.
    expect(screen.getByRole('listitem')).toHaveTextContent(
      /Managerexpires in 7 days/
    );
  });

  it('OneDayLeft_SaysDayInTheSingular', () => {
    renderRow(1);

    expect(screen.getByRole('listitem')).toHaveTextContent(/expires in 1 day/);
  });

  it('CopyLink_WritesTheInviteUrlToTheClipboard', async () => {
    renderRow();

    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/invite/tok-123`
    );
    expect(toastPromise).toHaveBeenCalled();
  });

  it('ChooseOwner_CallsSetInviteRole', async () => {
    setInviteRole.mockResolvedValue({
      success: true,
      message: 'Invite role updated',
    });
    renderRow();

    await openMenu();
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Owner' }));

    expect(setInviteRole).toHaveBeenCalledWith('kiddo', 'tok-123', 'owner');
    expect(toastSuccess).toHaveBeenCalledWith('Invite role updated');
    expect(refresh).toHaveBeenCalled();
  });

  it('RefusedRoleChange_ToastsTheRefusalWithoutRefreshing', async () => {
    setInviteRole.mockResolvedValue({
      success: false,
      message: 'This invite link is no longer valid',
    });
    renderRow();

    await openMenu();
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Owner' }));

    expect(toastError).toHaveBeenCalledWith(
      'This invite link is no longer valid'
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('ConfirmRevoke_CallsRevokeInvite', async () => {
    revokeInvite.mockResolvedValue({
      success: true,
      message: 'Invite link revoked',
    });
    renderRow();

    await openMenu();
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Revoke this invite link' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    expect(revokeInvite).toHaveBeenCalledWith('kiddo', 'tok-123');
  });

  it('DismissRevoke_RevokesNothing', async () => {
    renderRow();

    await openMenu();
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Revoke this invite link' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(revokeInvite).not.toHaveBeenCalled();
  });
});
