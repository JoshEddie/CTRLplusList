# Design — acceptance-artifact

## Context

The fork schema `openspec/schemas/spec-driven-review/` already demonstrates the
pure-addition recipe with `review`: one artifact block, one template, one
`rules.*` entry, one `apply.requires` slot. Scout #290 established the
mechanics (`resolveSchema` reads the one schema.yaml whole; `openspec validate
--strict` validates specs/deltas only, so an extra artifact is neither checked
nor rejected). Map #289's adjudication settled content and consumers; the
grilling settled the remainders (spec fix fold-in, port-inspection edit,
capability name, no enforcement checkbox, hint-not-truth staleness rule).

## Goals / Non-Goals

- **Goals**: register `acceptance`; template + rules encoding the GWT flow
  contract and two-phase lifecycle; point `/port-inspection`'s e2e scout at
  archived flows; fix the stale `review-artifact` requirement.
- **Non-Goals**: `/landfall` changes, tasks.md checkboxes, test-plan content,
  GWT in canonical specs, anything arena-T.

## Decisions

### `requires: [specs]`, not `[tasks]`

The draft is a spec-completeness probe — it must run right after delta specs
exist so discovered gaps fold back into them before design/tasks build on the
specs. `review` sits at `[tasks]` because it is a passive scaffold; acceptance
does propose-time work. Alternative (last, like review) rejected: gaps found
after tasks are drafted cost a rework loop.

### Full schema artifact, not a tasks.md section

Scout #290's recommendation (tasks.md "Manual acceptance" section) was
superseded at owner adjudication: the artifact covers an unreviewed defect
class (connective tissue between atomic scenarios, incl. cross-capability),
deserves its own lifecycle and rules, and tasks.md inflation is not free.

### No apply-time enforcement checkbox

`apply.requires` auto-load plus the schema instruction's lifecycle text carry the
refinement duty; the apply instruction frames acceptance.md as the end-state
picture to implement toward. A mandated checkbox is the same theater flavor as
the rejected walk-recording checkbox; stale placeholder handles are visible to
spec-review arenas.

### Archived flows are hints, not truth

Archives get no delta-sync, so a later change can supersede a flow. The
port-inspection scout reads them newest-first as walk scripts and adjudicates
mismatches against current canonical specs — spec-confirmed mismatch is a
finding, superseded flow is discarded. Alternatives rejected: canonical-sync
machinery (new drift surface, near the rejected GWT migration), current-map-only
scoping (cross-map staleness survives within a long map).

### Fold in the review-artifact spec fix

Issue-276 landed `apply.requires: [tasks, review]` without a spec delta;
canonical `review-artifact` still says SHALL NOT. This change edits that exact
schema line, so the MODIFIED delta rides along rather than leaving the corpus
contradicting code.

## Risks / Trade-offs

- [Flow drift inside an active change (specs edited after draft)] → spec-review
  arenas read both; refine-not-rewrite keeps flows cheap to true up.
- [Fork reconciliation burden grows] → pure addition like `review`; recipe
  already documented in CLAUDE.md trunk-workflow.
- [Uniform GWT could be forced onto non-journey requirements] → the "no manual
  path — fully automated" exemption is normative.

## Migration Plan

Doc-only; no deploy or rollback concerns. Existing in-flight changes without
acceptance.md are unaffected until their next artifact generation
(`openspec status` will show `acceptance` as pending only for changes created
after the schema edit; `apply.requires` additions never block because propose
generates the file).

## Open Questions

None — map #289 exit-ready, grilling concluded.
