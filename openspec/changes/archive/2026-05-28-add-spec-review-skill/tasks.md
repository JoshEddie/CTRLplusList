## 1. Skill scaffold and metadata

- [x] 1.1 Create `.claude/skills/spec-review/SKILL.md` with frontmatter: `name: spec-review`, an `argument-hint: "<change-name | PR | diff>"`, and a `description` that triggers on spec-driven PR review and names its two differentiators (CLAUDE.md + supporting-doc audit, OpenSpec contract audit).
- [x] 1.2 Write the usage block: `/spec-review [change-name | PR | diff]`, documenting that no argument = current branch vs `dev`, and that the skill is output-only (no PR posting in this version).

## 2. Phase 0 — scope and change resolution (spec: Invocation; Change resolution)

- [x] 2.1 Document diff acquisition for each invocation form: no-arg → branch vs `dev`; PR ref → `gh pr diff`; explicit diff source. Verifiable: each form maps to a concrete command.
- [x] 2.2 Document change auto-detection using `openspec list --json` + commit messages + diffed `openspec/changes/*/specs/**` paths; specify branch name is NOT a primary signal (cite the `issue-69` ↔ `enforce-test-title-lint` mismatch).
- [x] 2.3 Document the ambiguity branch (>1 plausible change → ask user via AskUserQuestion) and the no-match branch (ask user via AskUserQuestion whether to proceed with no contract audit or name a change to review against; on proceed-without, continue with standard + convention phases only).

## 3. Phase orchestration (spec: Multi-agent orchestration)

- [x] 3.1 Instruct the skill to spawn parallel sub-agents (Agent tool) for the three phases — standard-review, convention-audit, contract-audit — in a single message, and to consolidate their returned findings.
- [x] 3.2 Define the structured finding shape each sub-agent returns (phase, file:line, description, severity, citation) so the consolidation step can merge them uniformly.

## 4. Standard-review agent brief (spec: Self-contained standard review)

- [x] 4.1 Inline the four dimensions — security, performance, correctness, maintainability — as the standard-review agent's self-contained brief, with their concrete sub-checks (e.g. injection/auth, N+1/unbounded queries, edge cases/race conditions, naming/duplication).
- [x] 4.2 Add a false-positive guard list (pre-existing issues, linter/typechecker-caught issues, unmodified lines) to the standard-review brief. No in-file lineage-credit note: provenance lives in design.md (Context/D1), not in `SKILL.md` (D1 — avoid re-coupling to the external plugin).

## 5. Convention-audit agent brief (spec: Convention audit follows CLAUDE.md doc-pointers)

- [x] 5.1 Instruct the agent to always audit the diff against root `CLAUDE.md`, and to parse `CLAUDE.md` for "Read X first"-style pointers rather than using a hardcoded filename list.
- [x] 5.2 Define the trigger-gating: read `DATABASE.md` only when the diff touches DB schema/queries; do not load a pointer's doc when its trigger is not hit. Call out the `neon-http` no-transactions rule as a DATABASE.md check. For tests, the absence of test changes is NOT a silent skip: when the diff changes testable behavior with no test, read `TESTING.md` and flag behavior-changed-with-no-test (skip only for non-testable changes like docs/config). Treat a passing coverage gate as non-conclusive and flag coverage gaming: new `c8`/`v8`/`istanbul` ignore directives over real behavior, or code commented out/deleted to dodge coverage instead of being tested or refactored.

## 6. Contract-audit agent brief (spec: Change resolution; Contract audit against the active change)

- [x] 6.1 Instruct the agent to read the resolved change's `tasks.md`, `design.md`, `specs/**/spec.md`: an auto-detected change from `openspec/changes/<name>/` (never substituting an `archive/` copy); an explicitly-named already-archived change from the date-prefixed `openspec/changes/archive/*-<name>/`.
- [x] 6.2 Define the three contract checks: (a) each `[x]` task has matching real work in diff/codebase → false-complete finding when absent; (b) completed work conforms to design/spec SHALLs → conformance finding with citation when violated; (c) undocumented behavior not covered by any task/spec → scope-creep finding.
- [x] 6.3 Instruct the agent to run `openspec validate --strict` for the change and report failures.
- [x] 6.4 Frame the contract checks direction-neutral (design D12): a `[x]`-task/spec vs implementation disagreement is reported as a mismatch, not as "code violates spec", because in a not-yet-archived change the spec and implementation are equally provisional. For an active change the finding proposes both resolution directions (amend the implementation, or amend/relax the task/spec) and the user adjudicates; the directional "implementation must conform" framing applies only when reviewing against an already-merged archived spec.
- [x] 6.5 Classify an archived target by its position relative to the spec-sync step (design D13) using a git check of whether the change's `archive/*-<name>/` dir is on the diff's base or added by the diff: **premature archive** (added by the diff) → direction-neutral but reconciliation capped at sync-neutral edits (wording/clarity or code-only); a significant SHALL change blocks and routes to a fresh propose→archive cycle. **Merged archive** (already on base) → directional (code must conform); a violation resolves only by conforming code or a fresh proposal, never by editing the merged spec, and blocks the PR. Both archived cases skip the active-only `openspec validate`.

