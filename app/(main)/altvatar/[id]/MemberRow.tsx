'use client';

import { Button } from '@/app/ui/components/button';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { Menu, MenuItem, MenuItemRadio } from '@/app/ui/components/menu';
import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import TooltipWrapper from '@/app/ui/components/TooltipWrapper';
import type { ProfileMemberRow } from '@/lib/data/profile.members';
import {
  removeMember,
  setMemberRole,
} from '@/lib/data/profile.members.actions';
import { timeAgo } from '@/lib/timeAgo';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { MdMoreHoriz, MdPersonRemove } from 'react-icons/md';
import { ROLE_LABELS, RoleTag } from './RoleTag';

// A manager sees every owner-floor control disabled rather than absent, so the
// surface states that the capability exists and that they do not hold it. Their
// own removal is not among them — every member may leave, whatever their role,
// and disabling it would state a right they lack.
export default function MemberRow({
  profileId,
  member,
  viewerUserId,
  viewerIsOwner,
  soleOwner,
}: {
  profileId: string;
  member: ProfileMemberRow;
  viewerUserId: string;
  viewerIsOwner: boolean;
  /** This row is the viewer's own and they are the profile's only owner, so
      leaving would strand it. The delete refuses either way; this only stops
      the surface from offering a press that can only fail. */
  soleOwner: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const isSelf = member.user_id === viewerUserId;
  const forbidden = !viewerIsOwner;

  const run = (action: () => Promise<{ success: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else toast.error(result.message);
    });

  return (
    <li className="member-row">
      <ProfileAvatar profile={member} className="member-row-avatar" />
      <div className="member-row-identity">
        <span className="member-row-name">
          {member.name}
          {isSelf && <span className="member-row-you"> (you)</span>}
        </span>
        <span className="member-row-meta">
          <RoleTag role={member.role} />
          active: {member.last_active_at
            ? `${timeAgo(member.last_active_at)}`
            : 'never'}
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
          aria-label={`${member.name} actions`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MdMoreHoriz size={20} />
        </Button>
        <Menu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={menuTriggerRef}
          aria-label={`${member.name} actions`}
        >
          {!isSelf &&
            (['owner', 'manager'] as const).map((role) => (
              <MenuItemRadio
                key={role}
                checked={member.role === role}
                aria-disabled={forbidden || undefined}
                onSelect={() => {
                  if (forbidden) return;
                  setMenuOpen(false);
                  run(() => setMemberRole(profileId, member.user_id, role));
                }}
              >
                {ROLE_LABELS[role]}
              </MenuItemRadio>
            ))}
          <TooltipWrapper
            showTooltip={soleOwner}
            tooltip="You're the only owner, so you can't leave yet — make someone else an owner first."
          >
            <MenuItem
              tone="danger"
              icon={<MdPersonRemove size={18} />}
              aria-disabled={(isSelf ? soleOwner : forbidden) || undefined}
              onClick={() => {
                if (isSelf ? soleOwner : forbidden) return;
                setMenuOpen(false);
                setConfirming(true);
              }}
            >
              {isSelf ? 'Leave this profile' : `Remove ${member.name}`}
            </MenuItem>
          </TooltipWrapper>
        </Menu>
      </div>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          run(() => removeMember(profileId, member.user_id));
        }}
        title={isSelf ? 'Leave this profile?' : `Remove ${member.name}?`}
        message={
          isSelf
            ? 'You will no longer run this profile. Only an owner can add you back.'
            : `${member.name} will no longer run this profile. Adding them back creates a new membership.`
        }
        confirmText={isSelf ? 'Leave' : 'Remove'}
      />
    </li>
  );
}
