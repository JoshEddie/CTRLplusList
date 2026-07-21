---
review: spec-review
target: incremental-spec-review
anchor: 697b37bd35a01b164b4ba27d80bcdc595e4d3809
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-07-20)

Clean doc/skills change — renames the "contract" review arena to "alignment" across the review family and adds the `incremental-spec-review` skill + spec deltas. One cross-file drift: the rename missed a referenced reference leaf.

**Scope:** `git diff --staged` · incremental-spec-review (active)

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| _none_ | | | | | |

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B1 | Minor | `.claude/skills/spec-review/reference/archive-state.md:11,41` | Family-wide `contract`→`alignment` rename swept SKILL.md, alignment-brief.md, finding-format.md, evaluations.md — but left `archive-state.md` calling it "the contract agent" (l.11) and "contract findings are directional" (l.41). Both SKILL.md Contents and alignment-brief.md point readers here, so a reader following the pointer hits retired vocab. | Fix now | boundary brief — doc-vs-code drift; disagreement spans files |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| _none_ | | | | | |

**Deferred to CI (alignment):** task 5.3 marks `test:coverage`/`test:e2e` skipped — legit per CLAUDE.md non-executable-change allowance (diff is `.claude/**` + `openspec/**` only, zero `app/lib/hooks/db` source). CI still runs full battery on dev push. No finding.

### What looks good
- Rename applied consistently across active skill files; vocab (arena A/B/C, ID scheme, gate-section contract, verdict wording, recheck→incremental retarget) agrees across SKILL.md, finding-format.md, and delta specs.
- New sub-concepts use real `###`/`####` headings per CLAUDE.md markdown rule; remaining bold-lead bullets are genuine flat enumerations.
- `openspec validate --strict` passes; all 10 tasks `[x]`; MODIFIED requirement headers match live capability specs.

**Verdict:** findings remain — B1 (open Fix now); CI unverified (non-PR invocation — re-check green before archiving).

## Round 2 — recheck (2026-07-20)

B1's fix landed: the family-wide `contract`→`alignment` rename now covers `archive-state.md`. No new findings; delta is doc-side only.

**Scope:** `git diff` (unstaged working tree) · incremental-spec-review (active)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| B1 | `archive-state.md` still used retired "contract" vocab (l.11 "the contract agent", l.41 "contract findings are directional") | resolved | Both sites → "alignment", plus l.3 "contract agent's framing" → "alignment agent's framing". `grep -i contract archive-state.md` now returns zero hits; readers following the SKILL.md / alignment-brief.md pointers land on current vocab. |

**Verdict:** clear to land — B1 resolved, no new `Fix now` findings.
