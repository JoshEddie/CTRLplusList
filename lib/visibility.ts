/**
 * Visibility constants — Stage 1 of a three-stage rollout.
 *
 * Stage 1 (this file's current state): VISIBILITY values point at LEGACY DB
 * strings ('private' | 'unlisted' | 'public'). The decoder accepts BOTH
 * legacy and future-canonical ('owner' | 'link' | 'followers') strings.
 * The canonical branches are intentional dead code — their purpose is to be
 * already-deployed in production by the time Stage 2 lands so that feature-
 * branch dev writes (against the shared dev/prod DB) cannot break prod.
 *
 * Stage 2 (future change `flip-visibility-canonical-values`): flip the RHS
 * below to 'owner' / 'link' / 'followers'. The decoder is unchanged.
 *
 * Stage 3 (future change `migrate-visibility-db-values`): run `UPDATE lists
 * SET visibility = CASE ...` on the DB, ALTER COLUMN default, then strip the
 * legacy branches from this file.
 *
 * DO NOT remove the canonical-string branches from `fromDb` before Stage 3,
 * even though they look unreachable today.
 */

export const VISIBILITY = {
  OWNER: 'private', // Stage 2 → 'owner'
  LINK: 'unlisted', // Stage 2 → 'link'
  FOLLOWERS: 'public', // Stage 2 → 'followers'
} as const;

export type ListVisibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

export const VISIBILITY_VALUES = [
  VISIBILITY.OWNER,
  VISIBILITY.LINK,
  VISIBILITY.FOLLOWERS,
] as const satisfies readonly ListVisibility[];

// Legacy DB strings → canonical constants. Used by fromDb for tolerant
// decoding and by visibilityDbValues for query-time expansion.
const LEGACY_TO_CANONICAL: Record<string, ListVisibility> = {
  private: VISIBILITY.OWNER,
  unlisted: VISIBILITY.LINK,
  public: VISIBILITY.FOLLOWERS,
};

// Canonical-future DB strings → canonical constants. These map values to
// themselves once Stage 2 ships; in Stage 1 these strings never appear in
// the DB, but the decoder must already know them.
const CANONICAL_FUTURE: Record<string, ListVisibility> = {
  owner: VISIBILITY.OWNER,
  link: VISIBILITY.LINK,
  followers: VISIBILITY.FOLLOWERS,
};

/**
 * Decode a raw `lists.visibility` DB string into the canonical constant.
 *
 * Accepts both legacy strings ('private' | 'unlisted' | 'public') and
 * future-canonical strings ('owner' | 'link' | 'followers'). Throws on
 * unknown input — an unknown visibility value indicates a data-integrity
 * bug, since the column is enum-constrained.
 */
export function fromDb(raw: string): ListVisibility {
  if (raw in LEGACY_TO_CANONICAL) return LEGACY_TO_CANONICAL[raw];
  if (raw in CANONICAL_FUTURE) return CANONICAL_FUTURE[raw];
  throw new Error(`Unknown list visibility value: ${JSON.stringify(raw)}`);
}

/**
 * Expand a set of canonical values into every DB-string form (legacy +
 * canonical) for use in Drizzle `inArray` filters. Lets a single WHERE
 * clause match rows regardless of whether they were written under the
 * legacy or canonical naming.
 *
 * Example:
 *   visibilityDbValues([VISIBILITY.LINK, VISIBILITY.FOLLOWERS])
 *   // Stage 1: ['unlisted', 'link', 'public', 'followers']
 */
export function visibilityDbValues(
  values: readonly ListVisibility[]
): string[] {
  const out: string[] = [];
  for (const canonical of values) {
    for (const [legacyStr, mapped] of Object.entries(LEGACY_TO_CANONICAL)) {
      if (mapped === canonical) out.push(legacyStr);
    }
    for (const [futureStr, mapped] of Object.entries(CANONICAL_FUTURE)) {
      if (mapped === canonical) out.push(futureStr);
    }
  }
  return out;
}
