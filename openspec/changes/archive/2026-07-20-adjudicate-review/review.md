---
review: spec-review
target: adjudicate-review
anchor: 5076d913a693515434633dd73f4e6650769860d7
diff-source: git diff --staged
round: 1
---

## Round 1 — spec-review (2026-07-20)

Skill/markdown-only change; clean contract alignment overall. One open scope-creep finding: an unrelated `embark/SKILL.md` edit rode along without a task, spec delta, or proposal-Impact entry.

**Scope:** git diff --staged · adjudicate-review (active)

### Standard
_none_

### Convention
_none_

### Contract
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| k1 | Minor | `.claude/skills/embark/SKILL.md:57` | New paragraph "Map tracking is a sailing duty, not `/anchor`" is thematically unrelated to the adjudication change: no `tasks.md` task authorizes it, no spec delta documents it, and the proposal's Impact "Skills:" list omits embark (names only adjudicate-review, spec-review, finding-format.md, recheck-review, landfall). The proposal's "Map re-sync (follow-up)" bullet discusses the concept but frames it as a follow-up re-sync of map #269, not an embark SKILL edit. Resolve by removing the edit OR documenting it in a task + spec delta and the Impact list. | Fix now | scope creep — normative behavior added that no task/spec-delta covers; proposal.md Impact omits embark |

### What looks good
- tasks.md 6.4/6.5 skip markers carry explicit doc-only rationale, matching CLAUDE.md's two-test-gate skip allowance for markdown/skills/specs changes.
- landfall + trunk-workflow deltas align: SKILL edit wording matches the MODIFIED requirement's effective-verdict language, with a covering scenario.
- Durable finding-ID scheme and `### Adjudications` reader rule are specified once in the shared `finding-format.md` and referenced (not duplicated) by the reader skills — single-source, per the DRY discipline.

**Verdict:** findings remain — not yet clear to archive (blockers: open Fix-now finding k1; CI unverified — non-PR staged review, no CI to read). All 19 tasks `[x]` and `openspec validate --strict` reported passing (task 5.1), but the scope-creep finding must resolve before archive.

### Adjudications (2026-07-20)

| # | Old → New | Rationale |
|---|-----------|-----------|
| k1 | Fix now → Drop | Owner-settled: harmless within-scope clarification riding along; the edit corrects a real drift (set-sail recommending `/anchor` to sync a map, per propose). A standalone map/issue for a one-paragraph skill note is theater. Edit stays as-is; no task/spec-delta added. |

**Verdict:** clear to land

---
To adjudicate these findings, run `/adjudicate-review adjudicate-review` (a fresh session is recommended) — it re-grounds every disposition in the cited code, interviews you one finding at a time, and records any changes back into `review.md`.
