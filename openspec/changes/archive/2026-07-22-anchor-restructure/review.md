---
review: spec-review
target: anchor-restructure
anchor: 4ec4c6775830bc0acb8df361c6860ea3e5ea0d55
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-07-21)

Clean doc-only skill/spec restructure relocating bearing moves out of `/anchor` into the new `anchor-and-run-aground` capability. `openspec validate --strict` passes and all 17 tasks are checked; two Minor cross-reference/attribution gaps remain where the change's rewrite left stale authority wording.

**Scope:** git diff --staged · anchor-restructure (Active)

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1 | Minor | openspec/specs/map-workflow/spec.md:4 | map-workflow **Purpose** still lists "bearing moves (`/anchor`)" among what map-workflow governs, but this change REMOVES the "/anchor SHALL own all bearing moves" requirement and relocates the four bearing moves to `anchor-and-run-aground`. Purpose vs. relocated requirement disagree; no task/delta corrects the Purpose, and finalize-spec-purposes rewrites only TBD stubs — so the stale attribution survives archive. | Fix now | map-workflow delta REMOVED "Requirement: /anchor SHALL own all bearing moves" vs. canonical Purpose `openspec/specs/map-workflow/spec.md:4` |

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B2 | Minor | .claude/skills/map/reference/label-machine.md:11 | UNCHARTED stamper column (and para at :19) credits demote-driven `CHARTED → UNCHARTED` flips only to `/anchor`, listing `/run-aground` solely under discard. But `/run-aground` Step 1 runs `demotion.md` regardless of blast radius (patch/park/discard), and demotion.md step 4 flips dependent chunks `CHARTED → UNCHARTED` — so `/run-aground` also stamps UNCHARTED via its demotion step, not only via discard. Attribution rewritten by this change is incomplete. | Fix now | `label-machine.md:11` & `:19` ↔ `demotion.md:8` (step 4) ↔ `run-aground/SKILL.md:20` (Step 1 runs demotion regardless of blast radius); label-machine's own rule "each lifecycle transition is stamped by the skill that causes it" |

### Convention
_none_

### What looks good
- All three new reference-doc citation targets exist; untouched skills (`/embark`, `/close-map`, `/landfall`, `/adjudicate-review`, `/port-inspection`) carry no stale anchor-triage/thin-wrapper references.
- `/run-aground` correctly registered in CLAUDE.md fleet route and label-machine; deleted `§ GitHub mechanics` leaves no dangling cross-refs.
- Markdown structure follows the titled-concept-gets-a-heading rule; procedural/glossary bullets stay flat as permitted.
- The two test gates (`test:coverage`, `test:e2e`) marked SKIPPED with the explicit non-executable-change rationale CLAUDE.md's § Trunk workflow sanctions — diff touches only `.claude/**`, `openspec/**`, `CLAUDE.md`, no executable change.

**Verdict:** findings remain — blockers: A1 (map-workflow Purpose stale attribution), B2 (label-machine UNCHARTED stamper attribution incomplete). CI unverified (non-PR staged-diff review; the full battery runs on the `dev` push and must be confirmed green before archive).

## Round 2 — recheck (2026-07-21)

Both prior Minor `Fix now` findings resolved by the unstaged fix delta; no new findings introduced.

**Scope:** git diff (unstaged working tree) · anchor-restructure (Active)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A1 | map-workflow Purpose still attributes bearing moves to `/anchor` | resolved | Canonical Purpose `openspec/specs/map-workflow/spec.md:4` drops `bearing moves (\`/anchor\`),` from what map-workflow governs; attribution now matches the relocated requirement. |
| B2 | label-machine UNCHARTED stamper attribution omits `/run-aground` demotion path | resolved | `label-machine.md:11` table now credits `/run-aground` (demote + discard) and `:19` para reads "demote via its always-run Step 1, plus discard"; change's delta spec scenario (`specs/map-workflow/spec.md:73`) updated to match `demotion.md` step 4. |

**Verdict:** clear to land — both open `Fix now` findings resolved, no new `Fix now` findings. CI still unverified; the full battery must be confirmed green on the `dev` push before archive.
