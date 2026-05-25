'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BsBoxSeam } from 'react-icons/bs';
import {
  IoBagCheckOutline,
  IoHomeOutline,
  IoReceiptOutline,
} from 'react-icons/io5';
import { LuMenu, LuX } from 'react-icons/lu';

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: IoHomeOutline },
  { label: 'Lists', href: '/lists', icon: IoReceiptOutline },
  { label: 'Items', href: '/items', icon: BsBoxSeam },
  { label: 'Purchased', href: '/purchased', icon: IoBagCheckOutline },
];

// Routes that share a URL prefix with a primary nav destination but should NOT
// activate that destination's pill — they live in the list-collections peer
// group and the page-level sub-nav is their canonical "where am I" signal.
const LISTS_PEERS_EXCLUDED_FROM_ACTIVE = new Set([
  '/lists/bookmarks',
  '/lists/history',
]);

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/lists' && LISTS_PEERS_EXCLUDED_FROM_ACTIVE.has(pathname)) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation-triggered side effect (close menu on route change), not derived state
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="app-nav-wrap" ref={wrapRef} data-open={open}>
      <button
        type="button"
        className="app-nav-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <LuX size={22} /> : <LuMenu size={22} />}
      </button>
      <nav className="app-nav-items" aria-label="Primary">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={
                active ? 'app-nav-item app-nav-item--active' : 'app-nav-item'
              }
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="app-nav-item-icon" />
              <span className="app-nav-item-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
