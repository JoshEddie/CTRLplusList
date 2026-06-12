## 1. Confirm foundation surfaces are usable

- [x] 1.1 Confirm `test/helpers/db.ts` `bootPglite()` boots and replays the drizzle migrations (the existing `test/helpers/db.test.ts` already exercises it). The new DB test depends on it.
- [x] 1.2 Confirm the node project (`*.test.ts`) is configured in `vitest.config.ts` and that `db/**` is reachable from a colocated `db/__tests__/` directory (alias `@` resolves; `db/schema.ts` importable).
- [x] 1.3 Re-read the active `list-metadata` spec and the source surfaces in `design.md`'s Context table; confirm the ownership map (which sibling carve-out owns each file) still holds at HEAD.

## 2. Write `db/__tests__/list-subtitle.test.ts` (node project; no coverage-floor entry)

Targets `db/schema.ts` (outside `coverage.include`) via `bootPglite()`. Adds NO `vitest.config.ts` threshold entry. Each block uses a real migrated pglite DB; insert a `users` row first (FK `lists.user_id → users.id`).

### 2A. NoBackfill — column has no derive-on-write default (R2)

- [x] 2.1 Insert a `lists` row OMITTING `subtitle` (provide only the required columns with no default: `id`, `name`, `occasion`, `user_id` — `date` is NOT NULL but supplied by `defaultNow()`, so it is omitted too); read it back and assert `subtitle === null`. (Locks R2: the column carries no backfill / derive-on-write default — design Decision 5.)

### 2B. RoundTrip — persist and update (R1 data half)

- [x] 2.2 Insert a row WITH `subtitle = 'Brandy Family'`; read back and assert `subtitle === 'Brandy Family'`.
- [x] 2.3 Update the row's `subtitle` to `'Josh Family'`; read back and assert the new value.

### 2C. ClearToNull — explicit null clears (omitted-vs-cleared, SQL layer)

- [x] 2.4 Take a row with a non-null subtitle; update `subtitle = null`; read back and assert `subtitle === null`. (The SQL-layer half of the omitted-vs-cleared invariant; the action-layer `!== undefined` gate is owned by §4.9 and gated by the spec.)

## 3. Audits

### 3.1 Assertion-substance audit (on the new test)

- [x] 3.1 Confirm every `it()` in `list-subtitle.test.ts` asserts an observable column value or row state (`null` vs an exact string), not a tautology or an execute-for-coverage insert. No `expect(true)`, no unasserted inserts.

### 3.2 Duplication audit

- [x] 3.2 Confirm the test reuses `bootPglite()` / `test/helpers/db.ts` and does not re-implement a DB boot. Any `insertList` / `insertUser` helper stays inline (single file) unless a second node test would reuse it.

### 3.3 Complexity audit

- [x] 3.3 No source touched, so nothing to measure on production code. Confirm `npm run lint` reports zero NEW `sonarjs/cognitive-complexity` warnings/errors (the test file is linear).

### 3.4 Testability audit

- [x] 3.4 Confirm R2 is testable at the DB layer with no source refactor (it is — `bootPglite()` replays the real migration; insert-omitting-subtitle exercises the actual column default). Record: no refactor needed.

### 3.5 Invariant-elevation audit

- [x] 3.5 Confirm the three ADDED `list-metadata` requirements (empty/whitespace→NULL dual-enforced normalization, 120-char cap, omitted-vs-cleared partial-update gate) each pass the three-part gate: non-obvious, survives reimplementation, protects a real failure mode. Record the dispositions.
- [x] 3.6 Confirm the MODIFIED R1 null-render scenario is a genuine source-vs-spec drift (placeholder spacer on the card; no node in the hero — design Decision 2) and that the correction direction is spec-follows-source.

## 4. Config changes

- [x] 4.1 **None.** Confirm `vitest.config.ts` is UNCHANGED (no per-file floor for `lists.ts`, `ListCard.tsx`, `ListForm.tsx`, `ListDetails.tsx` — sibling-owned; the new test targets a coverage-excluded file).
- [x] 4.2 **None.** Confirm `eslint.config.mjs` is UNCHANGED (no `.tsx` carve-out file claimed).

## 5. Apply spec deltas

- [x] 5.1 Replace the `TBD` Purpose in `openspec/specs/list-metadata/spec.md` with the real Purpose (the capability owns the optional `lists.subtitle` field and its create/edit + list-card / list-hero render contract — design Decision 3). Direct edit, not a delta block.
- [x] 5.2 At archive, merge the `list-metadata` delta (`specs/list-metadata/spec.md`): MODIFIED R1 (corrected null-render scenarios) + three ADDED requirements. Verify the active spec's R2 wording is unchanged.
- [x] 5.3 Confirm the `testing-foundation` Tier-2 bookkeeping delta (`specs/testing-foundation/spec.md`) stays archive-only — does NOT modify the active `openspec/specs/testing-foundation/spec.md` and does NOT roll into the parent `test-coverage` accumulator (design D13).

