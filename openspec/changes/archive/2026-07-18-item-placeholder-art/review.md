---
review: spec-review
target: item-placeholder-art
anchor: e6749a0b604f3a8e1aa4f0d0a130820ee4013268
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-07-18)

# /spec-review — item-placeholder-art

Solid, well-tested implementation of lazy placeholder-art minting, but one atomicity gap on the guest-callable mint action, a widely duplicated test mock, and two contract mismatches (unstyled placeholder-thumb marker, two undocumented scope-creep edits) need reconciling before landing.

**Scope:** staged diff (`git diff --staged`) · change `item-placeholder-art` (active)

## Findings

### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| S1 | Major | lib/data/item.actions.ts:269 | `mintItemPlaceholder` is guest-callable and does check-then-insert with no DB-level backstop: an unauthenticated client can fire N parallel mints on any viewable imageless item and every request that races past the `findFirst` inserts its own `item_images` row — unbounded, unauthenticated write amplification plus an `updateTag('items')` cache bust per insert. Partial-unique index on `(item_id) WHERE active` + `ON CONFLICT DO NOTHING` backstops it. | Fix now | `await db.insert(item_images).values({ item_id: itemId, url, active: true })` — CLAUDE.md/DATABASE.md: "Backstop atomicity with unique / partial-unique indexes and ON CONFLICT" |
| S2 | Minor | app/(main)/items/ui/components/__tests__/ItemCard.test.tsx:14 | Multi-line `mintItemPlaceholder`/`previewPlaceholders` `vi.mock` factory duplicated verbatim across 7 test files — structured, 3+ copies, silent-drift hazard; extract one shared mock factory (e.g. in deck/__tests__/test-helpers.ts). Same defect as C1. | Fix now | CLAUDE.md DRY: "extract when ANY of: 3+ copies · the unit has structure · a copy could drift silently" |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Major | app/(main)/items/ui/components/itemform/deck/__tests__/Deck.test.tsx:9 | Same duplicated `vi.mock('@/lib/data/item.actions', …)` factory (typed multi-field stubs) copy-pasted across the test files — cross-file shared Arrange belongs in a colocated test-helpers home. Duplicate of S2; fix once. | Fix now | TESTING.md § "Shared setup belongs in a fixture": "a typed, multi-field factory reused even twice is usually worth one home" |
| C2 | Minor | e2e/placeholder-art.auth.spec.ts:82 | E2E test name `ImagelessItem_MintsPersistedArtOnFirstView` has two tokens; convention requires three: `<PageOrFlow>_<Action>_<ExpectedOutcome>` (e.g. `ItemCard_FirstView_MintsPersistedArt`). | Fix now | TESTING.md § Playwright (E2E): "three PascalCase tokens separated by single underscores" |
| C3 | Minor | app/(main)/items/ui/components/itemform/deck/__tests__/neededSteps.test.ts:82 | Change-referencing comments: "The one-image bypass is gone…" (also Deck.test.tsx:112) and "(always shown now)" (ItemFormContainer.test.tsx:512) — change notes that rot; state present-tense invariant or drop. | Fix now | CLAUDE.md § Comments: "Don't reference the current task, fix, or callers" |
| C4 | Minor | lib/data/item.actions.ts:1 | File now ~347 code lines (yellow band); the two placeholder actions are a self-contained concern (placeholderArt, listAccess, item_images imports) — clean easy-win extraction exists. | File issue | CLAUDE.md § File size: "yellow 300–400 = warning — pull easy wins where a clean extraction exists" |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| K1 | Major | app/(main)/items/ui/components/itemform/deck/editors/PhotoEditor.tsx:142 | Placeholder thumbs carry marker class `deck-photo-thumb-art` but no CSS rule for it exists (deck.css adds only `.deck-photo-reroll`) — nothing visually distinguishes placeholder thumbs beyond the art itself. Mismatch: add badge styling OR amend the SHALL/task to state the generated-art appearance itself is the mark and drop the inert class. design.md Open Question "CSS for placeholder thumb badge" never resolved at apply. | Fix now | item-decision-deck delta: "Placeholder thumbs SHALL be visually distinguishable as generated art"; tasks.md 4.3 `[x]` |
| K2 | Minor | app/(main)/items/ui/components/ItemsPage.tsx:112 | Scope creep: `onSuccess={() => setShowNewItem(false)}` closes the new-item form on create — absent from tasks.md and every delta spec. Drop the wiring OR document as deliberate companion fix. | Fix now | scope-creep check: no task/spec documents close-on-success |
| K3 | Minor | app/(main)/items/ui/styles/item.css:142 | Scope creep: purchased-item image treatment changed from `filter: brightness(0.88) saturate(0.5)` on `.item.purchased .item-image-container` to `opacity: 0.5` on broader `.purchased .item-image` — uncovered by any task/spec. Revert OR document (e.g. minted-art × purchased interaction). | Fix now | scope-creep check |

