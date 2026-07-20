## 1. Extend the shared contract (finding-format.md)

- [x] 1.1 In `.claude/skills/spec-review/reference/finding-format.md`, define the durable finding-ID scheme: `<arena-letter><global-round-integer>` (`s` standard / `c` convention / `k` contract), the integer incrementing globally across all arena tables within a round so each ID is unique per round; merges join IDs with `+` (`s1+c3`). Update the finding-table column doc so column 1 is the ID.
- [x] 1.2 Add the `### Adjudications (<date>)` subsection structure — nested inside `## Round N`, columns `# | Old → New | Rationale`, a `**Verdict:**` line beneath — and state it is written only when ≥1 disposition changes (or findings merge), never rewriting the round's findings table or any prior round, and never creating a new round or bumping `round:`.
- [x] 1.3 Add the as-amended reader rule: a round's **effective findings** = its table with each finding's disposition overridden by the latest `### Adjudications` entry for that ID; its **effective verdict** = the last verdict-bearing line in the round (Adjudications line overrides the round's `**Verdict:**`); an Adjudications subsection alone can make the effective verdict `clear to land`.
- [x] 1.4 Make the round structure self-contained: state that findings, "what looks good", the verdict, and any Adjudications all nest at `###` inside `## Round N` (nothing at `##` belongs to a round), and that the round's `**Verdict:**` line is the round vocabulary (`clear to land`/`findings remain`) — so the Adjudications override has a well-defined anchor and is genuinely last-in-round.

## 2. Author the /adjudicate-review skill

- [x] 2.1 Create `.claude/skills/adjudicate-review/SKILL.md` with frontmatter (name, argument-hint `<change>`, description) matching the `<verb>-review` family conventions.
- [x] 2.2 Specify invocation + target resolution: `/adjudicate-review <change>` reads only `openspec/changes/<name>/review.md`; no-arg resolves the single active change with a `review.md` (asks the owner when several qualify). State it reads `finding-format.md` for format only — no runtime dependency on the `spec-review` skill (cite `/recheck-review`'s precedent).
- [x] 2.3 Specify the concise re-grounding pass over the latest round's findings (Drops included), treating persisted dispositions as proposals to confirm or reopen.
- [x] 2.4 Specify the `grill-me`-driven interview: one finding or merge-group per `AskUserQuestion`, each naming its finding ID(s) with re-grounded evidence and a recommended disposition.
- [x] 2.5 Specify the write step: append `### Adjudications` (only-on-change) per §1.2, compute and write the recomputed effective verdict; when nothing changed, write nothing and say so. No commits, no staging.

## 3. Repoint spec-review's handoff

- [x] 3.1 In `.claude/skills/spec-review/SKILL.md`, replace the "Post-review explore handoff" section: the final line becomes a pointer to `/adjudicate-review <change>` (fresh-session recommended); remove the in-context explore-mode entry. Confirm nothing new is invoked (no-external-dependency invariant intact).
- [x] 3.2 Update the consolidated-report contract in the same file: finding-table column 1 is the durable ID; item (7) of the fixed output order is the `/adjudicate-review` pointer.
- [x] 3.3 Update the "Persist the report" section: the persisted form is a self-contained round (title → `## Round 1`, sections demote to `###`, no `## Findings` wrapper) ending in a round-vocab `**Verdict:**` line, mapping the session verdict `Approve → clear to land` / `Request changes → findings remain` (blockers after). Reflect the same in the spec-review delta's persistence requirement.

## 4. Teach the readers to read as-amended

- [x] 4.1 In `.claude/skills/recheck-review/SKILL.md`, change "each open `Fix now` finding in the latest round" to read the latest round **as amended** by its `### Adjudications` subsection; reference prior findings by durable ID; state re-dispositioned findings are not re-litigated.
- [x] 4.2 In `.claude/skills/landfall/SKILL.md`, change the review-verdict gate to the **effective** latest verdict (latest round as amended by any `### Adjudications` subsection), so an adjudication that clears the findings satisfies the gate on its own.

## 5. Validate & finalize

- [x] 5.1 `openspec validate adjudicate-review --strict` passes.
- [x] 5.2 Verify the deltas match the current spec headers exactly (spec-review, recheck-review, trunk-workflow) — no silent MODIFIED mismatches at archive time.

## 6. Pre-merge verification

This change is skill/markdown-only — it touches no `app/**`, `lib/**`, `hooks/**`, `db/**`, `scripts/**`, `e2e/**`, tests, or config that the gates exercise. The two test gates are marked skipped with that rationale; the three static gates still run because they lint/scan the tree.

- [x] 6.1 `npm run lint` — zero errors, zero non-size warnings.
- [x] 6.2 `npx tsc --noEmit` — zero errors.
- [x] 6.3 `npm run build` — completes successfully.
- [x] 6.4 `npm run test:coverage` — **skipped**: no executable file changed; only `.claude/skills/**` and `openspec/**` markdown are touched, which no test exercises.
- [x] 6.5 `npm run test:e2e` — **skipped**: same rationale; no runtime, route, or UI surface changed.
