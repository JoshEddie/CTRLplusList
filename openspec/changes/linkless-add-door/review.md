---
review: spec-review
target: linkless-add-door
anchor: 20eaee9bbc85066d3b131ccf4b17675a489614b9
diff-source: git diff --staged
round: 3
---

## Round 1 — spec-review (2026-07-22)

Linkless "add without a link" door is well-shaped — deleted image-search surface is clean, specs and tasks are complete and validate strict. Six open findings cluster around one root: door state is *derived* rather than *declared*, so stale fetch state and two rival definitions of "linkless" leak into the deck.

**Scope:** `git diff --staged` (anchor `20eaee9`) · linkless-add-door (active)

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1+C8 | Major | `app/(main)/items/ui/components/itemform/ItemFormContainer.tsx:197` | Door path derives intro-skip from `pastedUrl !== ''`, but `enterLinkless` never clears it and `useProductFetch` keeps it after a failed/429 fetch returns to `screen='start'`. Entering the door then renders the fetch intro card, a "Change link" exit, and `productUrl={pastedUrl}` → PriceCard shows a source-page link to an unrelated URL, while `isLinkless` suppresses the store step. Linkless item, linked chrome. No test covers door entry with non-empty `pastedUrl`. | Fix now — clear the URL on door entry, or pass an explicit door flag instead of deriving | spec `item-decision-deck` "door entry SHALL skip the intro card" / "price card SHALL NOT render a source-page link … when no product URL exists"; useProductFetch.ts:29-33,60-63; TESTING.md |
| A2+B6 | Major | `app/(main)/items/ui/components/itemform/deck/utils.ts:91` | New `isLinkless` keys on `store.link === ''` alone; pre-existing `pricePairTier` (same file, :116-117) requires name AND link empty. Reachable: from a fetched item, clear only the store link → store rows vanish (Preview.tsx:104, FieldRows.tsx:87) yet `storeTier` is `error` and `validateStore` rejects on save — orphaned store name with no affordance to repair or clear. Two definitions of one concept, silent drift. | Fix now — one home; define linkless as name AND link empty, or amend spec to specify the repair path | CLAUDE.md DRY (identical-by-design → one home; drift hazard); lib/data/item.store.ts:6-11; `item-decision-deck` "Store-entry affordances SHALL be hidden for linkless items" vs retained "Incomplete store blocks create" scenario |
| A3 | Minor | `app/(main)/items/ui/components/itemform/deck/neededSteps.ts:33` | `isStepComplete('price')` now also requires a non-empty price, contradicting the same delta's retained "a `good`-tier title, price, or applicable store SHALL be marked **done**". Amendment recorded only in design.md, not in a SHALL. | Fix now — carve the empty linkless price out in the MODIFIED requirement, or satisfy "pre-mark nothing done" another way | `item-decision-deck` delta, MODIFIED step-membership requirement vs ADDED door requirement |
| A4 | Minor | `app/(main)/items/ui/components/itemform/deck/cards/PhotoCard.tsx:30` | Linkless-branched card copy in PhotoCard, TitleCard, PriceCard, TitleEditor is documented by no task and no SHALL — only design.md prose. | Fix now — add the task/spec line, or drop the branch | tasks.md §2/§4 carry no copy task; TitleCard.tsx:27, PriceCard.tsx:30, editors/TitleEditor.tsx:75 |
| A5 | Minor | `app/(main)/items/ui/components/itemform/deck/usePlaceholderPreviews.ts:38` | First-placeholder auto-selection sits in the shared hook, so it also fires from `FocusEditor`'s photo editor on the Preview/Triage edit path — an existing imageless item silently gains a placeholder with no user pick. Spec scopes pre-selection to the deck photo card's zero-real-photo strip. | Fix now — gate to the deck photo card, or widen the spec | `item-decision-deck` "pre-selected … on both the fetch-zero and linkless-door paths"; `item-placeholder-art` "Only a **selected** preview is ever persisted" |

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B7 | Minor | `app/(main)/items/ui/components/itemform/deck/neededSteps.ts:29` | The new non-empty-price condition also flows into `isStepValid`, which has no price carve-out (unlike `note`/`photo`). On the door path a deliberately blank price is a valid BARE state (tier good, not blocked, save succeeds) yet StepTracker renders Price `current` forever, never `done` — contradicting `isStepValid`'s own contract. Visible only across neededSteps ↔ Deck ↔ StepTracker. | Fix now | neededSteps.ts:29-34,48-55 ↔ Deck.tsx:84 ↔ StepTracker.tsx:23,54 (`valid[i] ? 'done' : 'current'`) |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| — | — | — | _merged into A1+C8_ | — | — |

