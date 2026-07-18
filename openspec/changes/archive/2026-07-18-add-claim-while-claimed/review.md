---
review: spec-review
target: add-claim-while-claimed
anchor: 232204399d4f55cb364583156c06a0c58c0d2558
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-07-17)

# /spec-review — add-claim-while-claimed

Solid implementation quality — the standard review returned no findings. Contract status: not archive-ready — the `npm run test:e2e` gate (task 10.5) is unchecked, and one task's wording contradicts the shipped (owner-settled) design.

**Scope:** staged diff (`git diff --staged`) · add-claim-while-claimed (active)

## Findings

### Standard
_none_

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| 1 | Minor | app/(main)/items/ui/components/purchasemodal/PurchaseFlowContainer.tsx:141 | Doc comment on `viewerIsPurchaser` references a work-tracking artifact: "a second self-claim is out of scope (MAP #230)" — comment policy forbids referencing the current task/issue; context belongs in the PR/spec. | Fix now | CLAUDE.md § Comments: "Don't reference the current task, fix, or callers … 'handles the case from issue #123'" |
| 2 | Minor | app/(main)/items/ui/components/purchasemodal/ClaimsList.tsx:7 | Comments cite the active change's design-doc decision IDs ("design D9", "design D8"; also "design 1d" in modal.css:213) — design.md archives on landing, so these references rot; durable form names the capability spec (e.g. "claim-attribution spec"). | Fix now | CLAUDE.md § Comments: references to the current task/change rot as the codebase evolves |
| 3 | Minor | app/(main)/lists/ui/components/ListDetails.tsx:26 | Removing the inlined timeAgo helper left a stray double blank line between the ListWithVisibility type and the navHrefs comment block. | Fix now | ListDetails.tsx:26-27; repo formatting keeps single blank-line separation |

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| 4 | Major | openspec/changes/add-claim-while-claimed/tasks.md:67 | Pre-merge gate 10.5 (`npm run test:e2e`) is unchecked while every implementation task is [x] — executable change, so CI-deferral latitude does not apply and no deferral rationale is recorded. Reconcile: run the gate and mark it, or record an explicit owner-approved deferral. | Fix now | tasks.md 10.5 "- [ ] 10.5 `npm run test:e2e` — zero failing tests"; CLAUDE.md five-gates rule: an executable change voids test-gate skips |
| 5 | Minor | openspec/changes/add-claim-while-claimed/tasks.md:10 | Task 2.1 is [x] with wording contradicting the implementation: it says the viewer manage state passes the viewer-removable subset, but shipped code (Item.tsx passes `claims={localPurchases}`; ClaimsList lists every claim with per-row removability) follows the D7 amendment and task 7.3. Reconcile: reword 2.1 as superseded by 7.3 (matches owner-settled D7), or narrow the claims passed. | Fix now | tasks.md 2.1 "viewer manage state passes the viewer-removable subset" vs design D7 / delta spec "a claims list … containing **every** claim on the item" |

## What looks good
- Standard review (security / performance / correctness / maintainability) surfaced zero findings across the full staged diff.
- New `lib/timeAgo.ts` extraction with dedicated unit tests; ClaimsList extracted as a named subcomponent.
- New e2e specs (`claim-lifecycle.auth`, `item-actions.guest`) cover the change's critical flows.
- Delta specs (`claim-attribution`, `e2e-critical-flows`) state Purposes — no TBD stubs.

## Verdict
Request changes — not yet clear to archive (blockers: task 10.5 e2e gate unchecked with no deferral rationale; open Fix-now findings #1–#5; CI unverified — non-PR invocation, no CI to read)

**Verdict:** findings remain

## Round 2 — recheck (2026-07-17)

Fix delta: unstaged working tree (5 files, +13/−13) — all inside the original review's diff, small vs. the reviewed change. No escalation tells.

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| 1 | PurchaseFlowContainer.tsx doc comment references MAP #230 | resolved | Doc comment reworded to stand alone ("a second self-claim is unsupported"). Fix adds a separate `// TODO(#230): allow a second self-claim.` line — a future-work marker pointing at a tracked issue, not an explanation of the current change, so it falls outside the cited comment rule; noted for owner awareness (repo has no other TODO(#N)). |
| 2 | ClaimsList / modal.css comments cite design decision IDs (D8/D9/1d) | resolved | All three references dropped; comments now state the constraint without citing the archiving design doc. |
| 3 | ListDetails.tsx stray double blank line | resolved | Single blank line restored at ListDetails.tsx:26. |
| 4 | Task 10.5 e2e gate unchecked, no deferral rationale | resolved | 10.1–10.5 all marked [x]. Re-verified inline: `npm run lint` zero errors + one tolerated size warning (image-search route, pre-existing); `npx tsc --noEmit` clean. Build/coverage/e2e rest on the owner's checkbox attestation; e2e specs (`claim-lifecycle.auth`, `item-actions.guest`) present in tree. |
| 5 | Task 2.1 wording contradicts shipped D7 behavior | resolved | 2.1 reworded: "viewer manage state scoping superseded by 7.3" — matches shipped all-claims ClaimsList. |

Also verified: tasks 9.1/9.2 flipped [ ]→[x] in the same delta — implementation present in ClaimsList.tsx (stable removable-first partition, INITIAL_VISIBLE/SEE_MORE_STEP bounds) and all four 9.2 assertions exist in PurchaseModalSlot.test.tsx (ordering, initial bound, batching + remaining count, control absent at ≤ bound).

No new findings.

**Verdict:** clear to land
