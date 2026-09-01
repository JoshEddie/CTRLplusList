'use client';

import { Menu, MenuItemRadio } from '@/app/ui/components/menu';
import {
  SPOILER_TIER_ROWS,
  type SpoilerTierRow,
  tierRowFor,
} from '@/app/ui/components/spoiler-tier-rows';
import { withSpoilerParam } from '@/lib/spoilers';
import type { SpoilerTier } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { MdCardGiftcard } from 'react-icons/md';

// The transient claim-visibility control — the hero's Spoilers tile and the
// library's toggle both render it (2026-09-01 mockup): a two-line tile whose
// fill is the current tier's tint, over a menu of dot + title rows. It writes
// the single `spoiler` URL param and omits it when the choice equals the
// viewer's own baseline (the param is a delta, so the same URL resolves
// differently for two people). No `page` reset — the item set is unchanged.
export default function SpoilerPicker({
  tier,
  baseline,
  rows = SPOILER_TIER_ROWS,
}: {
  tier: SpoilerTier;
  baseline: SpoilerTier;
  rows?: readonly SpoilerTierRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const apply = (next: SpoilerTier) => {
    setOpen(false);
    if (next === tier) return;
    const queryString = withSpoilerParam(
      searchParams?.toString() || '',
      next,
      baseline
    );
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const current = tierRowFor(tier);

  return (
    <div className="spoiler-picker">
      <button
        ref={triggerRef}
        type="button"
        className="hero-tile spoiler-tile"
        style={{ background: current.tint }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Spoilers: ${current.label}. Click to change.`}
      >
        <span className="hero-tile-eyebrow">Spoilers</span>
        <span className="hero-tile-value">
          <MdCardGiftcard aria-hidden /> {current.label}
          <span className="hero-tile-caret" aria-hidden>
            ▾
          </span>
        </span>
      </button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        aria-label="Claim visibility"
        className="spoiler-menu"
      >
        {rows.map((row) => (
          <MenuItemRadio
            key={row.value}
            icon={
              <span
                className="spoiler-dot"
                style={{ background: row.tint }}
                aria-hidden
              />
            }
            checked={row.value === tier}
            onSelect={() => apply(row.value)}
          >
            {row.title}
          </MenuItemRadio>
        ))}
      </Menu>
    </div>
  );
}
