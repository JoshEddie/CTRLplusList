'use client';

import ProfileAvatar, { facelessView } from '@/app/ui/components/ProfileAvatar';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import type { ProfileSwitcherView } from '@/lib/data/profile.active';
import { signOutUser } from '@/lib/data/user.actions';
import type { ActorProfile } from '@/lib/types';
import { useProfileSwitch } from '@/app/ui/components/ProfileSwitchProvider';
import { Session } from 'next-auth';
import { useRef, useState } from 'react';
import { LuIdCard, LuLogOut, LuUsers } from 'react-icons/lu';

export default function UserAvatarPopover({
  user,
  activeProfile,
  switcher,
}: {
  user: NonNullable<Session['user']>;
  activeProfile?: ActorProfile;
  switcher?: ProfileSwitcherView;
}) {
  const [open, setOpen] = useState(false);
  const switchProfile = useProfileSwitch();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => setOpen(false);

  // The nav states who the viewer is acting as, so the circle is the active
  // profile's — its Altvatar art on its accent, its initials otherwise. The
  // account's own image is not rendered here at all.
  const rows = switcher?.rows ?? [];
  const profileCount = switcher?.profileCount ?? 0;

  const switchTo = (profileId: string) => {
    close();
    switchProfile(profileId);
  };

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
        <ProfileAvatar
          profile={activeProfile ?? facelessView(user.name)}
          className="avatar"
        />
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
        {/* Identity leads: the profiles the viewer may act as, then the
            destinations, then the terminal action. Switch rows carry the
            profile's own avatar rather than an icon — menu-system exempts them
            from sibling-distinct icons, because five invented icons would say
            less than the faces the viewer is choosing between. */}
        {rows.map((row) => (
          <MenuItem
            key={row.id}
            icon={
              <ProfileAvatar
                profile={row}
                className="menu-profile-avatar"
              />
            }
            onClick={() => switchTo(row.id)}
          >
            {row.name}
          </MenuItem>
        ))}
        {rows.length > 0 && (
          <div className="avatar-popover-divider" role="presentation" />
        )}
        <MenuLinkItem
          href="/profiles"
          icon={<LuIdCard size={18} />}
          onClick={close}
          aria-label={
            profileCount > 1 ? `Profiles (${profileCount})` : undefined
          }
        >
          Profiles
          {profileCount > 1 && (
            <span className="menu-item-count">{profileCount}</span>
          )}
        </MenuLinkItem>
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
