'use client';

import Link from 'next/link';
import { TabStrip } from './TabStrip';
import type { LinkTabsProps } from './types';

export function LinkTabs({
  items,
  activeHref,
  size,
  className,
  'aria-label': ariaLabel,
}: LinkTabsProps) {
  return (
    <TabStrip
      role="navigation"
      size={size}
      className={className}
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </TabStrip>
  );
}
