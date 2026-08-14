## Why

A review's findings live in `openspec/changes/<name>/review.md`, keyed by durable
finding ID. After a `findings remain` round, the fix loop is an ordinary
`/opsx:apply` pass that burns down the `## Gates — round <n>` tasks appended to
`tasks.md`. But `/opsx:apply`'s `contextFiles` are built only from **schema
artifacts** (`proposal · specs · design · tasks`) — `review.md` is written by the
`/spec-review` skill, outside the artifact graph, so it is **never** in
`contextFiles`. A fresh-chat fix session therefore reads the terse gate lines with
no access to the findings' severity, `path:line`, citation, or (for an alignment
mismatch) which side to reconcile — all of which live only in `review.md`.

Making `review.md` a first-class schema artifact puts it in `contextFiles`, so
`/opsx:apply` auto-loads it. The naive registration has a structural cost:
`review.md` does not exist until after review, so for the entire pre-review
lifecycle the change reads `isComplete: false` with the `review` artifact
`status: "ready"`, and `/opsx:continue` would route to generating it — but
`review.md` is produced by multi-agent `/spec-review`, not by generation.

The fix is to **scaffold `review.md` at propose time**: an artifact whose
generation emits a near-empty framework (round `0`, TBD header), so the file
always exists (`isComplete` stays true, `continue` never misroutes), and
`/spec-review` **appends** round 1 to it instead of creating it. This also folds
in two in-flight edits to the review family already sitting unstaged.

## What Changes

- **`review` becomes a schema artifact.** A project-local, distinctly-named
  schema `spec-driven-review` at
  `openspec/schemas/spec-driven-review/schema.yaml` (a full copy of the package
  `spec-driven` schema plus a `review` artifact: `generates: review.md`,
  `requires: [tasks]`, `template: review.md`). Selected by name (the `config.yaml`
  `schema:` default and each change's `.openspec.yaml` pin), so the package
  `spec-driven` stays reachable instead of being shadowed; survives `openspec
  update`.
- **Scaffold template** `openspec/schemas/spec-driven-review/templates/review.md` — a
  near-empty framework: the machine-readable header with `round: 0` and empty /
  `TBD` `anchor` and `diff-source`, and no round sections.
- **`rules.review` in `config.yaml`** — a generation guardrail steering propose to
  emit the scaffold verbatim: do not invent findings or rounds; `/spec-review`
  appends round 1.
- **`/spec-review` appends round 1 to the pre-existing scaffold** rather than
  creating `review.md`, filling the header (`round: 1`, real `anchor`,
  `diff-source`). The no-related-change path (no scaffold) is unchanged.
- **`## Gates — round <n>` section gains the restated pre-merge gates and a
  durable-ID pointer** (folds the unstaged `finding-format.md` edit): a numbered
  tasks.md section carrying one item per open `Fix now` finding plus the five
  pre-merge verification gates restated as separate checkable items, under a
  lead-in that points fix sessions to `review.md` Round `<n>` by durable ID.
- **`/adjudicate-review` re-grounds via an explicit `/opsx:explore` invocation**
  (folds the unstaged `adjudicate-review/SKILL.md` edit).
- **Fork-maintenance note** — a durable reminder that `openspec/schemas/` is a
  repo-owned fork to reconcile against the package schema on `openspec update`.

## Capabilities

### New Capabilities

- `review-artifact`: `review.md` is a first-class OpenSpec artifact — registered
  in the project-local schema, scaffolded at propose time (round `0`), and thereby
  auto-loaded into `/opsx:apply`'s `contextFiles` so a fresh-chat fix session sees
  the findings. Covers the schema registration, the scaffold template, the
  `rules.review` generation guardrail, and the fork-maintenance obligation.

### Modified Capabilities

- `spec-review`: the persisted report is **appended** to the pre-existing scaffold
  (round 1 fills the `round: 0` header) rather than created; and the adverse-round
  gate section restates the five pre-merge gates plus a durable-ID pointer to
  `review.md`.
- `adjudicate-review`: the latest-round re-grounding is performed by an explicit
  `/opsx:explore` invocation, not a loose reading pass.

## Impact

- **New:** `openspec/schemas/spec-driven-review/schema.yaml`,
  `openspec/schemas/spec-driven-review/templates/*.md` (fork of the package schema +
  templates, plus the `review` artifact and scaffold).
- **Modified:** `openspec/config.yaml` (add `rules.review`);
  `.claude/skills/spec-review/reference/finding-format.md` and
  `.claude/skills/spec-review/SKILL.md` (append-to-scaffold; gate-section shape);
  `.claude/skills/adjudicate-review/SKILL.md` (explicit `/opsx:explore`);
  `CLAUDE.md` (fork-maintenance note under the trunk-workflow section).
- **Possibly modified:** `.claude/skills/recheck-review/SKILL.md`,
  `.claude/skills/incremental-spec-review/SKILL.md` — verify their round-append
  language still holds when `review.md` always pre-exists.
- **Behavioral:** every change created via propose now carries a `review.md`
  scaffold from birth; `isComplete` is unaffected by review state; `/landfall`'s
  verdict gate still rejects a round-`0` scaffold, so nothing lands unreviewed.
