'use client';

import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem, MenuItemRadio } from '@/app/ui/components/menu';
import {
  revokeInvite,
  setInviteRole,
} from '@/lib/data/profile.members.actions';
import type { PendingInvite } from '@/lib/data/profile.members';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { MdLink, MdMoreHoriz, MdPersonRemove } from 'react-icons/md';
import { ROLE_LABELS, RoleTag } from './RoleTag';

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const run = (action: () => Promise<{ success: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else toast.error(result.message);
    });

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
          {(['owner', 'manager'] as const).map((role) => (
            <MenuItemRadio
              key={role}
              checked={invite.role === role}
              onSelect={() => {
                setMenuOpen(false);
                run(() => setInviteRole(profileId, invite.token, role));
              }}
            >
              {ROLE_LABELS[role]}
            </MenuItemRadio>
          ))}
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
