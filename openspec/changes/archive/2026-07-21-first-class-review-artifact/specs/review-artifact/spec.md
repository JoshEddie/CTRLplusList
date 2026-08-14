# review-artifact Specification

## Purpose

`review.md` is a first-class OpenSpec artifact: registered in the project-local
schema and scaffolded at propose time so it exists throughout a change's
lifecycle, which makes it auto-load into `/opsx:apply`'s context and keeps the
artifact graph free of the drag a post-hoc file would cause. This capability owns
the artifact registration, the propose-time scaffold, and the repo-owned schema
fork; the round content written into `review.md` is owned by `spec-review`.

## ADDED Requirements

### Requirement: review.md is a schema-registered artifact scaffolded at propose

The project-local schema fork SHALL register a `review` artifact that
`generates: review.md` and `requires: [tasks]`, in a **distinctly-named** schema
`spec-driven-review` at `openspec/schemas/spec-driven-review/schema.yaml`. Its
generation SHALL emit a near-empty scaffold — the review family's
machine-readable header with `round: 0` and empty or `TBD` `anchor` and
`diff-source`, and no round sections — driven by the artifact template
(`openspec/schemas/spec-driven-review/templates/review.md`) and a `rules.review` entry in
`config.yaml` that forbids inventing findings or rounds. Changes SHALL select this
schema by name (the `config.yaml` `schema:` default and each change's
`.openspec.yaml` pin); the distinct name keeps the package `spec-driven` schema
reachable rather than shadowing it, and the fork survives `openspec update`.

This capability owns the artifact's existence and scaffold; `spec-review` owns the
round content appended into it.

#### Scenario: Propose emits a review.md scaffold

- **WHEN** a change is created and its artifacts are generated through propose
- **THEN** `openspec/changes/<name>/review.md` exists as a `round: 0` scaffold with
  a `TBD`/empty header and no round sections

#### Scenario: The scaffold carries no findings

- **WHEN** propose generates the `review` artifact under `rules.review`
- **THEN** the emitted `review.md` contains no findings and no `## Round` section —
  only the header framework

### Requirement: The scaffold keeps the change lifecycle free of review drag

The `review` artifact SHALL NOT be listed in the schema's `apply.requires`, so it
never blocks apply. Because `review.md` exists from propose onward, the change
SHALL report `isComplete` independent of review state, and `/opsx:continue` SHALL
NOT route to generating `review.md` as pending content during the pre-review
lifecycle.

#### Scenario: Pre-review status is unaffected by the review artifact

- **WHEN** a change has completed `tasks` but has not yet been reviewed
- **THEN** its status is `isComplete: true` with the `review` artifact resolved
  (its scaffold present), and `/opsx:continue` does not offer to generate
  `review.md`

### Requirement: review.md is auto-loaded into apply context

Because `review` is a schema artifact, `/opsx:apply`'s `contextFiles` SHALL
include `review.md` whenever the file exists, so a fix session — including one in a
fresh chat burning down a `## Gates — round <n>` section — reads the round's
findings without a manual pointer.

#### Scenario: A fix session sees the findings

- **WHEN** `/opsx:apply` runs on a change whose latest round left open `Fix now`
  findings
- **THEN** `review.md` appears in the apply instructions' `contextFiles`, giving the
  session the findings' severity, location, citation, and disposition

### Requirement: The project-local schema is a reconciled fork

`openspec/schemas/` SHALL be treated as a repo-owned fork of the package
`spec-driven` schema. On `openspec update`, the fork SHALL be reconciled against
the updated package schema so it does not silently drift, and this obligation SHALL
be recorded in a durable repo doc.

#### Scenario: Update reconciliation is documented

- **WHEN** `openspec update` changes the package `spec-driven` schema
- **THEN** a durable repo doc directs the maintainer to reconcile
  `openspec/schemas/spec-driven-review/` against it (copy-forward or diff-and-merge)
