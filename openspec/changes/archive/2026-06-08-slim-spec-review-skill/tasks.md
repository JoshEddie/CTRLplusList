## 1. Density pass (design D1)

- [x] 1.1 Tighten `SKILL.md` prose: cut rationale-for-a-rule, structural meta-commentary, and reassurance restating a one-line rule; keep calibration (tighten wording only). Gate every cut by the removal bar — a sentence stays only if removing it changes what the model flags or how it writes a finding/verdict
- [x] 1.2 Apply the same density pass to `standard-review-brief.md`, `convention-audit-brief.md`, and `contract-audit-brief.md`
- [x] 1.3 Confirm no instruction or calibration distinction was dropped — diff the tightened prose against current behavior, not just word count

## 2. Extract shared contracts to leaf reference files (design D2, D3)

- [x] 2.1 Move the archive-state classification (states, git discrimination, reconciliation-latitude table) into a terminal leaf `reference/archive-state.md` (no outbound references)
- [x] 2.2 Move the finding shape, finding-table style, disposition definitions, and diagram rules into a terminal leaf `reference/finding-format.md` (or merge with 2.1 per final size)
- [x] 2.3 Rewire `SKILL.md` to keep only thin orchestrator hooks (column order, no-emoji, disposition→verdict and archive-state→gate mappings) and link each leaf one level deep; rewire each brief to link the leaf it needs directly, deleting the brief→`SKILL.md` back-reference
- [x] 2.4 Confirm no entry-point reference is two deep and every leaf is terminal (`SKILL.md`→leaf and brief→leaf only; leaves reference no further file)

## 3. Navigation and consistency cleanups

- [x] 3.1 Add a short contents/navigation block to the top of `SKILL.md`
- [x] 3.2 Add a table of contents to any bundled file over 100 lines (at minimum `standard-review-brief.md`, and any `reference/*.md` that exceeds it)
- [x] 3.3 Terminology consistency pass — standardize "sub-agent" / "agent" / "phase agent" to one term across `SKILL.md`, the briefs, and the reference files

## 4. Evaluation scenarios (design D5)

- [x] 4.1 Author a false-complete contract-mismatch evaluation (a `[x]` task with no implementing work → not-clear-to-archive), in the doc's `query` + inputs + `expected_behavior` shape, bundled under the skill
- [x] 4.2 Author a merged-archive (Type-2) conformance-violation evaluation (→ `Request changes`, directional framing)
- [x] 4.3 Author a clean-PR evaluation (no `Fix now` findings → `Approve`, clear to archive)

## 5. Verify the change

- [x] 5.1 Confirm `SKILL.md` body is under 500 lines and carries only the orchestrator's job
- [x] 5.2 Run `/spec-review` against a known diff; confirm the output contract is unchanged — section order, finding-table columns, text-label severities, dispositions, verdict / clear-to-archive logic
- [x] 5.3 Confirm the three evaluation scenarios describe the correct expected behavior for their inputs

## 6. Pre-merge verification

No application code, schema, or tests are touched by this change (skill files
only); the five gates below are run as a regression check. This change merges
directly to `dev` with no PR and no CI run, so all five gates — including the
three heavy ones — were run locally and must pass before merge.

- [x] 6.1 `npm run lint` — eslint passes with zero errors (0 errors; the 2 warnings are pre-existing in `Avatar.tsx` / `seed-dev-users.ts`, untouched by this change)
- [x] 6.2 `npx tsc --noEmit` — typescript reports zero errors
- [x] 6.3 `npm run build` — next build completed successfully (exit 0)
- [x] 6.4 `npm run test:coverage` — vitest passed (1999 passed, 0 failed)
- [x] 6.5 `npm run test:e2e` — playwright passed (18 passed)
