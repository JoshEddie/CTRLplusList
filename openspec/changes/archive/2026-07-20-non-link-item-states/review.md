<!--
review: spec-review
target: non-link-item-states
anchor: 6cd9add
diff-source: git diff --staged
round: 1
-->

# /spec-review — non-link-item-states

Clean, well-factored change: the tri-state store contract has a single source (`storeValidity` / `item.store`) consumed by deck, card, and server actions, and coverage is broad. One confirmed contract gap in the dev seed; one workflow finding dropped as a false positive on verification.

**Scope:** `git diff --staged` · non-link-item-states (active)

## Round 1 — spec-review (2026-07-20)

## Findings

### Standard
_none_

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Major | [summaries.ts:18](app/(main)/items/ui/components/itemform/deck/summaries.ts:18) | Claim: PRICED good-tier-nameless branch of the `store.name.trim()` guard is untested. **Verified false** — `NoStore_AddPrompt` uses `store{name:'',link:'',price:''}`; `storeTier` returns `good` for empty name+link and ignores price, so PRICED is indistinguishable from BARE to it. Dropping the guard makes that test return `''` and fail. Premise ("PRICED had storeTier 'error'") is incorrect. | Drop | summaries.test.ts:40 already exercises the good-tier + empty-name branch |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| K1 | Minor | [seed-dev-users.ts:762](scripts/seed-dev-users.ts:762) | Claim: BARE_ITEM's `continue` + upsert-with-no-delete leaves stale rows on an in-place `dev:local` reseed over a pre-change DB, so BARE isn't "reachable straight from the seed" (D7). **Reclassified to Drop on explore review.** The `dev:local` seed is contractually an idempotent upsert that *preserves UI-created rows* (CLAUDE.md) — not deleting unmanaged rows is that contract working as designed. Stale data after a seed-content change is a general property of any seed edit in this repo, backstopped by `db:reset:dev`. D7 holds under the normal lifecycle (fresh / after reset) — exactly what preview and e2e use. Not a defect, not specific to this change. | Drop | CLAUDE.md "dev:local seeds (preserves UI-created rows)"; `db:reset:dev` is the prescribed clean-slate |

## What looks good
- Single store-validity contract (`lib/storeValidity.ts`, `lib/data/item.store.ts`) consumed by deck tiers, card display, and both server actions — no drift surface.
- `validateStore` mirrors the client gate server-side; API can't persist what the UI forbids.
- Symmetric name⇄link coupling and the tri-state (BARE/PRICED/FULL) are expressed once and reused; schema guards shape, action owns messaging.
- Broad new coverage: `item.store.test.ts`, storeValidity, schema, actions, and deck util tests all extended for the linkless/priced states.

## Verdict
Approve — clear to archive pending CI. No open Fix-now findings (C1 and K1 both Drop on verification). Tasks 20/20, `openspec validate --strict` passes. CI unverified in a staged-diff review (no PR) — confirm CI green before archiving.

---
Would you like me to enter OpenSpec explore mode to investigate these findings — verify every disposition (Drops included), recommend which to fix, and weigh how each fix would land (pros/cons)?
