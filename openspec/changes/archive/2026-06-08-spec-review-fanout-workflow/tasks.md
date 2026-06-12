## 1. Define the finding schema and workflow scaffold

- [x] 1.1 Define the structured finding JSON Schema, single-sourced from the existing finding shape in `SKILL.md` (`phase`, `location`, `description`, `severity`, `citation`, `disposition`); it is consumed by both the audit agents' schema-validated output and the skill's consolidation
- [x] 1.2 Create the bundled workflow script under `.claude/skills/spec-review/` with its `meta` block (name, description, `phases: [Audit]`), invoked by the skill via `scriptPath`

## 2. Implement the workflow fan-out (design D3, D4)

- [x] 2.1 Run the standard-review, convention-audit, and contract-audit agents concurrently in a single `parallel` fan-out, each reading its bundled brief by pointer (paths from `args`) plus the review inputs (diff source; and for contract, the resolved change name and archive state), each returning findings via the 1.1 schema
- [x] 2.2 Flatten the agents' schema'd findings and return `{ findings, deferredToCI }`; no second stage — no verification, judging, or filtering of findings inside the workflow
- [x] 2.3 Skip the contract phase when the skill resolved to no related change (Phase 0c proceed-without), matching the existing "contract audit skipped" path

## 3. Rewire SKILL.md to invoke the workflow

- [x] 3.1 Replace the inline parallel Agent-tool fan-out in the Phase-orchestration step with a Workflow invocation, passing resolved inputs (diff source, resolved change name, archive state, bundled brief paths) via `args`; note the bounded fan-out + opt-in at the call site (design D5)
- [x] 3.2 Consolidate from the workflow's returned findings (each a validated object in the finding shape) into the report (design D3)
- [x] 3.3 Confirm Phase 0 (including `AskUserQuestion` resolution), the CI read, the verdict / clear-to-archive logic, and the explore-mode handoff remain in the skill — unchanged and outside the workflow
- [x] 3.4 Confirm every brief pointer passed to the workflow resolves to an existing bundled file (no pointer drift), and that the three existing brief files are otherwise unchanged

## 4. Verify the change behavior (two layers)

> Verified by a manual author run: invoking the modified `/spec-review`
> end-to-end (it spawns the new workflow's agent fan-out) against a real diff —
> done against this change's own `git diff --staged` set before merge.

- [x] 4.1 Ran `/spec-review staged` against the staged diff; output contract unchanged — section order, finding-table columns, text-label severities, dispositions, verdict / clear-to-archive logic all as specified
- [x] 4.2 Findings came back schema-validated (each carries phase/location/severity/disposition in the fixed shape) and consolidated without prose-parsing; no findings filtered or dropped inside the workflow
- [x] 4.3 Interactive paths work skill-side: the two-change ambiguity prompted via `AskUserQuestion`, and the explore handoff was offered as the final line but never auto-run

## 5. Pre-merge verification

No application code, schema, or tests are touched by this change (skill files
only); the five gates below are run as a regression check. This change merges
directly to `dev` with no PR and no CI run, so all five gates — including the
three heavy ones — were run locally and must pass before merge.

- [x] 5.1 `npm run lint` — eslint passes with zero errors (0 errors; the 2 warnings are pre-existing in `Avatar.tsx` / `seed-dev-users.ts`, untouched by this change). The new `.claude/**/*.js` workflow file lints clean.
- [x] 5.2 `npx tsc --noEmit` — typescript reports zero errors (the workflow `.js` is outside the `**/*.ts(x)` include and not imported by app code, so tsc is unaffected)
- [x] 5.3 `npm run build` — next build completed successfully (exit 0)
- [x] 5.4 `npm run test:coverage` — vitest passed (1999 passed, 0 failed)
- [x] 5.5 `npm run test:e2e` — playwright passed (18 passed)
