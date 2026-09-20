'use client';

import {
  SegmentedControl,
  SegmentedOption,
} from '@/app/ui/components/segmented-control';
import {
  SPOILER_TIER_ROWS,
  type SpoilerTierRow,
} from '@/app/ui/components/spoiler-tier-rows';
import { useApplySpoilerTier } from '@/app/ui/components/use-spoiler-tier';
import type { SpoilerTier } from '@/lib/types';

export default function HeroSpoilerControl({
  tier,
  baseline,
  rows = SPOILER_TIER_ROWS,
}: {
  tier: SpoilerTier;
  baseline: SpoilerTier;
  rows?: readonly SpoilerTierRow[];
}) {
  const apply = useApplySpoilerTier(tier, baseline);

  return (
    <SegmentedControl
      value={tier}
      onChange={apply}
      tone="on-dark"
      size="xs"
      className="spoiler-picker"
      aria-label="Spoilers"
    >
      {rows.map((row) => (
        <SegmentedOption
          key={row.value}
          value={row.value}
          title={row.title}
          style={tier === row.value ? { backgroundColor: row.tint } : undefined}
        >
          <row.Icon aria-hidden /> {row.label}
        </SegmentedOption>
      ))}
    </SegmentedControl>
  );
}
