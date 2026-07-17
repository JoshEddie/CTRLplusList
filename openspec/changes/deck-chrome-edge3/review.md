<!--
review: spec-review
target: deck-chrome-edge3
anchor: 3aef53d66a0d9a0490aa88ce3a40924914a051e1
diff-source: git diff --staged
round: 3
-->

# /spec-review — deck-chrome-edge3

Solid change: chrome/edge3 deck restyle with clean file splits (`DeckShell`, `StepTracker`, `deck-screen.css`), a reusable `use-dismiss` hook, and matching test coverage. No standard-review (security/perf/correctness/maintainability) findings. Three Minor issues — two convention nits and one spec-vs-implementation divergence on the tracker's disabled semantics. All fixable in place; none needs a re-propose.

**Scope:** `git diff --staged` · deck-chrome-edge3 (active, 30/30 tasks) · no PR → CI unverified (non-PR invocation)

## Round 1 — spec-review (2026-07-16)

## Findings

### Standard
_none_

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Minor | [deck.css:375](app/(main)/items/ui/components/itemform/deck/deck.css:375), :384 | New `.deck-actrow` styling inlines raw hex tints (`border: 1px solid #e4defb`, `background: #ede9fe`) — both added in this diff. deck.css declares its whole palette as named `:root` vars (`--error-line: #f0bdb6`, deck.css:8-18) and the header says it's "Built on global.css tokens"; design.md D8/D9 mandate mapping every value to a token, minting a named one only where no role exists. These two lavender tints are neither a global token nor a local var. | Fix now | CLAUDE.md §CSS-token convention (`feedback_css_tokens`); design.md D8/D9; contradicts deck.css:1-18 |
| C2 | Minor | [paste-prefill.auth.spec.ts:192](e2e/paste-prefill.auth.spec.ts:192) | Comment leads with an issue tag: `// #255: the primary action must be reachable…`. CLAUDE.md's comment policy lists issue-number references (`issue #123`) as PR-description material, not code — they rot. The explanatory clause is fine; drop the `#255:` prefix. | Fix now | CLAUDE.md §Comments |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| K1 | Minor | [StepTracker.tsx:85](app/(main)/items/ui/components/itemform/deck/StepTracker.tsx:85) | Future tracker nodes lock via native `disabled={!interactive}` with no `aria-disabled`. Spec, design D3, and task 4.1 all specify future nodes SHALL be `aria-disabled` — deliberately chosen so the node stays perceivable in the progress group; native `disabled` strips it from the a11y surface. Spec and implementation disagree. Reconcile: switch the lock to `aria-disabled` (keep focusable, guard `onClick`) OR relax spec/D3/task-4.1 to accept native `disabled`. | Fix now | item-decision-deck spec (tracker req); design.md D3:42; tasks.md 4.1:25 |

## What looks good
- Clean structural splits: `DeckShell`, `StepTracker` (replacing `ProgressDots`), and `deck-screen.css` carved out of an over-large `deck.css`; each new unit has co-located tests.
- Shared `use-dismiss` hook extracted rather than duplicating dismiss logic — matches DRY-on-sight convention.
- Test coverage tracks the change: new `DeckShell.test.tsx`, `StepTracker.test.tsx`, expanded `neededSteps.test.ts`, and a viewport-matrix e2e assertion for primary-action reachability.
- Tracker states built from app tokens (`--success-text`, `--primary-color`, `--neutral-border-color`) with color-independent distinction (ring/label weight) and sr-only "Step N of M" — matches design D3.

## Verdict
Request changes — not yet clear to archive (blockers: C1, C2, K1 are open Fix-now findings; CI unverified — non-PR invocation, must be green before archive). All three are Minor and fixable in place; no re-propose needed. K1 can also be resolved by relaxing the spec wording if native `disabled` is the intended lock.

## Round 2 — spec-review (2026-07-16)

Full re-review of the staged diff (round-1 fixes were staged, so this is a fresh full round, not a recheck). Round-1 findings C1, C2 all resolved; K1 reconciled by relaxing spec/design/tasks to native `disabled` — closed. This round surfaces new findings, headlined by three Major contract divergences: apply-time owner decisions (recorded in design.md) were implemented but never folded back into spec deltas, so the canonical specs and the code now disagree.

**Scope:** `git diff --staged` · deck-chrome-edge3 (active, 30/30 tasks, `openspec validate --strict` passes) · no PR → CI unverified (non-PR invocation)

### Findings

#### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| S1 | Minor | [StepTracker.tsx:59](app/(main)/items/ui/components/itemform/deck/StepTracker.tsx:59) | Stale roving tabindex: `tabStop` is set by arrow-key movement but never reset when the referenced node stops being a jump target (e.g. arrow to a node, then click it, making it the viewed step). `tabIndex={interactive && (tabStop ?? jumpTargets[0]) === i ? 0 : -1}` only falls back to `jumpTargets[0]` when `tabStop` is null, so once `tabStop` points at a now-non-interactive node, no button in the group has `tabIndex 0` — keyboard users can no longer Tab into the tracker. | Fix now | `tabStop` only updated in `moveFocus`, never validated against current `jumpTargets` |

#### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Minor | [neededSteps.ts:11](<app/(main)/items/ui/components/itemform/deck/neededSteps.ts:11>) | Fused/misplaced doc comment (flagged independently by both standard and convention agents): the paragraph describing `neededSteps` ("computed once at deck entry… never recomputed") is attached to `isStepComplete`, immediately followed by that function's own description ("live per-step validity, recomputed as the user edits") — the two contradict each other on the same function, and `neededSteps` itself carries no comment. Split the block: first paragraph onto `neededSteps`, second stays on `isStepComplete`. | Fix now | CLAUDE.md §Comments — a comment that misdescribes is worse than none |
| C2 | Minor | [deck-screen.css:221](<app/(main)/items/ui/components/itemform/deck/deck-screen.css:221>), :233 | Stale geometry comments: "Expands the 22px node toward the 44px hit floor." sits above `background: none` — the hit-padding it described was removed and the node is now 28px; ":233 Node center sits 21px down (11px hit-padding + half the 22px node)" references the removed 11px padding and old 22px node vs the actual `margin-top: 14px` / 28px node. Both misdescribe the code. | Fix now | CLAUDE.md §Comments |

#### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| K1 | Major | [UrlEntryStep.tsx:35](<app/(main)/items/ui/components/itemform/UrlEntryStep.tsx:35>) | URL entry + FetchingStep re-slotted into `DeckScreen` with new copy ("Start with a link", reworded hint), but canonical product-link-prefill spec SHALLs the URL entry state inside the existing `FormShell` with the exact hint "Paste a product link to auto-fill details" — and this change ships no product-link-prefill delta. Reconcile: add a MODIFIED delta for product-link-prefill (deck-owned shell, new copy) OR revert prefill screens to FormShell. | Fix now | openspec/specs/product-link-prefill/spec.md:9 |
| K2 | Major | [deck.css:20](<app/(main)/items/ui/components/itemform/deck/deck.css:20>) | Change deletes `.deck-body` and the per-screen padding vocabulary (task 5.5), but two canonical item-decision-deck requirements — shared-padding-class (`.deck-body { padding: 8px 24px 24px; }`, `.prefill-fetching-step` 32px 24px 0) and "nested surfaces SHALL NOT carry the screen padding class" — are neither REMOVED nor MODIFIED by the delta. Reconcile: add REMOVED/MODIFIED deltas superseding both with the `.deck-screen-*` structure OR restore `.deck-body`. | Fix now | openspec/specs/item-decision-deck/spec.md:414-424 |
| K3 | Major | [IntroCard.tsx:40](<app/(main)/items/ui/components/itemform/deck/cards/IntroCard.tsx:40>) | IntroCard drops the "Auto-filled from {store}" eyebrow (folded into subtitle) and adds a second footer action ("Change link"), but the canonical intro-card requirement SHALLs the eyebrow and that the card's ONLY action be the primary "Let's go" — delta doesn't touch it despite Q1/Q2 owner decisions in design.md. Reconcile: MODIFIED delta for the intro-card requirement OR restore eyebrow/single-action. | Fix now | openspec/specs/item-decision-deck/spec.md:35 |
| K4 | Minor | [deck.css:368](<app/(main)/items/ui/components/itemform/deck/deck.css:368>) | Triage entry restyled lavender → `variant="accent"` (white card, `--buy-link-border` seam) per apply-time owner decision in design.md, but canonical requirement SHALLs a light-violet surface and the delta doesn't modify it. Reconcile: fold restyle into a MODIFIED delta OR restore lavender. | Fix now | openspec/specs/item-decision-deck/spec.md:274 |
| K5 | Minor | [tasks.md:40](openspec/changes/deck-chrome-edge3/tasks.md:40) | Task 6.2 is `[x]` but still describes the abandoned approach ("CSS scroll-shadows via `animation-timeline: scroll()` (no JS)") while the implementation is the JS scroll/resize listener per REVISED design D7. Reword 6.2 to the revised approach (D7 explains why no-JS failed). | Fix now | tasks.md 6.2 vs design.md D7 "REVISED during apply" |
| K6 | Minor | [deck-screen.css:98](<app/(main)/items/ui/components/itemform/deck/deck-screen.css:98>) | Task 2.3 and design D2 mandate a `100dvh`-based shell height cap; deck-screen.css contains no dvh unit — shell uses `max-height: 100%` inside a fixed overlay. Reconcile: express cap in dvh OR relax 2.3/D2 to accept the fixed-overlay equivalent. | Fix now | tasks.md 2.3; design.md D2 |
| K7 | Minor | [form-field.css:56](app/ui/components/field/form-field.css:56) | Scope creep: form-field wrapper background changed transparent → `var(--light-color)`, altering every form-field-system consumer app-wide; no task documents it and no form-field-system delta ships. Document (task line + narrow delta) or revert and scope the fix to the deck well. | Fix now | openspec/specs/form-field-system/spec.md:59 (form-field.css sole owner of field chrome) |
| K8 | Minor | [deck-screen.css:136](<app/(main)/items/ui/components/itemform/deck/deck-screen.css:136>) | Design geometry + reference/implementation.md specify a top hairline on the pinned footer (`border-top: 1px solid var(--card-border-color)`); `.deck-screen-ft` has none, relying only on scroll-shadow. Add the hairline OR record removal as an apply-time decision in design.md. | Fix now | design.md exact geometry: "Footer `.deck-screen-ft`: white, top hairline + scroll-shadow" |
| K9 | Minor | [ItemsPage.tsx:53](<app/(main)/items/ui/components/ItemsPage.tsx:53>) | Scope creep: `aria-label="New Item"` added to Items page header button, outside every task/delta. Harmless — visible label is mobile-hidden, so it's a genuine a11y aid. | Drop | scope-creep check; no behavioral risk |

