## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Confirm `test/helpers/db.ts` `bootPglite()` boots and replays the drizzle migrations (the existing `test/helpers/db.test.ts` already exercises it). The new DB test depends on it.
- [ ] 1.2 Confirm the node project (`*.test.ts`) is configured in `vitest.config.ts` and that `db/**` is reachable from a colocated `db/__tests__/` directory (alias `@` resolves; `db/schema.ts` importable).
- [ ] 1.3 Re-read the active `list-metadata` spec and the source surfaces in `design.md`'s Context table; confirm the ownership map (which sibling carve-out owns each file) still holds at HEAD.

## 2. Write `db/__tests__/list-subtitle.test.ts` (node project; no coverage-floor entry)

Targets `db/schema.ts` (outside `coverage.include`) via `bootPglite()`. Adds NO `vitest.config.ts` threshold entry. Each block uses a real migrated pglite DB; insert a `users` row first (FK `lists.user_id → users.id`).

### 2A. NoBackfill — column has no derive-on-write default (R2)

- [ ] 2.1 Insert a `lists` row OMITTING `subtitle` (provide only the NOT NULL columns: `id`, `name`, `occasion`, `date`, `user_id`); read it back and assert `subtitle === null`. (Locks R2: the column carries no backfill / derive-on-write default — design Decision 5.)

### 2B. RoundTrip — persist and update (R1 data half)

- [ ] 2.2 Insert a row WITH `subtitle = 'Brandy Family'`; read back and assert `subtitle === 'Brandy Family'`.
- [ ] 2.3 Update the row's `subtitle` to `'Josh Family'`; read back and assert the new value.

### 2C. ClearToNull — explicit null clears (omitted-vs-cleared, SQL layer)

- [ ] 2.4 Take a row with a non-null subtitle; update `subtitle = null`; read back and assert `subtitle === null`. (The SQL-layer half of the omitted-vs-cleared invariant; the action-layer `!== undefined` gate is owned by §4.9 and gated by the spec.)

## 3. Audits

### 3.1 Assertion-substance audit (on the new test)

- [ ] 3.1 Confirm every `it()` in `list-subtitle.test.ts` asserts an observable column value or row state (`null` vs an exact string), not a tautology or an execute-for-coverage insert. No `expect(true)`, no unasserted inserts.

### 3.2 Duplication audit

- [ ] 3.2 Confirm the test reuses `bootPglite()` / `test/helpers/db.ts` and does not re-implement a DB boot. Any `insertList` / `insertUser` helper stays inline (single file) unless a second node test would reuse it.

### 3.3 Complexity audit

- [ ] 3.3 No source touched, so nothing to measure on production code. Confirm `npm run lint` reports zero NEW `sonarjs/cognitive-complexity` warnings/errors (the test file is linear).

### 3.4 Testability audit

- [ ] 3.4 Confirm R2 is testable at the DB layer with no source refactor (it is — `bootPglite()` replays the real migration; insert-omitting-subtitle exercises the actual column default). Record: no refactor needed.

### 3.5 Invariant-elevation audit

- [ ] 3.5 Confirm the three ADDED `list-metadata` requirements (empty/whitespace→NULL dual-enforced normalization, 120-char cap, omitted-vs-cleared partial-update gate) each pass the three-part gate: non-obvious, survives reimplementation, protects a real failure mode. Record the dispositions.
- [ ] 3.6 Confirm the MODIFIED R1 null-render scenario is a genuine source-vs-spec drift (placeholder spacer on the card; no node in the hero — design Decision 2) and that the correction direction is spec-follows-source.

## 4. Config changes

- [ ] 4.1 **None.** Confirm `vitest.config.ts` is UNCHANGED (no per-file floor for `lists.ts`, `ListCard.tsx`, `ListForm.tsx`, `ListDetails.tsx` — sibling-owned; the new test targets a coverage-excluded file).
- [ ] 4.2 **None.** Confirm `eslint.config.mjs` is UNCHANGED (no `.tsx` carve-out file claimed).

## 5. Apply spec deltas

- [ ] 5.1 Replace the `TBD` Purpose in `openspec/specs/list-metadata/spec.md` with the real Purpose (the capability owns the optional `lists.subtitle` field and its create/edit + list-card / list-hero render contract — design Decision 3). Direct edit, not a delta block.
- [ ] 5.2 At archive, merge the `list-metadata` delta (`specs/list-metadata/spec.md`): MODIFIED R1 (corrected null-render scenarios) + three ADDED requirements. Verify the active spec's R2 wording is unchanged.
- [ ] 5.3 Confirm the `testing-foundation` Tier-2 bookkeeping delta (`specs/testing-foundation/spec.md`) stays archive-only — does NOT modify the active `openspec/specs/testing-foundation/spec.md` and does NOT roll into the parent `test-coverage` accumulator (design D13).

## 6. Pre-merge (four-gate)

- [ ] 6.1 `npm run lint` passes with zero new errors. Pre-existing carry-forward warnings in unrelated files are acceptable; this carve-out introduces zero new warnings or errors.
- [ ] 6.2 `npx tsc --noEmit` passes with zero errors.
- [ ] 6.3 `npm run build` completes successfully — all routes generated.
- [ ] 6.4 `npm test` (and `npm run test:coverage`) passes; the new `db/__tests__/list-subtitle.test.ts` runs green under the node project. No coverage-floor regression (no new floored file).
- [ ] 6.5 `npm run test:e2e` — record outcome. No e2e specs are added here; "No tests found" is vacuously acceptable (e2e lands with §6.x).

## 7. Audit disposition record

- [ ] 7.1 Record the four-audit + invariant-elevation dispositions inline below once §3 completes:
  - **§3.1 Assertion-substance** — <to fill: confirm observable assertions>
  - **§3.2 Duplication** — <to fill: bootPglite reused, helpers inline>
  - **§3.3 Complexity** — <to fill: zero new warnings, no source touched>
  - **§3.4 Testability** — <to fill: R2 testable at DB layer, no refactor>
  - **§3.5 Invariant-elevation** — <to fill: three ADDED + one MODIFIED, all gated>
  - **§6 Pre-merge gates** — <to fill: four gates green; N tests in list-subtitle.test.ts>
- [ ] 7.2 Record the deferral surfaced in design Open Questions: `ListForm.tsx` is unowned by any carve-out and is declined here (too broad for list-metadata). Flag for the parent `test-coverage` §7.1 audit to assign an owner.
