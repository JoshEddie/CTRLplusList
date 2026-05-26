'use client';

import { signOutUser } from '@/app/actions/user';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import { Session } from 'next-auth';
import { useRef, useState } from 'react';
import { LuLogOut, LuUsers } from 'react-icons/lu';
import UserImage from './UserImage';

export default function UserAvatarPopover({
  user,
}: {
  user: NonNullable<Session['user']>;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => setOpen(false);

  return (
    <div className="avatar-popover-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="avatar-container"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        onClick={() => setOpen((o) => !o)}
      >
        <UserImage image={user.image || ''} name={user.name || ''} />
        <div className="gradientOverlay" />
      </button>

      <Menu
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        aria-label="User menu"
      >
        <div className="avatar-popover-header" role="presentation">
          <div className="avatar-popover-name">{user.name ?? 'Signed in'}</div>
          {user.email && (
            <div className="avatar-popover-email">{user.email}</div>
          )}
        </div>
        <div className="avatar-popover-divider" role="presentation" />
        <MenuLinkItem
          href="/settings/connections"
          icon={<LuUsers size={18} />}
          onClick={close}
        >
          Connections
        </MenuLinkItem>
        <form action={signOutUser}>
          <MenuItem type="submit" icon={<LuLogOut size={18} />}>
            Sign out
          </MenuItem>
        </form>
      </Menu>
    </div>
  );
}
