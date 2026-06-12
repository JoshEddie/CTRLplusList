## Why

The governing `test-coverage` change established `testing-foundation` as a capability and enumerated 27 sub-proposals; `test-foundation-spike` and `test-foundation` then installed the runner (`vitest@4.1.7`), DB-under-test substrate (`@electric-sql/pglite@0.4.6`), canonical helpers (`test/helpers/db.ts`, `lib/sqlstate.ts`, `test/helpers/next-cache.ts`), CI workflow, lint additions, and the seed-as-fixture extensions. With the foundation green, the lowest-risk slice to land first is the pure-libs carve-out: small, dependency-light modules whose behavior is observable from their return values alone (or, for `listAccess`, observable as DB-state-conditioned predicates). Landing this slice exercises the foundation against real source for the first time, validates the per-file 95% floor at the highest tier, and unblocks downstream primitive-family and capability-flow sub-proposals that import from these files.

Inherited constraints surfaced by spec-grep:

- `testing-foundation` (governing `test-coverage` change + archived `test-foundation` + `test-foundation-spike`) — runner, layout, mocking rules, fixture sources, coverage floors, complexity threshold, four-gate pre-merge, four-audit obligation, assertion-substance bar. Every requirement applies verbatim.
- `list-visibility` (active spec) — `lib/visibility.ts` is the canonical decoder for the three-state visibility column; `lib/listAccess.ts` is the canonical viewability predicate used by `/lists/[id]` render and `createPurchase` gating. Tests SHALL exercise observable behavior of the visibility states already locked by that spec (private = owner-only, unlisted = link-shareable to anyone, public/followers = followers + owner; blocked viewers excluded).
- `server-endpoint-authorization` (active spec) — `lib/listAccess.ts:isItemViewable` is referenced by the spec's authorization model for item-claim gating. Tests here cover the predicate; the action-level gate is covered by `test-server-endpoint-authorization` (sub-proposal 4.13).
- `button-system` (active spec) — `buttonClasses.ts` produces the class string that the spec's variant/size matrix relies on. Tests SHALL exercise the matrix (every variant × {sm, md} + extra append + falsy elision) so future button-system changes have a regression net.

No primitive-family adjustments, no DAL reads, no cache-tag mutations. The cross-cutting design-system rule and cache-tag rule don't apply.

## What Changes

- **NEW** test files (colocated, per `testing-foundation`):
  - `lib/visibility.test.ts` — `fromDb` (every legacy + future-canonical accepted, unknown throws with shaped message), `visibilityDbValues` (single-value, multi-value, ordering, no-duplicates contract).
  - `lib/listAccess.test.ts` — integration test against pglite via `bootPglite()`: `guardListViewable` (null → redirect, blocked-by-owner → redirect, happy-path returns list); `isItemViewable` matrix (anonymous viewer, owner viewer, follower viewer, non-follower viewer, blocked viewer × {OWNER, LINK, FOLLOWERS} visibilities × {item on multiple lists, item on zero lists, missing item}). Uses `redirect`-mock to assert the navigation target rather than letting Next throw.
  - `hooks/use-media-query.test.tsx` — jsdom test stubbing `window.matchMedia`: initial value reflects `matches`, subscribe/unsubscribe lifecycle, server snapshot returns `false`, re-subscribes when `query` changes.
  - `app/ui/components/button/buttonClasses.test.ts` — variant × size matrix, `extra` append, falsy elision (`undefined`, `''`, `false`-result), no leading/trailing space, single-space separator.
- **EXCLUDED** from this sub-proposal's coverage gate:
  - `lib/types.ts` — type-only file (zero executable statements after TS erasure). Per the `testing-foundation` spec's exclusion list, type-only files do not gate. The parent issue's wording referenced "zod validators" but the file is pure TS types — there is no runtime surface to test. Added to the `vitest.config.ts` per-file exclusion list so the report is unambiguous.
- **NEW** ESLint override in `eslint.config.mjs`: promote `sonarjs/cognitive-complexity` from `warn` to `error` for the four files in this carve-out (`lib/visibility.ts`, `lib/listAccess.ts`, `hooks/use-media-query.ts`, `app/ui/components/button/buttonClasses.ts`). All four are well under 15 today (highest is `isItemViewable` at ~10); the override locks the ceiling.
- **NEW** four-audit findings recorded in `tasks.md` (per `testing-foundation`'s audit obligation) — duplication, complexity, testability on source; assertion audit on the new tests. Carve-out is small enough that most expected dispositions are "no finding"; any finding is fixed in-place or deferred as a new sibling sub-proposal.
- **NO source refactors expected.** Carve-out files are recent (extracted by `extract-visibility-constants`, established by foundation work) and were authored for testability. Audit may surface micro-findings (rename for clarity, extract a tiny helper) — those land in this change if found.
- **NO MODIFIED capability requirements.** This sub-proposal exercises behavior already locked by `list-visibility`, `server-endpoint-authorization`, and `button-system` specs; no SHALLs are added to those capabilities. The `testing-foundation` spec is amended only with the carve-out-completion bookkeeping requirement below.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `testing-foundation`: adds a single requirement recording that the pure-libs carve-out has landed at the 95% per-file floor, that the `sonarjs/cognitive-complexity` promotion to `error` is in effect for its files, and that subsequent sub-proposals importing from `lib/visibility.ts`, `lib/listAccess.ts`, `hooks/use-media-query.ts`, or `app/ui/components/button/buttonClasses.ts` inherit the assumption that those modules are tested and complexity-locked. This is the standard archive-time bookkeeping mechanism that every test-* sub-proposal uses to keep `testing-foundation`'s authority over coverage state honest.

## Impact

- **New files:** four test files (one per non-type-only carve-out file). No new helpers — every test uses the existing `bootPglite()` / `mockNextCache()` / `sqlstateOf` from `test/helpers/` and `lib/`.
- **Modified config:** `eslint.config.mjs` gains a per-file override promoting `sonarjs/cognitive-complexity` to `error` for the four carve-out files. `vitest.config.ts` gains an exclusion entry for `lib/types.ts` (type-only).
- **Modified source:** none expected. Any audit finding that requires source change is recorded with disposition in `tasks.md`; refactor-in-place commits become part of this change.
- **CI:** the existing four-gate workflow runs unchanged; the `test` job's runtime grows by the new files (sub-second per file at this size). Per-file coverage threshold for the four carve-out files is set to 95% in `vitest.config.ts`.
- **Dependencies:** none added. The pglite + RTL + jsdom + matchMedia-stub story all exist in the foundation.
- **Downstream unblock:** the parent `test-coverage` change's checkbox for sub-proposal 2.1 flips on archive. No sub-proposal is hard-blocked by this one, but `test-list-visibility` (4.11) and `test-server-endpoint-authorization` (4.13) reuse `isItemViewable` and benefit from its tests landing first.
- **Risk:** low. Files are small, behavior is observable, no UI surfaces, no cross-cutting refactors, no transactional concerns (the `listAccess` predicate reads only — no mutations means no race-condition surface). The only realistic miss is failing to model "blocked viewer" cases against pglite — the seed extensions from `test-foundation` already include the entities needed.
- **No runtime behavior change.**
