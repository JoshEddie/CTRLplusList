## ADDED Requirements

### Requirement: List-visibility mutation/metadata carve-out SHALL be tested at behavioral-contract level, with per-file enumeration handled by the sub-proposal that lands a file's last coverage slice

The `list-visibility` capability carve-out for sub-proposal 4.11 comprises exactly two server-side functions — `setListVisibility` in `app/actions/lists.ts` and `generateMetadata` in `app/(main)/lists/[id]/page.tsx` — because the read-path enforcement (`lib/listAccess.ts`, `lib/visibility.ts`) was already tested to the universal `COVERAGE_FLOOR` by §2.1 `test-pure-libs`. Each function SHALL have its full observable contract asserted against the real pglite test database (`@/lib/auth`'s `auth()` mocked at the session boundary; internal DAL NOT mocked) under the node vitest project:

- `setListVisibility` is asserted by the `describe('setListVisibility', …)` block in `app/actions/__tests__/lists.test.ts` — the shared action-test file owned by §4.9 `test-list-item-management`, which landed on `dev` ahead of this carve-out. 4.11 merged its more-rigorous superset into that block (replacing the initial weaker tests): authorization including byte-level *row-unchanged* assertions across unauthenticated / authenticated-no-user-row / non-owner / non-existent, fail-closed enum re-validation including the empty-string case and the *validation-precedes-existence-lookup* ordering proof, the full `shared_at` transition state machine (private→{unlisted,public}, {unlisted,public} preserve, →private clears, the private→public→private→public freshness cycle, and the private→private no-op), the legacy-`shared` dual-write, `updateTag('lists')` revalidation (and its absence on every failure path), and the update-throws fail-closed path.
- `generateMetadata` is asserted by the standalone colocated `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts` (universal `noindex`, the full `{private, unlisted, public} × {owner, authenticated non-owner, anonymous}` name-leak matrix, the `public`-path `auth()`-never-consulted short-circuit lock, and the not-found / fetch-error fail-closed fallbacks).

Both source files are **multi-owner**: `app/actions/lists.ts` also exports functions owned by §4.9 `test-list-item-management` and §4.14 `test-visit-history`; `page.tsx` also exports the `ListPage` component owned by the list-page render carve-out. Per the deferred-enumeration convention below, `app/actions/lists.ts` was added to `vitest.config.ts` `thresholds` at the universal `COVERAGE_FLOOR` (and promoted to `sonarjs/cognitive-complexity = error` where applicable) by **§4.9**, which landed the bulk of that file's coverage; this sub-proposal therefore adds **no** new `thresholds` or `eslint.config.mjs` entry for `lists.ts` and instead keeps `setListVisibility` covered inside the now-enumerated file via the merged tests. `app/(main)/lists/[id]/page.tsx` remains **un-enumerated**: this sub-proposal SHALL NOT add it to `vitest.config.ts` `thresholds` or the `eslint.config.mjs` complexity-error overrides, because doing so would impose the floor and the error-level ceiling on the sibling `ListPage` component this carve-out neither wrote nor reviewed. The behavioral lock for 4.11's two functions is the tests above (which run in the `test` pre-merge gate and fail on regression regardless of file enumeration) together with the `list-visibility` capability SHALLs (R2/R5/R6 and the ADDED fail-closed re-validation requirement).

This carve-out documents the **deferred-enumeration convention** for multi-owner files: a multi-owner source file SHALL be added to `vitest.config.ts` `thresholds` (and promoted to `sonarjs/cognitive-complexity = error`) by the sub-proposal that lands the *last / largest* slice of that file's coverage — the point at which the whole-file `COVERAGE_FLOOR` is honestly achievable — and that sub-proposal SHALL, at enumeration time, confirm the functions covered by earlier or sibling sub-proposals (including 4.11's `setListVisibility`) remain covered. For `app/actions/lists.ts` that enumerator was **§4.9** (verified here: the merged `setListVisibility` block keeps that function at the floor); for `app/(main)/lists/[id]/page.tsx` it remains the list-page render carve-out.

This record is archive-only (Tier 2 per the parent `test-coverage` design D13): it does NOT modify the active `openspec/specs/testing-foundation/spec.md` and does NOT roll into the parent `test-coverage` accumulator.

#### Scenario: Both visibility functions are covered by node-project tests

- **WHEN** a contributor opens the carve-out source files after this change archives
- **THEN** `app/actions/__tests__/lists.test.ts` contains a `setListVisibility` block asserting the authorization (with row-unchanged checks), fail-closed validation, `shared_at` transition state machine, dual-write, and cache-revalidation behavior of `setListVisibility`
- **AND** `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts` exists and asserts the `noindex`, name-leak matrix, and fail-closed fallback behavior of `generateMetadata`
- **AND** both run under the node vitest project against the real pglite test database

#### Scenario: This sub-proposal adds no new per-file enumeration for its multi-owner files

- **WHEN** this change archives
- **THEN** this sub-proposal's diff adds no `vitest.config.ts` `thresholds` entry and no `eslint.config.mjs` `sonarjs/cognitive-complexity = error` override for `app/actions/lists.ts` (already enumerated by §4.9) or for `app/(main)/lists/[id]/page.tsx` (still deferred)
- **AND** the deferred-enumeration convention names §4.9 as the realized enumerator of `app/actions/lists.ts` and the list-page render carve-out as the future enumerator of `page.tsx`

#### Scenario: Elevated invariant is regression-locked

- **WHEN** a future change to `setListVisibility` removes or reorders the `VisibilitySchema.safeParse` guard so that an out-of-enum `visibility` value reaches the DB read or the UPDATE
- **THEN** the corresponding test in the `setListVisibility` block of `app/actions/__tests__/lists.test.ts` fails with an assertion showing the row was mutated (or `updateTag` was called) on an invalid value
- **AND** the `test` pre-merge gate fails

#### Scenario: Leak-prevention matrix is regression-locked

- **WHEN** a future change to `generateMetadata` removes the `isShared` short-circuit, drops the owner check, or emits `openGraph` / `twitter` blocks for a non-owner of a `private` or `unlisted` list
- **THEN** the corresponding test in `page.generateMetadata.test.ts` fails with an assertion naming the leaked list name or the missing `noindex` directive
- **AND** the `test` pre-merge gate fails

#### Scenario: Server-action authorization overlap with §4.13 is recorded

- **WHEN** §4.13 `test-server-endpoint-authorization` later builds its cross-action authorization matrix
- **THEN** it finds `setListVisibility`'s owner / authenticated-non-owner / unauthenticated outcomes already asserted in `app/actions/__tests__/lists.test.ts`
- **AND** it references rather than duplicates those assertions
