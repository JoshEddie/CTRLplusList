# /spec-review evaluations

Bundled evaluation scenarios for the gate. No automated runner exists; each
scenario is a hand-checkable source of truth in the `query` + `inputs` +
`expected_behavior` shape. They span the three verdict axes — a contract mismatch,
a merged-archive (directional) conformance violation, and the clean approve path.
Revise them when the skill's behavior intentionally changes.

## 1. False-complete contract mismatch → not clear to archive

```json
{
  "name": "false-complete-contract-mismatch",
  "query": "/spec-review add-quantity-limits",
  "inputs": {
    "diffCmd": "git diff dev...HEAD",
    "diff_summary": "Implements tasks 1.1–3.1 of the active change. tasks.md marks 3.2 ('add a server-side guard rejecting claims past quantity_limit') as [x], but no such guard appears anywhere in the diff or codebase — app/actions/purchase.ts is unchanged on that path.",
    "change": "add-quantity-limits",
    "archiveState": "active",
    "ci": "green"
  },
  "expected_behavior": "A Contract finding: task 3.2 is [x] but no matching implementing work exists; the task and implementation disagree. Framing is neutral (the change is active), so the finding is stated as a mismatch — not 'the code is wrong' — with disposition `Fix now` proposing EITHER resolution: implement the guard OR unmark/reword 3.2; the spec is not presumed correct. The clear-to-archive gate fails on the open false-complete finding even though CI is green, so the verdict is `Request changes — not yet clear to archive (blockers: task 3.2 false-complete)`."
}
```

## 2. Merged-archive (Type 2) conformance violation → Request changes, directional

```json
{
  "name": "merged-archive-conformance-violation",
  "query": "/spec-review 142",
  "inputs": {
    "diffCmd": "gh pr diff 142",
    "diff_summary": "A follow-up PR to a change already merged and archived under openspec/changes/archive/2026-05-21-add-quantity-limits/ (the archive dir exists on the base branch — Type 2). The claim path in app/actions/purchase.ts lets a buyer claim past quantity_limit, contradicting the canonical SHALL that a limited item cannot be claimed beyond its limit.",
    "change": "add-quantity-limits",
    "archiveState": "Type 2 merged",
    "ci": "green"
  },
  "expected_behavior": "A Contract finding framed directionally — the merged spec is the fixed contract and the implementation is the side that must conform; do NOT offer to amend the spec. Disposition `Fix now` (conform the code) or `File issue` (fresh proposal). The clear-to-archive gate is moot (already archived). The verdict is `Request changes — blocked — violates merged spec add-quantity-limits; needs implementation conformance or a fresh proposal`."
}
```

## 3. Clean PR → Approve, clear to archive

```json
{
  "name": "clean-pr-approve",
  "query": "/spec-review 156",
  "inputs": {
    "diffCmd": "gh pr diff 156",
    "diff_summary": "Implements an active change end to end. Every tasks.md item is [x] with matching work in the diff; the design/spec SHALLs are satisfied; no scope creep; tests accompany the changed behavior per TESTING.md; no security/performance/correctness issues. The only observations are a couple of style nitpicks the reviewer judges non-issues.",
    "change": "add-list-archive",
    "archiveState": "active",
    "ci": "green"
  },
  "expected_behavior": "No open `Fix now` findings — the nitpicks are dispositioned `Drop` with a one-line rationale (or omitted). The verdict is `Approve`. The clear-to-archive gate passes on all of: CI green, every task [x], `openspec validate add-list-archive --strict` passes, and no open false-complete or conformance findings — so the archive line reads `clear to archive`. The report still closes with the explore-mode opt-in prompt."
}
```
