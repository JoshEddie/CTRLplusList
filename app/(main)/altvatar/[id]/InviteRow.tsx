'use client';

import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem } from '@/app/ui/components/menu';
import {
  revokeInvite,
  setInviteRole,
} from '@/lib/data/profile.members.actions';
import type { PendingInvite } from '@/lib/data/profile.members';
import type { RoleShape } from '@/lib/types';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MdLink, MdMoreHoriz, MdPersonRemove } from 'react-icons/md';
import { RoleChoices } from './RoleChoices';
import { RoleTag } from './RoleTag';
import RoleMenuControl from './RoleMenuControl';
import { useRowAction } from './utils';

// A seat somebody has been offered but not yet taken. It sits in the roster
// beside the memberships because that is what it becomes: redeeming the link
// replaces this row with the member's own.
export default function InviteRow({
  profileId,
  invite,
  daysLeft,
}: {
  profileId: string;
  invite: PendingInvite;
  /** Whole days until the link dies, counted by the server. Stated in days
      rather than relatively because seven of them land exactly on the week
      threshold, and "expires next week" is a vaguer promise than the link
      actually makes. */
  daysLeft: number;
}) {
  const [isPending, run] = useRowAction();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const copy = () =>
    toast.promise(
      navigator.clipboard.writeText(
        `${window.location.origin}/invite/${invite.token}`
      ),
      {
        loading: 'Copying',
        success: 'Invite link copied',
        error: 'Failed to copy the link',
      }
    );

  const changeRole = (role: RoleShape) => () =>
    setInviteRole(profileId, invite.token, role.value);

  return (
    <li className="member-row member-row--pending">
      <span className="member-row-avatar member-row-pending-disc" aria-hidden>
        <MdLink size={18} />
      </span>
      <div className="member-row-identity">
        <span className="member-row-name">Invite link</span>
        <span className="member-row-meta">
          <RoleTag role={invite.role} />
          expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
        </span>
      </div>

      {/* The member row's two shapes, for the same reason: labelled controls
          from 600px up, the kebab below it. */}
      <div className="member-row-controls">
        <Button variant="secondary" size="sm" onClick={copy}>
          Copy link
        </Button>
        <RoleMenuControl
          current={invite.role}
          ariaLabel="Invite link role"
          onChangeRole={changeRole}
          run={run}
        />
        <Button
          variant="ghost"
          size="sm"
          isLoading={isPending}
          aria-label="Revoke this invite link"
          onClick={() => setConfirming(true)}
        >
          Revoke
        </Button>
      </div>

      <div className="member-row-menu">
        <Button
          ref={menuTriggerRef}
          variant="ghost"
          size="sm"
          className="menu-trigger"
          isLoading={isPending}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Invite link actions"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MdMoreHoriz size={20} />
        </Button>
        <Menu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={menuTriggerRef}
          aria-label="Invite link actions"
        >
          <MenuItem
            icon={<MdLink size={18} />}
            onClick={() => {
              setMenuOpen(false);
              copy();
            }}
          >
            Copy link
          </MenuItem>
          <RoleChoices
            current={invite.role}
            onPick={(role) => {
              setMenuOpen(false);
              run(changeRole(role));
            }}
          />
          <MenuItem
            tone="danger"
            icon={<MdPersonRemove size={18} />}
            onClick={() => {
              setMenuOpen(false);
              setConfirming(true);
            }}
          >
            Revoke this invite link
          </MenuItem>
        </Menu>
      </div>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          run(() => revokeInvite(profileId, invite.token));
        }}
        title="Revoke this invite link?"
        message="Anyone still holding the link will no longer be able to use it. You can mint a new one at any time."
        confirmText="Revoke"
      />
    </li>
  );
}
