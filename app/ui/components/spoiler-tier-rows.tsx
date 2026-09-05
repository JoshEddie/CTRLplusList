import { LIBRARY_TIERS, SPOILER_TIERS } from '@/lib/spoilers';
import type { SpoilerTier } from '@/lib/types';
import type { IconType } from 'react-icons';
import { FaBarsProgress, FaGift, FaTag } from 'react-icons/fa6';

// Single source of truth for the claim-visibility tier copy and colour,
// mirroring `VISIBILITY_ROWS`: the hero Spoilers tile/menu, its sticky-strip
// kebab twin, the library toggle, and the Settings and invite controls all
// render the same wording for the same stage. Copy and tints follow the
// 2026-09-01 List Page mockup.
//
// `label` is the short tile/select face ("Surprise me"); `title` is the menu
// row's fuller line ("Keep it a surprise"); `tint` is the CSS custom property
// that colours the tile fill and the menu dot for that tier; `Icon` is the
// glyph shown inside that dot and on the tile face.
export type SpoilerTierRow = {
  value: SpoilerTier;
  label: string;
  title: string;
  tint: string;
  Icon: IconType;
};

const ROWS: Record<SpoilerTier, Omit<SpoilerTierRow, 'value'>> = {
  surprise: {
    label: 'Surprise me',
    title: 'Keep it a surprise',
    tint: 'var(--spoiler-tint-surprise)',
    Icon: FaGift,
  },
  progress: {
    label: 'Progress only',
    title: 'Show overall progress',
    tint: 'var(--spoiler-tint-progress)',
    Icon: FaBarsProgress,
  },
  claims: {
    label: 'Claims shown',
    title: "Show what's claimed",
    tint: 'var(--spoiler-tint-claims)',
    Icon: FaTag,
  },
};

export const SPOILER_TIER_ROWS: readonly SpoilerTierRow[] = SPOILER_TIERS.map(
  (value) => ({ value, ...ROWS[value] })
);

// The library spans every list the profile owns, so it has no single-list
// count to progress toward: it omits `progress`.
export const LIBRARY_TIER_ROWS: readonly SpoilerTierRow[] = LIBRARY_TIERS.map(
  (value) => ({ value, ...ROWS[value] })
);

export function tierRowFor(tier: SpoilerTier): SpoilerTierRow {
  return SPOILER_TIER_ROWS.find((row) => row.value === tier) ?? SPOILER_TIER_ROWS[0];
}

export function SpoilerRowIcon({ row }: { row: SpoilerTierRow }) {
  return (
    <span className="spoiler-dot" style={{ background: row.tint }} aria-hidden>
      <row.Icon />
    </span>
  );
}