### What looks good
- Image-search surface deletion is complete and symmetric — route, tests, CSS, types, components all go together; no orphan references left.
- `openspec validate linkless-add-door --strict` passes; all 23 tasks `[x]`, none deferred to CI.
- Seeded linkless coverage (`*-linkless-N`, PRICED + BARE, viewer- and friend-owned) is real product-shaped data, documented in LOCALDEV.md.
- Spec deltas span all six touched capabilities rather than only the headline one.

**Verdict:** findings remain — A1+C8, A2+B6, A3, A4, A5, B7 open `Fix now`; CI unverified (non-PR invocation).

## Round 2 — incremental-spec-review (2026-07-22)

All six Round-1 findings verified resolved in code and spec; the alignment and convention arenas returned clean on the fix delta. One fresh Minor boundary finding: the image-search deletion (staged baseline) left the live `form-field-system` spec referencing deleted surfaces, with no delta in this change.

**Scope:** A/C `git diff` · B `git diff 20eaee9` · linkless-add-door (active)

### Prior findings
| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A1+C8 | Door entry inherits stale `pastedUrl` | Resolved | `useProductFetch` exposes `clearUrl()` (useProductFetch.ts:30-34); `enterLinkless` calls it before seeding (ItemFormContainer.tsx:90). Test `DoorAfterFailedFetch_ShedsStaleUrl-NoIntroNoSourceLink` walks failed fetch → door → price card, asserting no intro and no source link. |
| A2+B6 | Two rival definitions of "linkless" | Resolved | Single home `isBareStore` (name AND link empty) in deck/utils.ts:88-93; both `isLinkless` and `pricePairTier` consume it. Spec now defines linkless as both-empty and mandates visible affordances for the orphaned-name repair path; test `OrphanStoreNameNoLink_KeepsStoreStepForRepair`. |
| A3 | Non-empty-price condition vs retained good-tier-is-done SHALL | Resolved | Spec side amended: MODIFIED step-membership requirement now carves the empty linkless price out of pre-marked-done while declaring it valid for the tracker colour. |
| A4 | Undocumented linkless card-copy branch | Resolved | New SHALL in `item-decision-deck` (fetch-framed language banned on linkless cards) + task 2.5 added and checked. |
| A5 | Placeholder auto-selection on the FocusEditor edit path | Resolved | `usePlaceholderPreviews` gains `preselectFirst = false`; only PhotoCard passes `true`. Test `ZeroPhotosWithoutPreselect_DoesNotAutoSelectPlaceholder` pins the edit path. |
| B7 | `isStepValid` missing price carve-out — StepTracker stuck `current` | Resolved | `isStepValid('price')` now delegates to `stepBlocked` (neededSteps.ts:50-52); blank-linkless-valid and blank-linked-invalid both tested. |

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| — | — | — | _none_ | — | — |

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B9 | Minor | `openspec/specs/form-field-system/spec.md:408` | The change deletes the whole image-search cluster (ImageSearch.tsx, ImageResultsViewer.tsx, image-search.css) but the live `form-field-system` spec still binds behavior to it: line 408's SearchField scenario names "image-search modal search" as a governed surface and line 26 names "image-search backgrounds" as a `--neutral-border-color` consumer. No `form-field-system` delta exists in the change, though proposal.md's removal bullet claims stale references are retired. Spec asserts behavior of deleted code. | Fix now — add a `form-field-system` delta retiring both references | boundary doc-vs-code drift; spec.md:26,408 ↔ deleted `app/(main)/items/ui/components/itemform/ImageSearch.tsx`; proposal.md "Removal" bullet |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| — | — | — | _none_ | — | — |

### What looks good
- Every Round-1 fix landed at the root, not the symptom — one `isBareStore` home, a hook-level `clearUrl`, a parameter gate on the shared placeholder hook — each with a behavior-asserting test named for the state under test.
- Owner-directed door elevation (section 8) amended the `product-link-prefill` delta and tasks together; spec, copy, and test moved as one.
- Spec deltas reconcile findings on the correct side each time (SHALL amendments where design intent was already settled, code where it wasn't).

**Verdict:** findings remain — B9 open `Fix now`; CI unverified (non-PR invocation).

## Round 3 — recheck (2026-07-22)

Fix delta is spec-artifact-only: a new `form-field-system` delta in the change. B9 resolved; no new findings.

**Scope:** `git diff` (unstaged working tree, plus the untracked `specs/form-field-system/`) · linkless-add-door (active)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| B9 | Live `form-field-system` spec asserts behavior of deleted image-search surfaces | Resolved | New `openspec/changes/linkless-add-door/specs/form-field-system/spec.md` carries both MODIFIED requirements verbatim from the live spec minus the two references: `--neutral-border-color is untouched` scenario drops "image-search backgrounds"; `Search inputs use SearchField` scenario drops "image-search modal search". Requirement headers match the live headers exactly (spec.md:9, spec.md:387), so the modifications resolve. `openspec validate linkless-add-door --strict` passes. |

**Verdict:** clear to land
