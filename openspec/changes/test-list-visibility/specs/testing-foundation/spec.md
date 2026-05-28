## ADDED Requirements

### Requirement: List-visibility mutation/metadata carve-out SHALL be tested at behavioral-contract level, with per-file enumeration deferred for its multi-owner files

The `list-visibility` capability carve-out for sub-proposal 4.11 comprises exactly two server-side functions — `setListVisibility` in `app/actions/lists.ts` and `generateMetadata` in `app/(main)/lists/[id]/page.tsx` — because the read-path enforcement (`lib/listAccess.ts`, `lib/visibility.ts`) was already tested to the universal `COVERAGE_FLOOR` by §2.1 `test-pure-libs`. Each function SHALL be covered by a colocated node-project test file asserting its full observable contract against the real pglite test database (`@/lib/auth`'s `auth()` mocked at the session boundary; internal DAL NOT mocked): `app/actions/__tests__/lists.setListVisibility.test.ts` (authorization, fail-closed enum re-validation, the `shared_at` transition state machine, the legacy-`shared` dual-write, and `updateTag('lists')` revalidation) and `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts` (universal `noindex`, the full `{private, unlisted, public} × {owner, authenticated non-owner, anonymous}` name-leak matrix, and the not-found / fetch-error fail-closed fallbacks).

Both source files are **multi-owner**: `app/actions/lists.ts` also exports functions owned by §4.9 `test-list-item-management` and §4.14 `test-visit-history`; `page.tsx` also exports the `ListPage` component owned by the list-page render carve-out. Because the universal `COVERAGE_FLOOR` and the `sonarjs/cognitive-complexity = error` promotion are enforced **per file**, this sub-proposal SHALL NOT add either file to `vitest.config.ts` `thresholds` and SHALL NOT add either file to the `eslint.config.mjs` complexity-error overrides — doing so would impose the floor and the error-level ceiling on sibling functions this carve-out neither wrote nor reviewed. The behavioral lock for 4.11's two functions is the integration tests above (which run in the `test` pre-merge gate and fail on regression regardless of file enumeration) together with the `list-visibility` capability SHALLs (R2/R5/R6 and the ADDED fail-closed re-validation requirement).

This carve-out establishes the **deferred-enumeration convention** for multi-owner files: a multi-owner source file SHALL be added to `vitest.config.ts` `thresholds` (and promoted to `sonarjs/cognitive-complexity = error`) by the sub-proposal that lands the *last* slice of that file's coverage — the point at which the whole-file `COVERAGE_FLOOR` is honestly achievable — and that sub-proposal SHALL, at enumeration time, confirm the functions covered by earlier sub-proposals (including 4.11's) remain covered. For `app/actions/lists.ts` the enumerating sub-proposal is whichever of §4.9 / §4.14 archives last; for `app/(main)/lists/[id]/page.tsx` it is the list-page render carve-out.

This record is archive-only (Tier 2 per the parent `test-coverage` design D13): it does NOT modify the active `openspec/specs/testing-foundation/spec.md` and does NOT roll into the parent `test-coverage` accumulator.

#### Scenario: Both visibility functions are covered by colocated node-project tests

- **WHEN** a contributor opens the carve-out source files after this change archives
- **THEN** `app/actions/__tests__/lists.setListVisibility.test.ts` exists and asserts the authorization, fail-closed validation, `shared_at` transition, dual-write, and cache-revalidation behavior of `setListVisibility`
- **AND** `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts` exists and asserts the `noindex`, name-leak matrix, and fail-closed fallback behavior of `generateMetadata`
- **AND** both run under the node vitest project against the real pglite test database

#### Scenario: Multi-owner files are not enumerated at the per-file floor by this sub-proposal

- **WHEN** this change archives
- **THEN** `vitest.config.ts` `thresholds` contains no entry for `app/actions/lists.ts` or `app/(main)/lists/[id]/page.tsx`
- **AND** `eslint.config.mjs` contains no `sonarjs/cognitive-complexity = error` override for either file
- **AND** the deferred-enumeration convention names §4.9 / §4.14 (whichever archives last) as the enumerator of `app/actions/lists.ts` and the list-page render carve-out as the enumerator of `page.tsx`

#### Scenario: Elevated invariant is regression-locked

- **WHEN** a future change to `setListVisibility` removes or reorders the `VisibilitySchema.safeParse` guard so that an out-of-enum `visibility` value reaches the DB read or the UPDATE
- **THEN** the corresponding test in `lists.setListVisibility.test.ts` fails with an assertion showing the row was mutated (or `updateTag` was called) on an invalid value
- **AND** the `test` pre-merge gate fails

#### Scenario: Leak-prevention matrix is regression-locked

- **WHEN** a future change to `generateMetadata` removes the `isShared` short-circuit, drops the owner check, or emits `openGraph` / `twitter` blocks for a non-owner of a `private` or `unlisted` list
- **THEN** the corresponding test in `page.generateMetadata.test.ts` fails with an assertion naming the leaked list name or the missing `noindex` directive
- **AND** the `test` pre-merge gate fails

#### Scenario: Server-action authorization overlap with §4.13 is recorded

- **WHEN** §4.13 `test-server-endpoint-authorization` later builds its cross-action authorization matrix
- **THEN** it finds `setListVisibility`'s owner / authenticated-non-owner / unauthenticated outcomes already asserted by this sub-proposal
- **AND** it references rather than duplicates those assertions
