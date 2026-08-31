/**
 * Pins `profile-permissions` — "The profile's space SHALL render a Permissions
 * section for a managed profile", specifically the manager's view: every
 * owner-floor control renders disabled rather than absent, while their own
 * removal stays operable because every member holds it. The row carries the
 * same three acts in two shapes — discrete controls from 600px up, the kebab
 * below it — and both are pinned here; jsdom reports no viewport width, so
 * both are in the tree and each is addressed by its own accessible name.
 */
import { ROLES } from '@/lib/data/profile.roles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProfileMemberRow } from '@/lib/data/profile.members';
import MemberRow from '../MemberRow';

const removeMember = vi.fn();
const setMemberRole = vi.fn();
vi.mock('@/lib/data/profile.members.actions', () => ({
  removeMember: (...args: unknown[]) => removeMember(...args),
  setMemberRole: (...args: unknown[]) => setMemberRole(...args),
}));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const VIEWER = 'viewer-account';

function member(overrides: Partial<ProfileMemberRow> = {}): ProfileMemberRow {
  return {
    user_id: 'other-account',
    role: ROLES.manager,
    last_active_at: null,
    id: 'self-other-account',
    name: 'Alex',
    accent: null,
    art: null,
    avatarStyle: null,
    ...overrides,
  };
}

const renderRow = (props: {
  member?: ProfileMemberRow;
  viewerIsOwner: boolean;
  soleOwner?: boolean;
}) =>
  render(
    <MemberRow
      profileId="kiddo"
      member={props.member ?? member()}
      viewerUserId={VIEWER}
      viewerIsOwner={props.viewerIsOwner}
      soleOwner={props.soleOwner ?? false}
    />
  );