## 6. Pre-merge (four-gate)

- [x] 6.1 `npm run lint` passes with zero new errors. Pre-existing carry-forward warnings in unrelated files are acceptable; this carve-out introduces zero new warnings or errors. (Exit 0; `db/__tests__/list-subtitle.test.ts` lints clean — only pre-existing global `sonarjs/cognitive-complexity` warnings remain in unrelated files.)
- [x] 6.2 `npx tsc --noEmit` passes with zero errors.
- [x] 6.3 `npm run build` — passes. All 22 routes generated; no errors. (Earlier blocked only by an unset `DATABASE_URL` in the prior worktree; re-run with the env var present confirms the build is green — as expected, since this change adds only a vitest test file excluded from the build graph plus markdown spec edits.)
- [x] 6.4 `npm test` / `npm run test:coverage` — the new `db/__tests__/list-subtitle.test.ts` runs green under the node project. The node project passes fully (253 passed, 0 failed) at `--maxWorkers=2`. The default parallel run flakes pre-existingly: many `bootPglite()` boots contend under `pool: 'forks'` and exceed the 10 s hook timeout — confirmed on a clean stash (8 such timeouts with this change stashed). No coverage-floor regression (no new floored file).
- [x] 6.5 `npm run test:e2e` — the Playwright webserver now boots cleanly (the prior `neon(process.env.DATABASE_URL!)` boot crash is resolved with the env var present). No e2e specs are added by this carve-out, so Playwright reports "no tests found" — vacuously acceptable; e2e lands with §6.x.

## 7. Audit disposition record

- [x] 7.1 Record the four-audit + invariant-elevation dispositions inline below once §3 completes:
  - **§3.1 Assertion-substance** — PASS. All 4 `it()` blocks assert an observable column value via a `SELECT subtitle` read-back: `toBeNull()` (omit-on-insert, clear-to-null) and `toBe('Brandy Family')` / `toBe('Josh Family')` (round-trip, update). No `expect(true)`, no unasserted inserts; every insert/update is followed by a read-back assertion.
  - **§3.2 Duplication** — PASS. The test imports `bootPglite` from `test/helpers/db` and re-boots nothing. Two tiny inline helpers (`seedOwner`, `readSubtitle`) stay inline (single file, no second node test reuses them) per the convention.
  - **§3.3 Complexity** — PASS. No source touched. The test file is linear and lints clean (`npx eslint` → no issues); zero new `sonarjs/cognitive-complexity` warnings.
  - **§3.4 Testability** — PASS, no refactor needed. R2 is testable at the DB layer as-is: `bootPglite()` replays the real migration journal, so insert-omitting-`subtitle` ⇒ `null` exercises the actual (absent) column default — the exact regression a backfill/derive-on-write default would violate (design Decision 5).
  - **§3.5 Invariant-elevation** — PASS. Three ADDED requirements (empty/whitespace→NULL dual-enforced normalization; 120-char cap; omitted-vs-cleared `!== undefined` gate) each clear the three-part gate: non-obvious (dual enforcement / the `undefined`-vs-`null` distinction), survive reimplementation (server zod is authoritative regardless of client), protect a real failure mode (silent empty-string persistence, over-length value, an edit wiping a subtitle). One MODIFIED R1 null-render scenario is a genuine source-vs-spec drift (card renders an `aria-hidden` `list-card-subtitle-placeholder` spacer; hero renders no node) — correction direction is spec-follows-source (design Decision 2).
  - **§6 Pre-merge gates** — lint ✅ (exit 0, zero new), tsc ✅ (no errors), test ✅ (node project 253/253 at `--maxWorkers=2`; 4 new tests in `list-subtitle.test.ts` green), build ✅ (22 routes generated, no errors), e2e ✅ (webserver boots; no e2e specs in this carve-out → vacuous pass). All four gates green with `DATABASE_URL` present.
- [x] 7.2 Record the deferral surfaced in design Open Questions: `app/(main)/lists/ui/components/ListForm.tsx` is unowned by any carve-out (not named by §4.6, §4.7-4.8, or §4.9) and is declined here — it is the entire list create/edit form (name, occasion, date, delete, `useActionState`), far broader than `list-metadata`. Flagged for the parent `test-coverage` §7.1 audit to assign an owner (natural home: §4.9's "item-management UI" scope or a dedicated list-form carve-out).
