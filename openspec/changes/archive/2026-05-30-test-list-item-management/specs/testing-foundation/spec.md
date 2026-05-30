## ADDED Requirements

### Requirement: List-item-management server-action carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `list-item-management` server-action carve-out — comprising the two source files `app/actions/items.ts` and `app/actions/lists.ts` in their entirety — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `app/actions/__tests__/` (`items.test.ts`, `lists.test.ts`) and run under the `node` vitest project. Both files SHALL exercise production code against the real test database (pglite via `bootPglite()`), mocking only the network boundary (`@/lib/auth`'s `auth()`), the database client module (`@/db`, replaced with the pglite drizzle instance), and `next/cache` (so `updateTag` invalidation is assertable) — DAL functions, `lib/listAccess`, and the actions themselves SHALL NOT be mocked. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for both files via `eslint.config.mjs` per-file overrides.

This sub-proposal owns the per-file coverage-floor attribution for both whole files. Functions in these files that belong to other capabilities (`setListVisibility` → `list-visibility`; `bookmarkList` / `unbookmarkList` → `list-collections`; `clearVisitHistory` / `removeVisit` → `visit-history`; the `updateItemStores` helper → `item-store-links`; the per-function authorization guards → `server-endpoint-authorization`) are covered here for the floor, but their invariant elevation to those capability specs is owned by their respective sub-proposals (4.4 / 4.6 / 4.11 / 4.13 / 4.14). Subsequent sub-proposals that add tests touching `app/actions/items.ts` or `app/actions/lists.ts` SHALL inherit the already-enumerated per-file thresholds and SHALL NOT re-add them.

This delta is **Tier 2 carve-out bookkeeping** per `test-coverage` design D13: it is recorded ONLY in this sub-proposal's archive directory. It does NOT roll into the parent `test-coverage` accumulator (`openspec/changes/test-coverage/specs/testing-foundation/spec.md`) and does NOT create or modify the active `openspec/specs/testing-foundation/spec.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs after this change archives
- **THEN** the per-file coverage report shows each of `app/actions/items.ts` and `app/actions/lists.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** both per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits `app/actions/items.ts` or `app/actions/lists.ts` to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Action tests run against the real test database, not mocks

- **WHEN** a test in `app/actions/__tests__/items.test.ts` or `lists.test.ts` exercises a mutation that calls a DAL read (e.g. `getItemEditData` → `getItemById`)
- **THEN** the DAL function runs against the pglite test database via the mocked `@/db` client
- **AND** neither the DAL function nor the action is mocked or stubbed
- **AND** no real Neon or Google OAuth network call occurs

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `app/actions/items.ts` removes the partial-unique-index `23505` catch in `createPurchase`, accepts a client-supplied `user_id`, or drops the viewability gate
- **THEN** the corresponding test in `items.test.ts` fails with an assertion naming the specific broken contract
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change to `app/actions/lists.ts` drops the `updatePriority` rebalance-on-collision path or breaks the `setListItems` add/remove diff
- **THEN** the corresponding test in `lists.test.ts` fails with an assertion naming the specific broken contract
- **AND** the `test` pre-merge gate fails