// Every control lives behind the row's kebab, so each test opens it first.
const openMenu = (name = 'Alex actions') =>
  userEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MemberRow', () => {
  describe('DiscreteControls', () => {
    it('OwnerViewer_OffersChangeRoleAndRemoveOnTheRow', async () => {
      renderRow({ viewerIsOwner: true });

      expect(
        screen.getByRole('button', { name: 'Change role' })
      ).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Remove Alex' })).toBeEnabled();
    });

    it('ChangeRoleThenOwner_CallsSetMemberRoleWithOwner', async () => {
      setMemberRole.mockResolvedValue({ success: true, message: 'Role updated' });
      renderRow({ viewerIsOwner: true });

      await userEvent.click(
        screen.getByRole('button', { name: 'Change role' })
      );
      await userEvent.click(
        screen.getByRole('menuitemradio', { name: 'Owner' })
      );

      expect(setMemberRole).toHaveBeenCalledWith(
        'kiddo',
        'other-account',
        'owner'
      );
    });

    it('EscapeWithTheRoleMenuOpen_ClosesItWithoutChangingTheRole', async () => {
      renderRow({ viewerIsOwner: true });
      await userEvent.click(
        screen.getByRole('button', { name: 'Change role' })
      );
      expect(
        screen.getByRole('menu', { name: 'Alex role' })
      ).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('menu', { name: 'Alex role' })).toBeNull();
      expect(setMemberRole).not.toHaveBeenCalled();
    });

    it('RemoveThenConfirm_CallsRemoveMember-ToastSuccess-RouterRefresh', async () => {
      removeMember.mockResolvedValue({
        success: true,
        message: 'Member removed',
      });
      renderRow({ viewerIsOwner: true });

      await userEvent.click(
        screen.getByRole('button', { name: 'Remove Alex' })
      );
      expect(screen.getByText('Remove Alex?')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

      expect(removeMember).toHaveBeenCalledWith('kiddo', 'other-account');
      expect(toastSuccess).toHaveBeenCalledWith('Member removed');
      expect(refresh).toHaveBeenCalled();
    });

    it('ManagerViewer_RendersBothDiscreteControlsDisabled', async () => {
      renderRow({ viewerIsOwner: false });

      expect(
        screen.getByRole('button', { name: 'Change role' })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Remove Alex' })
      ).toBeDisabled();
    });

    it('OwnRow_OffersLeaveAndNoRoleChange', async () => {
      renderRow({
        member: member({ user_id: VIEWER, name: 'You', role: ROLES.owner }),
        viewerIsOwner: true,
      });

      expect(screen.getByRole('button', { name: 'Leave' })).toBeEnabled();
      // Self-demotion is not offered, in either shape.
      expect(screen.queryByRole('button', { name: 'Change role' })).toBeNull();
    });

    it('SoleOwnersOwnRow_RendersLeaveDisabledAndOpensNoDialog', async () => {
      renderRow({
        member: member({ user_id: VIEWER, name: 'You', role: ROLES.owner }),
        viewerIsOwner: true,
        soleOwner: true,
      });

      const leave = screen.getByRole('button', { name: 'Leave' });
      expect(leave).toBeDisabled();
      await userEvent.click(leave);
      expect(screen.queryByText('Leave this profile?')).toBeNull();
      expect(removeMember).not.toHaveBeenCalled();
    });
  });

  it('EscapeWithTheMenuOpen_ClosesItWithoutActing', async () => {
    renderRow({ viewerIsOwner: true });
    await openMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
  });

  describe('Identity', () => {
    it('MemberWhoHasActed_RendersARelativeAgeRatherThanATimestamp', () => {
      renderRow({
        member: member({ last_active_at: new Date(Date.now() - 86_400_000) }),
        viewerIsOwner: true,
      });

      expect(screen.getByRole('listitem')).toHaveTextContent(
        /Manageractive: yesterday/
      );
    });

    it('MemberWhoHasNeverActed_SaysSoInPlaceOfAnAge', () => {
      renderRow({ viewerIsOwner: true });

      expect(screen.getByRole('listitem')).toHaveTextContent(
        /active: never/
      );
    });

    it('ViewersOwnRow_MarksItAsTheirs', () => {
      renderRow({
        member: member({ user_id: VIEWER, name: 'You' }),
        viewerIsOwner: true,
      });

      expect(screen.getByText('(you)')).toBeInTheDocument();
    });
  });

  describe('ManagerViewer', () => {
    it('AnotherMembersRoleRows_RenderDisabled-ChangeNothingOnSelect', async () => {
      renderRow({ viewerIsOwner: false });
      await openMenu();

      const owner = screen.getByRole('menuitemradio', { name: 'Owner' });
      // Present, not omitted: the surface states the capability exists.
      expect(owner).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(owner);
      expect(setMemberRole).not.toHaveBeenCalled();
    });

    it('AnotherMembersRemovalRow_RendersDisabled-OpensNoDialogOnClick', async () => {
      renderRow({ viewerIsOwner: false });
      await openMenu();

      const control = screen.getByRole('menuitem', { name: 'Remove Alex' });
      expect(control).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(control);
      expect(screen.queryByText('Remove Alex?')).toBeNull();
      expect(removeMember).not.toHaveBeenCalled();
    });

    it('OwnRow_OffersNoRoleRowsAndAnOperableLeave', async () => {
      renderRow({
        member: member({ user_id: VIEWER, name: 'You' }),
        viewerIsOwner: false,
      });
      await openMenu('You actions');

      // Self-demotion is not offered at all, in either direction.
      expect(screen.queryByRole('menuitemradio')).toBeNull();
      const leave = screen.getByRole('menuitem', {
        name: 'Leave this profile',
      });
      expect(leave).not.toHaveAttribute('aria-disabled');
      await userEvent.click(leave);
      expect(screen.getByText('Leave this profile?')).toBeInTheDocument();
    });
  });

  describe('SoleOwnerViewer', () => {
    it('OwnLeaveRow_RendersDisabled-OpensNoDialogOnClick', async () => {
      renderRow({
        member: member({ user_id: VIEWER, name: 'You', role: ROLES.owner }),
        viewerIsOwner: true,
        soleOwner: true,
      });
      await openMenu('You actions');

      const leave = screen.getByRole('menuitem', {
        name: 'Leave this profile',
      });
      expect(leave).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(leave);
      expect(screen.queryByText('Leave this profile?')).toBeNull();
    });
  });

  describe('OwnerViewer', () => {
    it('SelectOwner_CallsSetMemberRole-ToastSuccess-RouterRefresh', async () => {
      setMemberRole.mockResolvedValue({
        success: true,
        message: 'Role updated',
      });
      renderRow({ viewerIsOwner: true });
      await openMenu();

      await userEvent.click(
        screen.getByRole('menuitemradio', { name: 'Owner' })
      );

      expect(setMemberRole).toHaveBeenCalledWith(
        'kiddo',
        'other-account',
        'owner'
      );
      expect(toastSuccess).toHaveBeenCalledWith('Role updated');
      expect(refresh).toHaveBeenCalled();
    });

    it('RefusedRoleChange_ToastsTheRefusalWithoutRefreshing', async () => {
      setMemberRole.mockResolvedValue({
        success: false,
        message: 'Forbidden',
      });
      renderRow({ viewerIsOwner: true });
      await openMenu();

      await userEvent.click(
        screen.getByRole('menuitemradio', { name: 'Owner' })
      );

      expect(toastError).toHaveBeenCalledWith('Forbidden');
      expect(refresh).not.toHaveBeenCalled();
    });

    it('ConfirmRemoval_CallsRemoveMember', async () => {
      removeMember.mockResolvedValue({
        success: true,
        message: 'Member removed',
      });
      renderRow({ viewerIsOwner: true });
      await openMenu();

      await userEvent.click(
        screen.getByRole('menuitem', { name: 'Remove Alex' })
      );
      await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

      expect(removeMember).toHaveBeenCalledWith('kiddo', 'other-account');
    });

    it('DismissTheConfirmation_DeletesNothing', async () => {
      renderRow({ viewerIsOwner: true });
      await openMenu();

      await userEvent.click(
        screen.getByRole('menuitem', { name: 'Remove Alex' })
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(removeMember).not.toHaveBeenCalled();
    });
  });
});
