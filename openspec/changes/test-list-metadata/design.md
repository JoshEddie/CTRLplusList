## Context

Sub-proposal 4.10 of the `test-coverage` initiative — the `list-metadata` capability carve-out. The `testing-foundation` capability is established and hardened: `__tests__/` colocation, the universal per-file floor `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the two-project split (`.test.tsx` → jsdom, `.test.ts` → node), DB-integration tests against `bootPglite()` (real migrated pglite schema), and the four-audit + invariant-elevation obligations are all stable.

`list-metadata` is the capability that owns `lists.subtitle` — one nullable text column added by archiving `redesign-home-and-tokens`. The active spec has a `TBD` Purpose and two requirements (R1 optional-subtitle-field, R2 no-backfill). Reading source at HEAD, the subtitle contract is implemented across:

| Surface | File | Owner |
|---|---|---|
| DB column `subtitle: text('subtitle')` | `db/schema.ts` | unowned; **outside `coverage.include`** (`lib/**`, `app/**`, `hooks/**` only) |
| Migration adding the column | `drizzle/*.sql` | **coverage-excluded** (`drizzle/**`) |
| Type `ListTable.subtitle` | `lib/types.ts` | **coverage-excluded** (`**/types.ts`) |
| `ListSchema.subtitle` zod (`.max(120)`, empty→null `.transform`) + create/update persistence | `app/actions/lists.ts` | §4.9 `test-list-item-management` (explicit) |
| Subtitle `<TextField>` + client `rawSubtitle === '' ? null` after `.trim()` | `app/(main)/lists/ui/components/ListForm.tsx` | unowned; broader than `list-metadata` |
| `list-card-subtitle` vs `list-card-subtitle-placeholder` render branch | `app/ui/components/ListCard.tsx` | §4.6 `test-list-collections` (explicit) |
| `list-hero-subtitle` render (`subtitle ? (...) : null`) | `app/(main)/lists/ui/components/ListDetails.tsx` | §4.7 `test-list-hero-header` / §4.8 `test-list-hero-collapse` |

This table is the design. Every coverage-gateable surface is owned by a sibling carve-out; everything else is coverage-excluded. There is no file this carve-out can claim a per-file floor on without colliding.

Bound by:

- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, observable-behavior-over-execution, `<State>_<Behavior>` `it()` shape, three-role `describe()`, DB-integration against `bootPglite()`, no mocking of internal modules.
- `list-metadata` (active) — owns R1 / R2. This carve-out MODIFIES R1's null-render scenario (source drift), fills the Purpose, and ADDS three latent-invariant requirements. R2 wording is unchanged; the DB test locks it.
- `form-field-system` (active) — `ListForm` renders the subtitle field via `<TextField>`; primitive already tested under §3.3. Token-surface only.

## Goals / Non-Goals

**Goals:**

- Elevate the `list-metadata` spec: fill the `TBD` Purpose, correct R1's drifted null-render scenario, and ADD three normative requirements locking the empty/whitespace→NULL normalization (dual-enforced), the 120-character cap, and the omitted-vs-cleared partial-update gate.
- Land ONE node-project DB-integration test (`db/__tests__/list-subtitle.test.ts`) against `bootPglite()` locking the data-layer contract (R2 no-backfill + the data half of R1).
- Make the UI/action-layer subtitle scenarios binding on the owning carve-outs (§4.6 / §4.7-4.8 / §4.9) via the elevated spec — without claiming their files here.
- Complete the four-audit obligation and the invariant-elevation audit; record dispositions in `tasks.md`.

**Non-Goals:**

- No `.test.tsx` for `ListCard.tsx`, `ListForm.tsx`, or `ListDetails.tsx` (sibling-owned or broader than the capability — Decision 1).
- No test for `app/actions/lists.ts` (owned by §4.9).
- No `vitest.config.ts` per-file floor entry (no source file newly owned — the one new test targets a coverage-excluded file).
- No `eslint.config.mjs` complexity override (no `.tsx` carve-out file claimed).
- No source refactor (Decision 4).
- No e2e. The full create-list-with-subtitle → render flow is e2e territory (§6.x).
- No re-verification of `redesign-home-and-tokens`'s archived migration outcomes beyond the no-backfill data contract that R2 already governs.

## Decisions

### Decision 1: `list-metadata` is a cross-cutting, spec-only carve-out — no UI/action test files, no coverage-floor entries.

The Context table shows every coverage-gateable subtitle surface is owned by a sibling carve-out, and everything else is coverage-excluded. The `testing-foundation` per-file model is explicit: "Each test sub-proposal SHALL enforce coverage floors ONLY on files in its declared carve-out at archive time," and the colocation convention is one `.test.<ext>` per source. Two carve-outs cannot both own `ListCard.test.tsx` or both floor `app/actions/lists.ts`.

Therefore this carve-out asserts the capability's contract by **elevating it into the `list-metadata` spec** (so the owning carve-outs are gated by it) plus **one node DB-integration test on the coverage-excluded data layer** (the only file no one else owns). The subtitle UI/action coverage is delegated to §4.6 / §4.7-4.8 / §4.9, now mandatory via the spec.

**Alternatives considered:**

- *Claim `ListForm.tsx` (the one unclaimed file) under this carve-out and floor it.* Rejected — `ListForm` is the entire list create/edit form (name, occasion datalist, date validation, delete button, `useActionState` orchestration). Floor-owning it would force this "expected small" carve-out to test the whole form, far beyond `list-metadata`. `ListForm`'s ownership belongs with a list-management carve-out (the natural home is §4.9's "item-management UI" scope or a future list-form carve-out), not list-metadata.
- *Write `ListCard.test.tsx` here and let §4.6 inherit it.* Rejected — §4.6 explicitly owns `ListCard.tsx` per the parent `tasks.md`; pre-empting its test file inverts the documented ownership and risks a merge collision when §4.6 lands. The spec scenario achieves the same regression-lock without claiming the file.
- *Add subtitle assertions to a shared `ListCard.subtitle.test.tsx`.* Rejected — splits one source file's tests across two files, defeating per-file failure attribution and violating the one-test-file-per-source convention.
- *Write no new test at all (pure spec change).* Rejected — R2 (no-backfill) and the data half of R1 are cleanly lockable at the DB layer on a file (`db/schema.ts`) no one owns, with zero collision risk. Leaving them unlocked until §4.9 lands would let the only non-delegable contract drift. The DB test is the carve-out's one concrete test deliverable.

### Decision 2: MODIFY R1's null-render scenario to match source (placeholder spacer on the card; no node in the hero). Spec follows source.

The active R1 reads "When `subtitle IS NULL`, no subtitle slot SHALL be rendered," with a scenario "Null subtitle renders no slot" asserting "no subtitle line is rendered (the meta row sits directly below the name)." Source at HEAD diverges:

- `ListCard.tsx` (lines 42–46): `list.subtitle ? <div className="list-card-subtitle">{list.subtitle}</div> : <div className="list-card-subtitle-placeholder" aria-hidden />`. A null subtitle DOES render a node — a non-text, `aria-hidden` spacer that keeps the meta row at a constant vertical offset across cards in a grid. The meta row does NOT sit "directly below the name."
- `ListDetails.tsx` (lines 152–159): `list.subtitle ? (<div className="list-hero-eyebrow-subtitle-wrapper">…</div>) : null`. The hero renders NO node when null.

The two list-card views genuinely differ. The invariant-elevation audit gates this: the drift is non-obvious (a reader of the spec would expect no DOM node on either surface), survives reimplementation (any card-grid rewrite must keep alignment-stable rows — the spacer is the mechanism), and protects a real failure mode (removing the spacer as "dead markup" reintroduces card-height jitter when some cards have subtitles and others don't). The spec is the artifact corrected — the source encodes the design intent — per every prior test-* carve-out's invariant-elevation precedent.

The MODIFIED R1 splits the single stale scenario into two precise scenarios (card placeholder spacer; hero no node) and adds a prose note deferring the card-grid layout rationale to `list-collections` while retaining the "spacer carries no subtitle text and is `aria-hidden`" contract here (the field-owner's concern).

**Alternative considered:** *Remove the placeholder spacer from `ListCard.tsx` to match the spec.* Rejected — it breaks card-grid vertical alignment, which is the design intent. Spec-follows-source is correct here.

### Decision 3: Fill the `TBD` Purpose via a tasks.md apply-time edit, not via a delta operation.

OpenSpec deltas operate on requirements (ADDED / MODIFIED / REMOVED / RENAMED), not on the spec's Purpose block. The `list-metadata` Purpose is currently the archive-stub placeholder "TBD - created by archiving change redesign-home-and-tokens. Update Purpose after archive." Replacing it is a direct edit to `openspec/specs/list-metadata/spec.md` performed during `/opsx:apply` (and re-confirmed at archive), captured as an explicit `tasks.md` step rather than a delta block. The new Purpose: the capability owns the optional `lists.subtitle` field and its create/edit persistence + list-card / list-hero render contract.

**Alternative considered:** *Leave the Purpose as TBD.* Rejected — the issue's scope is to elevate `list-metadata`; a TBD Purpose on a capability this carve-out is explicitly hardening is exactly the kind of stale orientation the workflow asks contributors to fix.

### Decision 4: No source refactor. The empty→NULL normalization is dual-enforced by design, not by accident.

The empty-string→null logic exists in two places: `ListSchema.subtitle`'s zod `.transform` (server, authoritative) and `ListForm`'s `rawSubtitle === '' ? null` after `.trim()` (client, prevents a spurious empty-string submission). A naive "DRY" reading would delete one. The ADDED normalization requirement documents the dual enforcement as intentional defense-in-depth and forbids removing either layer in isolation — so no refactor is proposed; the redundancy is locked, not collapsed.

The four audits' anticipated dispositions:

- **Assertion-substance audit (on the one new test)** — every assertion names an observable: a queried column value (`null` vs a string), a row count, a thrown/returned validation outcome. No tautologies, no execute-for-coverage.
- **Duplication audit** — the DB test reuses `bootPglite()` and the existing `test/helpers/db.ts` boot; no new shared helper. A small inline `insertList` helper stays inline (single file).
- **Complexity audit** — no source touched, nothing to measure; the test file itself is linear.
- **Testability audit** — the no-backfill contract (R2) is testable at the DB layer without source change: `bootPglite()` replays the real migrations, so an insert omitting `subtitle` exercises the actual column default (none). No refactor needed.

### Decision 5: The DB test asserts the column has no derive-on-write default rather than replaying a partial migration journal.

R2 says "the migration that adds `lists.subtitle` SHALL leave the column NULL for every existing row" and "SHALL NOT auto-parse or derive subtitle values." `bootPglite()` replays ALL migrations in journal order against a fresh DB, so there is no "pre-existing row" state to observe mid-journal. The observable guarantee behind "no backfill / no derivation" is that the column carries **no default and no derive-on-write trigger** — any insert omitting `subtitle` yields `NULL`. The test asserts that directly (insert-omitting-subtitle ⇒ `null`), which is the same property a backfill/derivation would violate.

**Alternative considered:** *Partial journal replay — boot up to the migration before subtitle, insert a row, apply the subtitle migration, assert the row stayed NULL.* Rejected — `bootPglite()` has no partial-replay API; adding one is harness scope (a foundation concern), not list-metadata scope, and the no-default assertion already captures the guarantee. If a future migration ever adds a derive-on-write default, the insert-omitting-subtitle assertion fails — which is exactly the regression R2 guards.

## Risks / Trade-offs

- **[A spec-only carve-out leaves subtitle UI untested until §4.6/§4.7-4.8/§4.9 land.]** → Mitigation: the elevated spec scenarios are binding on those carve-outs; the no-backfill + data round-trip (the only non-delegable contract) is locked here by the DB test. The UI render is low-risk (a ternary on a nullable string) and the spec scenarios fail loudly if an owning carve-out skips them.
- **[A reviewer may expect "test-list-metadata" to add UI tests.]** → Mitigation: Decision 1 documents why the per-file model forbids it; the fallback (claim `ListForm.tsx`) is explicitly rejected with rationale. The carve-out name describes the capability, not a promise of `.test.tsx` files for files other carve-outs own.
- **[The R1 drift fix is a spec-follows-source call a reviewer could dispute.]** → Mitigation: Decision 2 names the alternative (remove the spacer) and why it loses (card-grid jitter). The §4.6 `ListCard` test will assert the corrected contract; if the direction is reversed, that test and this scenario both flip together.
- **[The "no default" assertion is a proxy for "no backfill," not a literal replay of the historical migration.]** → Mitigation: Decision 5 — the proxy captures the same observable guarantee and fails on the exact regression R2 guards; literal replay is out-of-scope harness work.
- **[Purpose edited directly rather than via delta means it is not captured in the delta-merge at archive.]** → Mitigation: Decision 3 — the edit is an explicit `tasks.md` step performed at apply and re-confirmed at archive; the active spec is the authority and is edited in place.

## Migration Plan

Not applicable — no runtime behavior change, no schema change, no dependency change. The change adds one test file and edits one active spec (Purpose + deltas merged at archive). Rollback is deleting the test file and reverting the spec edit; nothing in production is affected.

## Open Questions

- **Should `ListForm.tsx` get an explicit owner in the parent `tasks.md`?** It is currently unclaimed (not named by §4.6, §4.7-4.8, or §4.9). This carve-out declines to own it (Decision 1, too broad). Surfacing for the parent `test-coverage` audit (§7.1): `ListForm.tsx` may need its own carve-out line or explicit assignment to §4.9's "item-management UI" scope. Recorded as a deferral, not resolved here.
