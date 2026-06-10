# Remediate carried-over v8-ignore violations and WHAT comments in lib/data

GitHub issue: [#126](https://github.com/JoshEddie/CTRLplusList/issues/126)

## Why

The `reorganize-data-layer` change (issue #116) relocated `lib/dal.ts` and `app/actions/*` verbatim into per-domain `lib/data/` modules as a deliberately pure A→B move. `/spec-review` of that move surfaced violations carried over verbatim from the deleted sources: `/* v8 ignore */` annotations over redundant guards (never valid — `testing-foundation` reserves ignores for invariants established outside the function), ignores whose "unreachable" rationales are factually wrong under the neon-http driver model (every query is its own HTTP round-trip, so the guarded race branches are live), ignores on directly-testable exported-function guards, and WHAT comments forbidden by CLAUDE.md.

Inherited binding constraints from `testing-foundation` (the spec this change brings `lib/data/` into conformance with, without changing it):

- Files SHALL meet the universal per-file floor (98 stmts / 98 lines / 95 branches / 100 funcs) via tests or annotated excludes — never threshold edits.
- A `/* v8 ignore */` SHALL carry a truthful rationale citing an invariant established outside the function (framework lifecycle, platform, third-party/DB contract); an ignore over a branch the function's own control flow already decided is invalid.
- Dead code disposition is write the missing test OR delete the unreachable code — not exclusion.

## What Changes

All within `lib/data/` modules and their `__tests__/` suites; no behavior change to any endpoint's success path.

- **Delete dead guards and their ignores** (redundant-guard rule): `item.actions.ts` (`listIds.length > 0` inside `lists.length > 0` + 1:1 `.map`), `item.schema.ts` (`if (store.link)` always truthy after the `hasAllFields` early return; unreachable trailing `return true`), `listItems.actions.ts` (`new_position !== itemPosition` already decided by the earlier `itemPosition === targetPosition` guard).
- **Test the live race branches, drop the wrong "unreachable" ignores**: `purchase.actions.ts` (null-guard after `items.findFirst` re-fetch — concurrent delete between round-trips) and `list.actions.ts` (empty `.returning()` when the row is deleted between ownership check and update), via the existing `vi.spyOn(...).mockResolvedValueOnce` pattern.
- **Test the auth/ownership guards on exported functions, drop the defense-in-depth ignores**: `item.associations.ts` (`updateItemStores`, `updateItemLists` — guards directly exercisable with the existing `noSession()` helper) and `listItems.actions.ts` (private `checkListBalance` `< 2 rows` guard — exercise through `updatePriority`, or conclude genuinely dead and delete).
- **Test the db-error rethrows, drop their ignores**: two catch/rethrow paths in `listItems.actions.ts`, using the `vi.spyOn(db, …)` failure-injection pattern already in that file's suite.
- **Delete carried-over WHAT comments** across `item.actions.ts`, `item.schema.ts`, `item.associations.ts`, `listItems.actions.ts`, `user.ts`, `list.ts`.
- **Optional rider — unify actor resolution in `list.actions.ts`**: replace its four inline `auth()` + email-lookup blocks with the shared `authedUserId` from `user.session.ts`, matching `user.actions` / `visit.actions` / `listItems.actions` (DRY; behavior-touching via import graph + test mocks, which is why it was excluded from the pure move).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `testing-foundation`: the "Files SHALL meet the universal floor via tests or annotated excludes" requirement gains TESTING.md's ignore-validity criterion, which the active spec does not yet encode: an ignore rationale must cite an invariant established *outside* the function (framework lifecycle, platform, a third-party/DB contract) — a rationale citing the function's own earlier control flow describes a redundant guard (disposition: delete), and a rationale citing in-repo callers is not an external invariant (disposition: test the exported guard directly). The remediation work in this change is the enforcement sweep of that criterion over `lib/data/`.

No requirement in `data-layer-organization` or `server-endpoint-authorization` changes; the code work is implementation-and-test-level remediation.

## Impact

- **Source**: `lib/data/item.actions.ts`, `item.schema.ts`, `item.associations.ts`, `listItems.actions.ts`, `purchase.actions.ts`, `list.actions.ts`, `user.ts`, `list.ts` — guard/comment/ignore deletions only, plus the optional `list.actions.ts` actor-resolution rider.
- **Tests**: new cases in the corresponding `lib/data/__tests__/` suites (race branches, auth guards, db-error rethrows); rider updates `list.actions` test mocks from `auth()`-stubbing to `authedUserId`-stubbing.
- **No cache-tag changes**: no read is added or modified; mutations keep their existing `updateTag` calls.
- **Verification bar**: per-file coverage floors hold for every `lib/data/` module *after* the ignores are removed; full vitest suite green; zero `/* v8 ignore */` introduced.
