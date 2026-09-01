// The claim-visibility vocabulary and the composition of a stored baseline
// tier with the current request's adjustment. Not in `lib/data/` — combining a
// stored value with request parameters is not a data-layer concern
// (`data-layer-organization`). Nothing here imports a runtime, so `db/schema`
// can read the tier vocabulary for its CHECK without a cycle.
import type { SpoilerTier } from '@/lib/types';

// Ordered weakest to strongest: each tier admits everything below it.
// surprise → nothing; progress → the list's claimed count; claims → per-item
// badges and remaining capacity; identity → the claiming parties named.
export const SPOILER_TIERS = [
  'surprise',
  'progress',
  'claims',
  'identity',
] as const satisfies readonly SpoilerTier[];

// The fully protected default: a membership with no stored tier resolves here,
// and it is what every existing user experiences unchanged.
export const PROTECTED_TIER: SpoilerTier = 'surprise';

// What a viewer with no membership on the owning profile resolves to: nothing
// is withheld, because there is no surprise of theirs to protect.
export const MAXIMAL_TIER: SpoilerTier = 'identity';

// The library omits `progress`: it spans every list the profile owns and has
// no single-list claimed count to progress toward.
export const LIBRARY_TIERS = ['surprise', 'claims', 'identity'] as const;

export function atLeast(tier: SpoilerTier, floor: SpoilerTier): boolean {
  return SPOILER_TIERS.indexOf(tier) >= SPOILER_TIERS.indexOf(floor);
}

export function spoilerTierOf(stored: string): SpoilerTier {
  return SPOILER_TIERS.find((tier) => tier === stored) ?? PROTECTED_TIER;
}

// One URL parameter carries the transient per-page tier.
export const SPOILER_PARAM = 'spoiler';

// The write side of the delta: set the param, or omit it when the choice is the
// viewer's own baseline. One home so every control that writes it — the hero
// tile, its strip-kebab twin, the library toggle — omits on the same rule.
// Returns a query string (no leading `?`); pure, so nothing runtime leaks here.
export function withSpoilerParam(
  currentQuery: string,
  next: SpoilerTier,
  baseline: SpoilerTier
): string {
  const params = new URLSearchParams(currentQuery);
  if (next === baseline) params.delete(SPOILER_PARAM);
  else params.set(SPOILER_PARAM, next);
  return params.toString();
}

type ParamValue = string | string[] | undefined;

const tierOf = (raw: ParamValue): SpoilerTier | undefined =>
  SPOILER_TIERS.find((tier) => tier === raw);

// The adjustment is a delta from the viewer's own baseline, so an absent
// parameter falls through rather than resetting: the same URL correctly
// resolves differently for two people.
export function resolveSpoilerTier(
  baseline: SpoilerTier,
  params: Record<string, ParamValue> = {}
): SpoilerTier {
  return tierOf(params[SPOILER_PARAM]) ?? baseline;
}
