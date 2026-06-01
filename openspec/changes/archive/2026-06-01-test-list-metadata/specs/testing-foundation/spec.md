## ADDED Requirements

### Requirement: The list-metadata capability SHALL be carved out as a cross-cutting, spec-only sub-proposal

The `list-metadata` capability (`lists.subtitle`) has no exclusively-owned, coverage-gated source file: its data column (`db/schema.ts`) is outside `coverage.include`, its migration is under the coverage-excluded `drizzle/`, its type (`lib/types.ts`) is coverage-excluded, and its behavioral surfaces are owned by sibling carve-outs — `app/actions/lists.ts` by §4.9 `test-list-item-management`, `app/ui/components/ListCard.tsx` by §4.6 `test-list-collections`, and the `ListDetails` hero subtitle render by §4.7 `test-list-hero-header` / §4.8 `test-list-hero-collapse`. Per the per-file coverage model, this carve-out SHALL NOT add `vitest.config.ts` floor entries or `eslint.config.mjs` complexity overrides for those sibling-owned files, and SHALL NOT add colocated `.test.tsx` files that would collide with the one-test-file-per-source convention on those files. Instead, the carve-out's deliverables SHALL be: (a) elevation of the latent subtitle invariants into the active `list-metadata` spec (empty/whitespace→NULL normalization, 120-character cap, omitted-vs-cleared partial-update gate) plus correction of the drifted null-render scenario; and (b) one node-project DB-integration test (`db/__tests__/list-subtitle.test.ts`) locking the data-layer contract (nullable column, no backfill/derive-on-write default, subtitle round-trip and clear-to-null) against the real migrated `bootPglite()` schema. The UI-layer and action-layer subtitle scenarios SHALL be owned by §4.6 / §4.7-4.8 / §4.9 and gated by the elevated `list-metadata` spec when those carve-outs land.

#### Scenario: No per-file floor or complexity override is added for sibling-owned files

- **WHEN** this change is reviewed and at archive
- **THEN** `vitest.config.ts` has no new per-file threshold entry for `app/actions/lists.ts`, `app/ui/components/ListCard.tsx`, `app/(main)/lists/ui/components/ListForm.tsx`, or `app/(main)/lists/ui/components/ListDetails.tsx`
- **AND** `eslint.config.mjs` has no new `sonarjs/cognitive-complexity = error` override for any of those files

#### Scenario: The data-layer subtitle contract is locked by a node integration test

- **WHEN** `npm test` runs after this change archives
- **THEN** `db/__tests__/list-subtitle.test.ts` runs under the node project against `bootPglite()`
- **AND** it asserts that an inserted `lists` row omitting `subtitle` yields `subtitle === null`
- **AND** it asserts a subtitle round-trips through insert + update and clears to NULL on an explicit null update
- **AND** the test adds no `vitest.config.ts` coverage-floor entry (its target, `db/schema.ts`, is outside `coverage.include`)

#### Scenario: Elevated invariants gate the owning carve-outs

- **WHEN** §4.6 (`test-list-collections`), §4.7/4.8 (hero), or §4.9 (`test-list-item-management`) lands its tests after this change archives
- **THEN** the active `list-metadata` spec contains the subtitle scenarios (placeholder-spacer-on-null-card, empty/whitespace→NULL normalization, 120-character cap, omitted-vs-cleared update)
- **AND** those scenarios are the binding contract each owning carve-out's tests assert against
