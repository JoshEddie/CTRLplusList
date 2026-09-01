'use client';

import { SelectField } from '@/app/ui/components/field';
import {
  SPOILER_TIER_ROWS,
  tierRowFor,
} from '@/app/ui/components/spoiler-tier-rows';
import { spoilerTierOf } from '@/lib/spoilers';
import type { SpoilerTier } from '@/lib/types';

// The collapsed-row summary and this control share one source of wording.
export const tierLabel = (tier: SpoilerTier) => tierRowFor(tier).label;

// One ordinal tier, on every baseline and on the profile-level default alike —
// the default is the same shape, seeded rather than inherited.
export default function ClaimVisibilityFields({
  value,
  disabled,
  label,
  onChange,
}: {
  value: SpoilerTier;
  disabled: boolean;
  label: string;
  onChange: (next: SpoilerTier) => void;
}) {
  return (
    // Grouped and named: the same control repeats on every baseline the panel
    // renders, so without a group name a screen reader cannot tell whose it has
    // landed on.
    <div className="claim-visibility-fields" role="group" aria-label={label}>
      <SelectField
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(spoilerTierOf(e.target.value))}
        options={SPOILER_TIER_ROWS.map((row) => ({
          value: row.value,
          label: row.label,
        }))}
      />
    </div>
  );
}
