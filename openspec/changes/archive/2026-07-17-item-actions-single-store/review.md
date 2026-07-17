---
review: spec-review
target: item-actions-single-store
anchor: 18fc1489c3ed3680b578d742cb37c3c3fd2d2d21
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-07-17)

# /spec-review — item-actions-single-store

Clean, well-structured refactor consolidating the item card's purchase/store surfaces into `ItemActions` + `PriceLine`; contract fully implemented (19/19 tasks, strict validate passes). One Minor convention fix (issue-number citation in a CSS comment) blocks; CI unverified (staged, pre-commit).

**Scope:** staged diff (`git diff --staged`) · change `item-actions-single-store` (active)

## Findings

### Standard
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| 1 | Minor | app/(main)/items/ui/components/itemform/deck/cards/StoreCard.tsx:30 ↔ FocusEditor.tsx:63-70 | StoreEditor wiring (name/link props + `(value) => actions.setStore(0, 'name'\|'link', value)` handlers reading `item.stores[0]`) duplicated identically-by-design in both files; primary-store index-0 semantics could drift silently between deck card and focus editor. | File issue | CLAUDE.md DRY: extract when unit has structure (multi-field literal) even at two copies when drift is silent |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| 2 | Minor | app/(main)/items/ui/styles/purchase.css:2152 | New comment cites an issue number (`to "View" (#169)`); comment policy forbids referencing the current task/fix/issue. Surrounding WHY (half-width slot can't fit full label; aria-label keeps phrase for AT) stands alone without the citation. | Fix now | CLAUDE.md § Comments: "Don't reference the current task, fix, or callers … issue #123" |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| 3 | Minor | openspec/changes/item-actions-single-store/specs/item-actions/spec.md:14 ↔ app/(main)/items/ui/components/ItemActions.tsx:40 | Matrix precedence unspecified for fully-claimed + no-complete-store overlap: 'Non-owner, fully claimed by others' row and 'Any viewer, no complete store' row give contradictory answers; implementation resolves it (status only, no Add Claim, no View) per the 'with claim access' scenario qualifier — the sensible reading. | Drop | spec.md matrix rows vs design/spec conformance |

## What looks good
- 19/19 tasks complete; `openspec validate item-actions-single-store --strict` passes.
- Consolidation of Purchase/StoreLinks/StoreMetadataLine into ItemActions + PriceLine removes three components cleanly, tests migrated with them.
- Delta specs (item-actions, list-item-management, product-link-prefill) coherent with implementation.

## Verdict
Request changes — not yet clear to archive (blockers: finding #2 open Fix now; CI unverified — non-PR invocation, gates must be confirmed green before archiving)

## Round 2 — recheck (2026-07-17)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| 2 | Issue-number citation in purchase.css comment | resolved | `(#169)` removed from the comment at purchase.css:33; the WHY (half-width slot can't fit full label; aria-label keeps phrase for AT) stands alone. Verified in file, not just diff. |

Delta also clarifies the delta-spec matrix precedence (row-composition rule for no-complete-store × claim-state overlap) — addresses finding #3, which was dispositioned Drop and never blocked.

**Verdict:** clear to land
