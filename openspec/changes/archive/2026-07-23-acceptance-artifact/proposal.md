# Acceptance Artifact

## Why

Spec `#### Scenario:` blocks are atomic per-fact assertions; nothing forces them
to compose into a continuous, reachable user journey. Missing connective tissue
between individually-true scenarios — including links living in other
capabilities' canonical specs — is a defect class no review arena or artifact
currently sees. The owner's pre-landfall click-test and `/port-inspection`'s
map-wide e2e scout also lack a per-change statement of user-visible acceptance
flows. (GitHub issue #291; map #289 adjudication in scout #290.)

Inherited constraints from active specs:

- `review-artifact` governs the fork schema (`openspec/schemas/spec-driven-review/`):
  distinct schema name, propose-time scaffolding pattern, reconciled-fork duty.
  Its "SHALL NOT be listed in `apply.requires`" requirement is stale — issue-276
  landed `apply.requires: [tasks, review]` without a spec delta; this change
  folds in the fix.
- `map-workflow` owns `/port-inspection` and the scout's input enumeration, so
  the e2e-scout change carries a MODIFIED delta there.

## What Changes

- Register a new `acceptance` artifact in the fork schema: `generates:
  acceptance.md`, `requires: [specs]`, `templates/acceptance.md`, and
  `apply.requires` → `[tasks, review, acceptance]` so `/opsx:apply` auto-loads
  it as context.
- Content contract: uniform chained **Given / When / (And…) / Then**
  user-journey flows; `Given` carries viewer/precondition state; per-flow
  granularity chains however many scenarios the journey spans; requirements
  with no human-observable surface are marked "no manual path — fully
  automated", never forced into a flow.
- Lifecycle: propose-time draft chains touched scenarios plus pre-existing
  links greped from canonical `openspec/specs/**/spec.md` (a spec-completeness
  probe — gaps found fold back into the change's delta specs); apply-time
  refines the same flows with literal handles (real button text, routes) —
  refine, not rewrite. No enforcement checkbox; the schema's `apply`
  instruction frames acceptance.md as the end-state picture to implement
  toward.
- Content contract lives in the artifact's schema instruction (fork is
  repo-owned; config.yaml rules are for global/cross-schema overrides).
- `/port-inspection` e2e scout walks archived `acceptance.md` files as its
  primary behavior source, newest-first, with summary-comment/commit
  reconstruction as fallback for chunks lacking one; archives are
  point-in-time, so on mismatch with the live app current canonical specs
  adjudicate and only a spec-confirmed mismatch is a finding.
- Fix stale `review-artifact` requirement to match landed
  `apply.requires: [tasks, review]`.

Explicitly out of scope (rejected at map adjudication): any `/landfall` change
(stays a pure yes/no gate), walk-recording tasks.md checkbox, test-plan content
(scenario→test-layer mapping), GWT migration of the spec corpus, any coupling
to review arena T.

## Capabilities

- **New Capabilities**: `acceptance-artifact` — owns the artifact's existence,
  propose-time scaffold/draft, schema registration, and lifecycle; flow content
  consumption stays with consumers (owner's pre-landfall walk,
  `/port-inspection` e2e scout).
- **Modified Capabilities**: `review-artifact` — replace the stale "review
  SHALL NOT be listed in `apply.requires`" requirement with the landed
  contract (review listed in `apply.requires`, never blocking); the auto-load
  SHALL stays in its own existing requirement. `map-workflow` — the e2e
  scout's input enumeration becomes replacement-with-fallback: archived
  `acceptance.md` primary, summary/commit reconstruction only for chunks
  lacking one.

## Impact

- `openspec/schemas/spec-driven-review/schema.yaml` — new artifact block,
  `apply.requires`, apply instruction line.
- `openspec/schemas/spec-driven-review/templates/acceptance.md` — new template.
- `.claude/skills/port-inspection/SKILL.md` — e2e scout reads archived
  acceptance.md with the hint-not-truth caveat.
- Fork reconciliation duty grows by one pure-addition artifact (like `review`).
- Doc-only change: no executable code touched.
