---
review: spec-review
target: manual-entry-fill-screen
anchor: 5df7f43a0ff4270b92a1047eb93950ce7999acb8
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-07-16)

Clean, well-factored change: the Triage→Review split, shared `FieldRows`, the tier-generic advance rule, and the `useProductFetch` extraction all read as deliberate DRY/leanness work, and the contract is honored end-to-end. Two Minor rot-hazard nits, no correctness or security issues; not yet clear to archive only on those two.

**Scope:** `git diff --staged` (staged, branch `dev`) · manual-entry-fill-screen (active)

### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| — | — | — | _none_ | — | — |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Minor | [deck/utils.ts:77](app/(main)/items/ui/components/itemform/deck/utils.ts:77) | `storeTier` comment references issue #234 (`…is #234's question, so the boundary must not move here`). The design constraint is a legitimate non-obvious WHY and should stay; the bare issue number is the rot-prone part (same deferral is already in proposal.md/design.md). Keep the constraint, drop the number. Borderline given the repo's heavy openspec cross-referencing. | Fix now | CLAUDE.md § Comments — "'handles the case from issue #123' … belong in the PR description and rot as the codebase evolves" |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| K1 | Minor | [tasks.md:52](openspec/changes/manual-entry-fill-screen/tasks.md:52) | Task 8.4 is `[x]` and names `deck/__tests__/FetchFailure.test.tsx` as asserting "routes to the manual screen", but that file is untouched in this diff and structurally can only assert `onManual` fires. The routing assertion actually lives in `ItemFormContainer.test.tsx:703` (`ManualEntry_OpensFillManuallyWithUrlSeededInStoreLink`). Behavior IS tested — task text and implementing work disagree on location, not a false-complete. Reconcile: reword 8.4 to point at the container test, or drop it as redundant. | Fix now | tasks.md:8.4 (task-completion truth) — cites an unchanged file; real coverage at ItemFormContainer.test.tsx:703 |

```
┌──────────┐   disagree    ┌──────────────────────────┐
│ task 8.4 │ ◀ ─ ─ ─ ─ ─ ▶ │ implementation            │
│  [x]     │  cites         │ routing tested in         │
│ FetchFai │  wrong file    │ ItemFormContainer.test:703│
└──────────┘                └──────────────────────────┘
   resolve EITHER: reword 8.4 → container test  OR  drop 8.4 (redundant)
```

## What looks good
- Triage → Review + shared `FieldRows` split follows the `Button`/`LinkButton` fragile-coupling precedent exactly — two shells diverging on title/heading/back/advance, zero entry-path flags.
- `manualAdvanceReady` is expressed purely over tiers + a visited set — no field-specific branches; a later tier-rule change is governed without amendment, as the proposal promised.
- Visit tracking lives at overlay-close (`closeFocus`/`closeSheet`), never on view-model writes, so advance can't fire mid-edit — matches task 3.6's constraint.
- Draft-discard guard is correctly seated: the wipe (not the back action) is the discard moment, `isDirtyDraft` excludes seeded link + qty default, and `ConfirmDialog`'s `onConfirm → onClose` order cleanly closes the dialog after re-seed.
- `FocusEditor`'s repealed gate is matched by an accurate rewritten comment; the error floor genuinely still holds at Preview's Create/Save and the advance rule.
- Tier notes are row-facing status copy sourced from `TierResult.note`; "Needs you" is gone on both shells, and the empty-note "Optional" good-tier note is a nice touch.

## Verdict
Request changes — not yet clear to archive (blockers: C1, K1 open Fix now; CI unverified — non-PR staged invocation, must be green on the `dev` push before archive). Tasks all `[x]`, `openspec validate --strict` passes. Both findings are Minor and reconcilable in-place within active-change latitude (K1 may edit either the task text or drop it).

## Round 2 — recheck (2026-07-16)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| C1 | `storeTier` comment cites issue #234 | resolved | Bare `#234` dropped from both the constraint comment ([deck/utils.ts:76-78](app/(main)/items/ui/components/itemform/deck/utils.ts:76)) and the mirrored test comment ([utils.test.ts:144](app/(main)/items/ui/components/itemform/deck/__tests__/utils.test.ts:144)); the non-obvious WHY (frozen boundary, separately-tracked question) is kept. |
| K1 | Task 8.4 cites unchanged `FetchFailure.test.tsx` for the routing assertion | resolved | 8.4 reworded to split the two contracts: `FetchFailure.test.tsx` asserts the affordance fires `onManual`; `ItemFormContainer.test.tsx` (`ManualEntry_OpensFillManuallyWithUrlSeededInStoreLink`) asserts the manual-screen landing + seeded URL. Task text now matches where coverage actually lives. |

No new findings. Delta stays within the original review's files (comment-only + task-text edits); no escalation tell fired.

**Verdict:** clear to land

---
Would you like me to enter OpenSpec explore mode to investigate these findings — verify every disposition (Drops included), recommend which to fix, and weigh how each fix would land (pros/cons)?
