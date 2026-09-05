'use client';

import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import { useRef, useState } from 'react';
import { MdModeEdit, MdMoreHoriz, MdSwapHoriz } from 'react-icons/md';

// A switch row and an edit destination. The menu is the card's management
// home from the start, so later management rows arrive as rows rather than as
// a change of shape.
//
// `Switch to` leads because switching is the more frequent act, and it is a
// MenuItem rather than a MenuLinkItem because it acts in place: the Profiles
// page re-renders rather than being left. It is the card's keyboard-reachable
// path to switching, so it is absent only from the card already being acted
// as, where it would be inert.
//
// The edit row reads "Edit", not the mockup's "Manage": *managed* already
// names a kind of profile here, so "Manage" on a card labelled `Owner` reads
// as a statement about the profile rather than as the action.
export default function ProfileCardMenu({
  profileId,
  profileName,
  isActive,
  onSwitch,
}: {
  profileId: string;
  profileName: string;
  isActive: boolean;
  onSwitch: (profileId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="profile-card-menu"
      onClick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <Button
        ref={triggerRef}
        variant="on-dark"
        size="sm"
        className="profile-card-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${profileName} actions`}
      >
        <MdMoreHoriz size={20} />
      </Button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        aria-label={`${profileName} actions`}
      >
        {!isActive && (
          <MenuItem
            icon={<MdSwapHoriz size={18} />}
            onClick={() => {
              setOpen(false);
              onSwitch(profileId);
            }}
          >
            Switch to {profileName}
          </MenuItem>
        )}
        <MenuLinkItem
          href={`/altvatar/${profileId}`}
          icon={<MdModeEdit size={18} />}
          onClick={() => setOpen(false)}
        >
          Edit {profileName}
        </MenuLinkItem>
      </Menu>
    </div>
  );
}
