# Tasks — first-class-review-artifact

## 1. Project-local schema fork

- [x] 1.1 Create `openspec/schemas/spec-driven-review/schema.yaml` as a verbatim copy of
      the package `@fission-ai/openspec` `spec-driven/schema.yaml` (proposal, specs,
      design, tasks artifacts + apply block), so the override is a faithful base.
- [x] 1.2 Add a `review` artifact: `generates: review.md`, `requires: [tasks]`,
      `template: review.md`, with a description and an `instruction` noting it is
      produced by `/spec-review`, not generation. Leave `apply.requires` as
      `[tasks]`.
- [x] 1.3 Copy the package `spec-driven/templates/*.md` into
      `openspec/schemas/spec-driven-review/templates/` so the forked schema resolves its
      existing artifact templates.

## 2. Scaffold template + generation guardrail

- [x] 2.1 Author `openspec/schemas/spec-driven-review/templates/review.md` — the
      review-family machine-readable header with `round: 0`, empty/`TBD` `anchor`
      and `diff-source`, and no round sections.
- [x] 2.2 Add `rules.review` to `openspec/config.yaml`: steer propose to emit the
      scaffold verbatim — no invented findings or rounds; `/spec-review` appends
      round 1.

## 3. spec-review skill — append to scaffold + gate section

- [x] 3.1 `.claude/skills/spec-review/SKILL.md` and `reference/finding-format.md`:
      persist round 1 by **appending** to the pre-existing `round: 0` scaffold —
      fill `round: 1`, real `anchor`/`diff-source` — and retain the create path for
      changes with no scaffold / no related change.
- [x] 3.2 `reference/finding-format.md`: the `## <N>. Gates — round <n>` section
      carries the restated five pre-merge gates as separate checkable items and a
      durable-ID lead-in pointing fix sessions to `review.md` Round `<n>` (folds the
      unstaged finding-format edit).
- [x] 3.3 Define the `round: 0` pre-review scaffold header state in
      `reference/finding-format.md` (header contract) so readers treat a
      round-less scaffold as valid pre-review, not malformed.

## 4. Review-family fold + audit

- [x] 4.1 `.claude/skills/adjudicate-review/SKILL.md`: re-grounding invokes
      `/opsx:explore` explicitly (folds the unstaged adjudicate-review edit).
- [x] 4.2 Audit `.claude/skills/recheck-review/SKILL.md` and
      `incremental-spec-review/SKILL.md` for any create-review.md assumption now
      that the file always pre-exists; adjust to append-only where needed.

## 5. Docs

- [x] 5.1 `CLAUDE.md` (trunk-workflow section): record that `openspec/schemas/` is a
      repo-owned fork to reconcile against the package `spec-driven` schema on
      `openspec update`.

## 6. OpenSpec behavior verification

- [x] 6.1 `openspec validate first-class-review-artifact --strict` passes.
- [x] 6.2 Smoke check: create a throwaway change via propose, confirm `review.md`
      scaffolds (`round: 0`), `openspec status` shows `isComplete: true` with the
      `review` artifact resolved, and `openspec instructions apply` lists
      `review.md` under `contextFiles`; then delete the throwaway change.

## 7. Pre-merge

- [x] 7.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 7.2 `npx tsc --noEmit` — zero errors
- [x] 7.3 `npm run build` — completes successfully
- [x] 7.4 `npm run test:coverage` — SKIPPED under doc-only exemption: diff touches
      only `openspec/**`, `.claude/**`, and `CLAUDE.md` (no executable change); CI
      runs the full battery on push
- [x] 7.5 `npm run test:e2e` — SKIPPED under the same doc-only exemption
