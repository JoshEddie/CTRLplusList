# Tasks: port-inspection-split

## 1. New skill

- [x] 1.1 Create `.claude/skills/port-inspection/SKILL.md` — frontmatter (`argument-hint: "[map#|issue#]"`, `disable-model-invocation: true`), scoping rules (MAP# walk / chunk# single / no-arg recommend-from-recent-commits), the Walk section (dev-deployment verification, dependents surface via `dependencies/blocking`, close on confirmation, failed-lookup rule), gh-only guardrails

## 2. Slim /close-map

- [x] 2.1 Edit `.claude/skills/close-map/SKILL.md` — walk step delegates to `/port-inspection`'s Walk section (no restated rules), keep leftovers check + map close + only-closer + decision-ticket flagging; update frontmatter description

## 3. Fleet docs + label

- [x] 3.1 Update `.claude/skills/map/reference/label-machine.md` — `IN PORT` row meaning/pointer reflects `/port-inspection` as the inspection route
- [x] 3.2 Update CLAUDE.md § Trunk workflow fleet list — add `/port-inspection`, adjust `/close-map` entry, renumber
- [x] 3.3 Re-point the `IN PORT` label description via `gh label edit "IN PORT"` — "awaiting inspection via /port-inspection"
- [x] 3.4 Re-point `.claude/skills/landfall/SKILL.md` "Landfall docks, never closes" — closing is inspection's act → `/port-inspection` (matches the `trunk-workflow` delta's re-pointed requirement)

## 4. Spec deltas

- [x] 4.1 Verify delta specs validate: `openspec validate port-inspection-split --strict`

## 5. Pre-merge

- [x] 5.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 5.2 `npx tsc --noEmit` — zero errors
- [x] 5.3 `npm run build` — completes successfully
- [x] 5.4 `npm run test:coverage` — zero failing tests (doc-only exemption candidate: skills/markdown/spec files only)
- [x] 5.5 `npm run test:e2e` — zero failing tests (doc-only exemption candidate: skills/markdown/spec files only)