### What looks good
- All three round-1 findings resolved: hex tints tokenized, issue-tag comment cleaned, tracker `disabled` semantics reconciled by relaxing spec/design/tasks consistently.
- `openspec validate deck-chrome-edge3 --strict` passes; 30/30 tasks checked.
- Structural quality from round 1 holds: clean `DeckShell`/`StepTracker`/`deck-screen.css` splits, `use-dismiss` extraction, co-located test coverage.

### Verdict
Request changes — not yet clear to archive (blockers: S1, C1, C2, K1–K8 open Fix-now findings; CI unverified — non-PR invocation, must be green before archive). The three Major contract items (K1–K3) share one root cause — apply-time owner decisions recorded in design.md but never folded into spec deltas — and are all fixable by authoring the missing MODIFIED/REMOVED deltas in this change; no fresh propose→archive cycle needed. Gates 10.1–10.2 marked `[x]` as local runs; dev-push CI remains the ground truth.

## Round 3 — recheck (2026-07-16)

Fix delta: unstaged working tree (StepTracker + test, deck-screen.css, neededSteps.ts, design.md, tasks.md, item-decision-deck delta) plus the untracked `specs/product-link-prefill/spec.md` delta. Delta stays inside the original review's scope; no escalation tell fired. `openspec validate deck-chrome-edge3 --strict` passes; StepTracker suite 12/12 green.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| S1 | Stale roving tabindex | resolved | `stop` now falls back to `jumpTargets[0]` whenever the remembered `tabStop` is no longer a jump target (StepTracker.tsx:50-55); regression test `JumpingToTheArrowFocusedNode_KeepsATabStopInTheGroup` added and passing. |
| C1 | Fused/misplaced `neededSteps` doc comment | resolved | Block split: entry-set paragraph moved onto `neededSteps`, live-validity paragraph stays on `isStepComplete`. |
| C2 | Stale geometry comments in deck-screen.css | resolved | Hit-floor comment deleted; connector comment now reads "14px down (half the 28px node)" matching the code. |
| K1 | Missing product-link-prefill delta | resolved | New MODIFIED delta (`specs/product-link-prefill/spec.md`, untracked) re-homes the URL entry state in the deck-owned shell with the new title/hint copy and updated scenarios. |
| K2 | `.deck-body` requirements not superseded | resolved | Both canonical requirements added under REMOVED with migration notes; deck-owned-shell requirement gains the once-only `.deck-screen-*` padding clause. |
| K3 | Intro-card requirement divergence | resolved | Intro-card requirement now under MODIFIED: eyebrow folded into subtitle attribution, secondary "Change link" footer affordance specified, plus a return-to-URL-entry scenario. |
| K4 | Triage entry lavender vs accent | resolved | Edit-entry requirement now under MODIFIED: accent-variant action row on the buy-link token family, scenarios updated. |
| K5 | Task 6.2 describes abandoned approach | resolved | 6.2 reworded to the JS scroll/resize listener, marked REVISED per design D7. |
| K6 | `100dvh` cap vs fixed-overlay implementation | resolved | Reconciled by relaxing the spec side: task 2.3 and design D2 now state the fixed inset-0 overlay + `max-height: 100%` as the `100dvh` equivalent. |
| K7 | Undocumented form-field wrapper background change | resolved | New task 2.5 documents the transparent → `var(--light-color)` change and its rationale; form-field-system pins input transparency and form-field.css ownership, not the wrapper's background value, so no spec delta is required. |
| K8 | Missing footer top hairline | resolved | Recorded as an apply-time decision in design.md (hairlines moved to the well's own edges); `.deck-screen-well` now carries `border-top`/`border-bottom` in deck-screen.css. |

No new findings introduced by the fixes.

**Verdict:** clear to land

---
Would you like me to enter OpenSpec explore mode to investigate these findings — verify every disposition (Drops included), recommend which to fix, and weigh how each fix would land (pros/cons)?