## 7. Consolidated report — fixed output contract (spec: Consolidated report with a defined output contract; design D10)

- [x] 7.1 Pin the exact output order in SKILL.md: (1) header `# /spec-review — <change | "no related change">`; (2) 1–2 sentence summary; (3) scope line (diff source + resolved change or "contract audit skipped"); (4) findings grouped standard → convention → contract; (5) "what looks good" bullets; (6) verdict; (7) explore-handoff prompt. Verifiable: the order is enumerated literally in the skill.
- [x] 7.2 Pin the finding-table style: columns `# | Severity | Location | Finding | Disposition | Citation`. Severity = text labels `Critical`/`Major`/`Minor`, no emojis. Location = `path:line`. Citation links the line and (convention/contract) the doc rule or SHALL.
- [x] 7.3 Pin per-finding `Disposition` ∈ `Fix now` / `File issue` / `Drop` (design D7); specify `File issue` is reserved for out-of-scope findings sizable enough for their own change cycle, and that fix-cost never changes the disposition (design D8). Wording rule: terse, factual, cite-don't-editorialize. For a contract **mismatch** finding, `Fix now` means reconcile in this PR by editing either side — implementation or task/spec (design D12); no fourth disposition is added.
- [x] 7.4 Add the diagram rule: encourage an ASCII diagram for a finding when it conveys a relationship (flow, state machine, dependency/task↔work mapping, before/after) faster than prose; forbid decorative diagrams. Include a short worked example in the skill so the bar is concrete.
- [x] 7.5 Define the verdict line incl. clear-to-archive logic: verdict keyed off dispositions (`Request changes` iff any open `Fix now`, else `Approve`; `File issue`/`Drop` don't block; severity doesn't override). Clear-to-archive only when all tasks `[x]`, `openspec validate <name> --strict` passes, and no open false-complete/conformance findings; otherwise list the blocking items.
- [x] 7.6 Update the worked-example diagram to show a contract mismatch as a bidirectional disagreement (artifacts disagree) rather than a one-directional "code violates spec" arrow, reinforcing the D12 neutral framing.
- [x] 7.7 Pin the archive-gate verdict strings for all change states (design D13/S1): active or premature archive → clear-to-archive line (premature archive notes validate N/A, and a significant-deviation finding reads `not yet clear — needs a fresh propose→archive cycle`); merged archive → `already archived`, with an open conformance violation forcing `Request changes` + `blocked — violates merged spec <name>; needs implementation conformance or a fresh proposal`; no contract audit → `no archive gate (contract audit skipped)`.

## 8. Post-review explore handoff (spec: Optional explore-mode handoff; design D9)

- [x] 8.1 Make the final output line a single opt-in prompt offering to enter OpenSpec explore mode to recommend which findings to fix and weigh how each fix lands (pros/cons). Wording rewordable; suggested: "Would you like me to enter OpenSpec explore mode to investigate these findings — recommend which to fix, and weigh how each fix would land (pros/cons)?"
- [x] 8.2 Specify the handoff never auto-runs: enter explore mode (carrying the findings as context) only on an explicit yes; on decline or no response, end the review.

## 9. Verification

- [x] 9.1 Dry-run `/spec-review` against the current branch (this very change) and confirm: it resolves `add-spec-review-skill`, runs all three phases, and emits a consolidated report whose sections, table columns, severity labels, and dispositions match the §7 contract, ending with the verdict and the handoff prompt.
- [x] 9.2 Dry-run a no-related-change scenario (or simulate one) and confirm the contract audit skips gracefully while standard + convention phases still report.
- [x] 9.3 Confirm the handoff prompt does not auto-enter explore mode: it waits for input, enters only on explicit yes, and ends the review on decline/no-response.
