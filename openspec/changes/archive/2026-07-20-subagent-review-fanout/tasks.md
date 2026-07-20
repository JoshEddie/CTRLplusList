## 1. Engine conversion

- [x] 1.1 Delete `.claude/skills/spec-review/fanout.workflow.js`
- [x] 1.2 Rewrite `SKILL.md` § Phase orchestration: parallel Agent-tool calls in one message (3 agents, 2 when no change resolved), per-agent prompt carrying identity, brief path, `diffCmd`, phase key, and — contract agent only — `changeName`, `archiveState`, reconciliation-latitude framing, and the deferredToCI instruction
- [x] 1.3 Add the reply-only-JSON instruction to the per-agent prompt (`{"findings": [...], "deferredToCI": [...]}`, fields per `finding-format.md` § Finding shape, `phase` set to own key) and the parse/validate → one SendMessage retry → abort-naming-phase-with-raw-reply convention to the orchestration section
- [x] 1.4 Update `SKILL.md` Contents entry and any remaining Workflow-tool wording (opt-in sentence, workflow-return references) to the subagent engine; consolidation, CI read, report, persistence, and adjudication handoff stay untouched
- [x] 1.5 Update `reference/finding-format.md` § Finding shape sentence: workflow structured-output schema → JSON-reply convention validated by the skill

## 2. Spec delta

- [x] 2.1 Confirm delta at `openspec/changes/subagent-review-fanout/specs/spec-review/spec.md` covers the MODIFIED Multi-agent orchestration requirement (direct sub-agents, JSON replies, retry-once, abort, interactive-steps-in-skill, resolved inputs)
- [x] 2.2 `openspec validate subagent-review-fanout --strict` passes

## 3. Out-of-repo owner step (not part of the diff)

- [x] 3.1 Owner applies `"permissions": {"deny": ["Workflow"]}` in machine-global `~/.claude/settings.json` (no repo file ships; record the "project settings → machine-global" refinement on map #269)

## 4. Pre-merge

- [x] 4.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 4.2 `npx tsc --noEmit` — zero errors
- [x] 4.3 `npm run build` — completes successfully
- [x] 4.4 `npm run test:coverage` — skipped — doc-only change (skills/specs markdown + deleted skill-bundled workflow script; nothing in the diff can affect test outcomes)
- [x] 4.5 `npm run test:e2e` — skipped — doc-only change (same rationale as 4.4); CI on the dev push runs the full battery
