// The one home for the deterministic self-profile id scheme. `createSelfProfile`
// mints it, the phase-1 and phase-2 migration backfills reproduce it in SQL, and
// the dev seed and test fixtures name it without a lookup. A second copy could
// fall behind silently: a mismatched id compares false against every row rather
// than failing loudly.
export const selfProfileOf = (userId: string) => `self-${userId}`;