## What looks good
- Lazy mint path fully reachable from seed (imageless-item coverage) with e2e proof.
- `previewPlaceholders`/`usePlaceholderPreviews` split keeps client deck logic thin; new hook has dedicated tests.
- Delta specs are complete across all five touched capabilities; `openspec validate --strict` passes; all 21 tasks `[x]`.
- No interactive transactions anywhere; driver constraints otherwise respected.

## Verdict
Request changes — not yet clear to archive (blockers: open Fix now findings S1, S2/C1, C2, C3, K1, K2, K3; CI unverified — staged-diff invocation, no PR to read; validate --strict passes; tasks all [x])

**Verdict:** findings remain

## Round 2 — recheck (2026-07-18)

Delta: unstaged working-tree diff (fixes on the staged baseline). Note the delta adds files outside the original review's diff — `db/schema.ts`, `drizzle/0009_yielding_romulus.sql` (+snapshot/journal), and a new `lib/data/item.placeholder.actions.ts` (+its test) — the direct, necessary S1 backstop and module split. Size (89+/317−) does not rival the original diff, so this stays a recheck; the new migration/module surface is reviewed inline below.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| S1 | Guest-callable mint check-then-insert, no DB backstop | resolved | Actions moved to `lib/data/item.placeholder.actions.ts`; mint now `.onConflictDoNothing().returning()` with the loser re-reading the winner's row (`item.placeholder.actions.ts:43-54`). Backed by new partial-unique `item_images_one_active_idx` (`db/schema.ts:185-189`) and migration `0009_yielding_romulus.sql` — dedupe-lowest-id-then-create-index in one DO block, correct for the neon-http one-statement-per-round-trip constraint. |
| S2 / C1 | Duplicated `vi.mock` placeholder factory across 7 files | resolved | Shared `placeholderActionsMock()` + `MINTED_URL` extracted into `deck/__tests__/test-helpers.ts`; adopted by 8 test files. `ItemPhoto.test.tsx` retains a bespoke minimal `mintItemPlaceholder: vi.fn()` mock — a genuinely distinct concept (drives per-test resolved values: not-called / once / error), not the consolidated typed factory. Correctly left separate. |
| C2 | E2E name `ImagelessItem_MintsPersistedArtOnFirstView` (2 tokens) | resolved | Renamed `ItemCard_FirstView_MintsPersistedArt`; sibling test also 3-token (`Deck_SelectedPlaceholder_RerollsInPlaceAndPersistsAsActiveImage`). |
| C3 | Change-referencing comments ("one-image bypass is gone", "always shown now") | resolved | Both rewritten present-tense (`neededSteps.test.ts:82`, `Deck.test.tsx`); the surviving `// photo (always shown), note.` is a structural label, not a change note. |
| C4 | `item.actions.ts` in yellow file-size band | resolved (was File issue) | Superseded by the S1 module split — the two placeholder actions left `item.actions.ts` for the new module; the yellow driver is gone. |
| K1 | Placeholder-thumb marker class `deck-photo-thumb-art` with no CSS rule | resolved | Inert class dropped from `PhotoEditor.tsx:142`; spec + task 4.3 amended to state the generated-art appearance is itself the distinguisher (no badge); design.md Open Question closed accordingly. |
| K2 | Scope creep: `onSuccess` close-on-create in `ItemsPage` | resolved | Documented as a deliberate companion fix in `proposal.md` (Companion-fixes bullet). |
| K3 | Scope creep: purchased-image `filter` → `opacity: 0.5` | resolved | Documented in `proposal.md` — filter read wrong on minted SVG art, which every imageless purchased item now shows. |

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| N1 | Minor | lib/data/item.placeholder.actions.ts:48 | `updateTag('items')` now fires on a race-loser too (`onConflictDoNothing` inserted nothing), whereas proposal.md still reads "bumps `items` tag on successful insert only." Bounded to genuine concurrent first-views, harmless cache bust; no row written. | Drop | proposal.md Cache bullet |

**Verdict:** clear to land
