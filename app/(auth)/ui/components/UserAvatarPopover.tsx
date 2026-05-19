'use client';

import { signOutUser } from '@/app/actions/user';
import { Session } from 'next-auth';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LuLogOut, LuUsers } from 'react-icons/lu';
import UserImage from './UserImage';

export default function UserAvatarPopover({
  user,
}: {
  user: NonNullable<Session['user']>;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={wrapRef} className="avatar-popover-wrap">
      <button
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

      {open && (
        <div className="avatar-popover" role="menu">
          <div className="avatar-popover-header">
            <div className="avatar-popover-name">
              {user.name ?? 'Signed in'}
            </div>
            {user.email && (
              <div className="avatar-popover-email">{user.email}</div>
            )}
          </div>
          <div className="avatar-popover-divider" />
          <Link
            href="/settings/connections"
            className="avatar-popover-item"
            role="menuitem"
            onClick={close}
          >
            <LuUsers size={18} />
            <span>Connections</span>
          </Link>
          <form
            action={signOutUser}
            className="avatar-popover-item avatar-popover-form"
          >
            <button
              type="submit"
              role="menuitem"
              onClick={close}
              className="avatar-popover-item-button"
            >
              <LuLogOut size={18} />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
