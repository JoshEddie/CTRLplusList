'use client';

import { MenuItemRadio } from '@/app/ui/components/menu';
import {
  SPOILER_TIER_ROWS,
  SpoilerRowIcon,
} from '@/app/ui/components/spoiler-tier-rows';
import { useApplySpoilerTier } from '@/app/ui/hooks/useApplySpoilerTier';
import { type SpoilerTier } from '@/lib/types';

// The hero Spoilers tile's twin inside the collapsed-hero kebab, rendered only
// for a viewer resolving a membership. Same four rows the tile shows, writing
// the same `spoiler` URL param via the shared omit-on-baseline rule, so tile
// and strip stay in lockstep (`list-hero-collapse`).
export default function SpoilerMenuItems({
  tier,
  baseline,
}: {
  tier: SpoilerTier;
  baseline: SpoilerTier;
}) {
  const apply = useApplySpoilerTier(tier, baseline);

  return (
    <>
      {SPOILER_TIER_ROWS.map((row) => (
        <MenuItemRadio
          key={row.value}
          icon={<SpoilerRowIcon row={row} />}
          checked={row.value === tier}
          onSelect={() => apply(row.value)}
        >
          {row.title}
        </MenuItemRadio>
      ))}
    </>
  );
}
