---
review: spec-review
target: port-inspection-split
anchor: c4884e2
diff-source: git diff --staged
round: 1
---

# /spec-review — port-inspection-split

Clean doc/skill-only split of `/close-map` into `/port-inspection` (walk) + `/close-map` (close). One open blocker: the change re-points `/landfall`'s inspection cross-reference in the spec delta but not in the skill file that sentence governs.

**Scope:** `git diff --staged` (10 files, 240 lines, markdown/skills/specs only) · port-inspection-split (active)

## Round 1 — spec-review (2026-07-15)

### Findings

#### Standard

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| — | — | — | _none_ | — | — |

#### Convention

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| — | — | — | _none_ | — | — |

#### Contract

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| 1 | Major | `.claude/skills/landfall/SKILL.md:16` | Stale pointer / false-complete. The `trunk-workflow` delta rewrites landfall's requirement to "closing is inspection's act (`/port-inspection`, owned by `map-workflow`)", and proposal.md names this re-point explicitly. The edit landed only in the spec delta — the skill still reads "Closing is inspection's act — `/close-map`." No task in `tasks.md` covers it; `landfall/SKILL.md` is absent from the Impact list. All 11 tasks are `[x]`, so the checkboxes assert a completeness the tree does not have. Landing as-is leaves the normative spec and the executable skill contradicting each other on the same sentence. | Fix now | proposal.md "What Changes" / trunk-workflow delta |

### What looks good

- `openspec validate port-inspection-split --strict` passes.
- Task 3.3 verified live: `IN PORT` label description reads "Landed and sealed, awaiting inspection via /port-inspection".
- The `trunk-workflow` delta is wording-only as claimed — diffing the requirement block against the current spec shows only the `/close-map` → `/port-inspection` pointer changing (remaining diff is blank-line formatting).
- D3 (textual delegation) held: `/close-map` cites `/port-inspection`'s Walk section and restates none of its rules, so the drift hazard the design names is actually closed.
- Decision-ticket staleness flagging correctly retained in `/close-map` per the proposal.
- Scoped-out `/close-map` references (`map/SKILL.md:157`, `release-review`) remain accurate under delegation — not findings.

### Verdict

Request changes — not yet clear to archive (blockers: finding 1 open `Fix now`; CI unverified — no PR invocation).

---
Would you like me to enter OpenSpec explore mode to investigate these findings — verify every disposition (Drops included), recommend which to fix, and weigh how each fix would land (pros/cons)?

### Verdict

Minor change fixed, cleared for landing