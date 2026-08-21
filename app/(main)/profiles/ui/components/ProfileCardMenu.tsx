'use client';

import { Button } from '@/app/ui/components/button';
import { Menu, MenuLinkItem } from '@/app/ui/components/menu';
import { useRef, useState } from 'react';
import { MdModeEdit, MdMoreHoriz } from 'react-icons/md';

// One row today. Permissions (#194) and "Transfer a list in" (#198) join it
// here as their chunks land — the menu is the card's management home from the
// start so those arrive as rows rather than as a change of shape.
//
// The row reads "Edit", not the mockup's "Manage": *managed* already names a
// kind of profile here, so "Manage" on a card labelled `Owner` reads as a
// statement about the profile rather than as the action.
export default function ProfileCardMenu({
  profileId,
  profileName,
}: {
  profileId: string;
  profileName: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="profile-card-menu">
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
        <MenuLinkItem
          href={`/profiles/${profileId}`}
          icon={<MdModeEdit size={18} />}
          onClick={() => setOpen(false)}
        >
          Edit {profileName}
        </MenuLinkItem>
      </Menu>
    </div>
  );
}
