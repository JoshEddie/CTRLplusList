---
review: spec-review
target: buy-and-claim-authed
anchor: 3dfce4875b7d3139dd3ef3bcae2491f07d5d3d1c
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-07-17)

# /spec-review — buy-and-claim-authed

Code quality good; contract mostly conforms. Two minor Fix-now findings: a comment-convention breach and the e2e-gate task marked complete with no visible rationale.

**Scope:** `git diff --staged` · change `buy-and-claim-authed` (active)

## Findings

### Standard
_none_

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| 1 | Minor | app/(main)/items/ui/components/ItemActions.tsx:17 | Prop doc comment names its caller ("derived once in Item.tsx") — caller references rot; the first clause already carries the WHY | Fix now | CLAUDE.md § Comments: no caller references ("used by X") |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| 2 | Minor | openspec/changes/buy-and-claim-authed/tasks.md 4.2 | Task marked [x] but the diff contains no e2e additions and no recorded skip rationale — record the gate status + rationale, add coverage, or reword 4.2 | Fix now | tasks.md 4.2 (task-completion truth) |
| 3 | Minor | app/(main)/items/ui/components/utils.ts:43 | `containerClasses` extraction documented by no task or spec delta — behavior-neutral refactor (same class set), cosmetic scope drift only | Drop | no matching task in tasks.md sections 1–4 |

## What looks good
- Undo popup built on the shared `Modal` primitive with a controlled `isOpen`/`onClose` contract; renders nothing closed — per spec.
- `Buy & Claim` gate keyed on a navigable link (`!!store?.link`), matching the `View item ↗` predicate.
- No new server action or DAL read; flow reuses `createPurchase`/`removePurchase` with existing `updateTag('items')` invalidation.
- Tests assert observable matrix behavior; `openspec validate buy-and-claim-authed --strict` passes; all 15 tasks checked.

## Deferred to CI
- `npm run lint` · `npx tsc --noEmit` · `npm run build` · `npm run test:coverage` · `npm run test:e2e` — tasks 4.1/4.2 marked run locally; not verifiable from the diff, confirm against the dev-push CI battery.

## Verdict
Request changes — not yet clear to archive (blockers: findings #1 and #2 open; CI unverified — staged-diff invocation has no PR CI to read; dev-push battery must be confirmed green before archive).

## Round 2 — recheck (2026-07-17)

**Fix delta:** `git diff` (unstaged) — `ItemActions.tsx` (1 line), `tasks.md` (1 line). Both files inside the original reviewed diff; no escalation tell.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| 1 | ItemActions.tsx:17 caller reference in prop comment | resolved | Comment now reads "Authed non-owner Buy & Claim signal." — caller reference ("derived once in Item.tsx") removed; remaining clause carries the WHY only |
| 2 | tasks.md 4.2 checked with no e2e skip rationale | resolved | 4.2 now records the rationale inline: e2e for Buy & Claim → undo deferred to open issue [#260](https://github.com/JoshEddie/CTRLplusList/issues/260) (covers #234/#235/#260 together); unit matrix covers this change's behavior. Issue #260 verified open. |

No new findings.

**Verdict:** clear to land
