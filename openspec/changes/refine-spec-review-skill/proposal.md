## Why

`spec-review/SKILL.md` is a single ~390-line file in which the three sub-agent
briefs (standard-review, convention-audit, contract-audit) live inline as
sections, even though each is consumed by a separate, disjoint sub-agent
context that never sees `SKILL.md`. The orchestrator therefore permanently
carries ~140 lines of checklists it never executes, and its job (dispatch,
Phase 0, consolidation, verdict) is buried under three deep briefs that belong
to other agents. The existing `spec-review` spec already guarantees the
*standard-review* dimensions are "defined within the skill itself" (resilient
to external-plugin change); the same self-containment guarantee should hold for
all three briefs as we factor them out — they must become bundled leaf files,
not separately-invocable skills.

## What Changes

- Split the standard-review, convention-audit, and contract-audit briefs out of
  `SKILL.md` into one bundled leaf file per sub-agent under the skill directory.
- **Expand** each brief once extracted, rather than porting it verbatim. Inline,
  the briefs were terse because every token sat in the orchestrator's context on
  every run; pointer delivery removes that tax, so each brief is rewritten for
  the quality of its sub-agent's output — adding few-shot worked findings,
  calibration pairs (flag-this / don't-flag-this near-misses), and walked
  decision procedures for ambiguous calls. Expansion is gated by a removal bar:
  every added sentence must change what the sub-agent flags or how it writes a
  finding, else it is cut (the repo's comment policy, applied to brief prose).
- Generalize the self-containment guarantee: **all three** sub-agent briefs SHALL
  be defined within the skill (bundled files), not factored into separately
  `/`-invocable skills — extending the protection currently speced only for
  standard-review.
- Deliver each brief to its sub-agent by **pointer** (path + diff + resolved
  change name + archive state), not by embedding the brief text into the Agent
  prompt, so brief detail lives only in the consuming sub-agent's context.
- Extract the two cross-context shared contracts to a single source each: the
  structured finding shape (stamped into each agent prompt by the orchestrator)
  and the archive-state definitions + reconciliation-latitude table (one home,
  referenced by both the contract brief and the verdict logic).
- `SKILL.md` retains only the orchestrator's job: dispatch, Phase 0, the
  finding-shape contract, consolidation, and the verdict / clear-to-archive
  logic.

The change touches two distinct layers. The **output contract** — invocation,
audited dimensions, the fixed report shape (section order, finding-table columns,
text-label severities, dispositions), verdict rules, and the explore-mode handoff
— is preserved unchanged. The **finding content** within that contract is
expected to improve as the briefs expand; that is the point of the expansion, not
a regression.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-review`: add a self-containment requirement covering **all** sub-agent
  briefs — each brief is defined within the skill as a bundled file and is not
  factored into a separately invocable skill, so the skill takes no runtime
  dependency on an external skill for any of its review phases. This extends the
  principle currently speced only for the standard-review dimensions ("Self-
  contained standard review") without altering that existing guarantee.

## Impact

- Skill files only, under `.claude/skills/spec-review/`: `SKILL.md` plus three
  new bundled brief files and (per design) a shared finding-shape / archive-state
  reference. No application code, DB schema/queries, UI primitives, server
  reads, or cache tags are touched — the cross-cutting design-system and
  cache-tag rules do not apply to this change.
- Active spec touched: `openspec/specs/spec-review/spec.md` (one requirement
  modified). Binding inherited constraint: the existing "Self-contained standard
  review" requirement, which this change generalizes rather than weakens.
