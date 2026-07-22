## Context

`/opsx:apply`'s `contextFiles` are built (openspec `instructions.js`) by iterating
`schema.artifacts` and including each artifact's resolved output files. `review.md`
is not a schema artifact, so it is never included, and a fresh-chat fix session
loses the findings behind terse gate lines. Empirical probing (a throwaway
project-local schema adding a `review` artifact) established both the win and the
cost precisely:

- With `review.md` present, it appears in `contextFiles`, `validate --strict`
  passes, and status stays `isComplete: true`.
- With `review.md` absent, `status.artifacts` shows `review: "ready"` and
  `isComplete: false`, and `instructions review` tries to *generate* it from a
  template — which is wrong, since `/spec-review` (multi-agent) produces it.

The `ArtifactSchema` (openspec `types.js`) has no `optional` / `external` /
non-generated flag — `template` is required and every artifact is generatable — so
the drag is structural, not a knob. The resolution is to make the file always
exist via a propose-time scaffold, collapsing the "absent" case entirely.

## Goals / Non-Goals

**Goals**
- `review.md` in `/opsx:apply` `contextFiles` so fix sessions auto-load findings.
- No lifecycle drag: `isComplete` unaffected, `/opsx:continue` never routes to
  review generation.
- Fold the two unstaged review-family edits into one coherent change.

**Non-Goals**
- Changing how `/spec-review` computes or renders findings (only *where* round 1 is
  written — appended vs created).
- Upstreaming a non-generated-artifact flag to `@fission-ai/openspec` (noted as the
  clean long-term fix, out of scope here).

## Decisions

### Project-local, distinctly-named schema — not a user/package edit or a same-name shadow

`getSchemaDir` resolves a schema by name across project-local
(`openspec/schemas/<name>/`) → user → package. The fork is registered under a
**distinct name**, `spec-driven-review`, at
`openspec/schemas/spec-driven-review/schema.yaml`, and changes select it by name
(`config.yaml`'s `schema:` default for new changes; each change's `.openspec.yaml`
pin). It is repo-owned and survives `openspec update` (which only clobbers the
package dir). **Alternative rejected:** a same-name `spec-driven` override that
*shadows* the package copy — it works, but silently hides the package default
(unreachable) and masks package updates behind the shadow. A distinct name keeps
the package `spec-driven` reachable, makes "which workflow" explicit at every
pin, and turns reconcile-on-update into a deliberate choice rather than a silent
win. **Also rejected:** editing `node_modules` — clobbered on update, violates
the repo's "never hand-edit generated openspec files" rule.

### Full fork, accepted with a reconcile obligation

`resolveSchema` reads one `schema.yaml` whole — no merge/inherit — so adding one
artifact means copying the entire `spec-driven` schema (and its templates) into the
repo. **Alternative rejected:** widening the `tasks` artifact's `generates` glob to
also match `review.md` (avoids a new node) — conflates two unrelated files under
one artifact id, surprising and fragile (KISS). The fork's staleness cost is
handled by a documented reconcile-on-update step, not avoided.

### Scaffold via schema generation (`template` + `rules.review`)

Propose generates the `review` artifact last (`requires: [tasks]`, unlocked after
tasks). The scaffold body is the artifact `template`; `rules.review` in
`config.yaml` is the generation guardrail (verbatim scaffold, no invented findings)
— `rules` is a generic map keyed by artifact id (openspec `project-config.js`), so
`rules.review` injects into the review artifact's instructions exactly as
`rules.tasks` does today. **Alternative considered:** a deterministic file-write in
`/embark` or `/set-sail` instead of LLM generation. Kept in reserve as the fallback
if propose proves unreliable at emitting a verbatim scaffold; the schema-native path
is preferred because it keeps the mechanism in the schema and needs no new skill
step.

### `review` stays out of `apply.requires`

`apply.requires` remains `[tasks]`, so review never gates apply; the `contextFiles`
sweep still includes `review.md` whenever it exists. The scaffold makes "exists"
always true post-propose.

### `round: 0` scaffold header state

The scaffold header carries `round: 0`, empty/`TBD` `anchor` and `diff-source`, and
no round sections. `/spec-review` fills it to `round: 1` with the real anchor on
first append. `/landfall`'s verdict gate rejects a `round: 0` scaffold (no
`clear to land`), so nothing lands unreviewed.

## Risks / Trade-offs

- **Propose embellishes the scaffold** (invents a review) → Mitigation: minimal
  `template` + explicit `rules.review` guardrail; fallback is the deterministic
  skill-write.
- **Fork drifts from the package schema on update** → Mitigation: documented
  reconcile step in `CLAUDE.md`; `openspec validate --strict` in the pre-merge gate
  catches a structurally broken fork.
- **`recheck-review` / `incremental-spec-review` assume review.md is created** →
  Mitigation: audit both; their language is already round-append, so the change is
  expected to be nil-to-small.

## Migration Plan

Existing in-flight changes created before this lands have no scaffold; `/spec-review`
must retain the create path for them. The modified `spec-review` requirement keeps
"append to scaffold if present, else the existing behavior," so old and new changes
both work with no data migration.

## Open Questions

- Does `/opsx:propose` reliably emit the scaffold for the `review` artifact in
  practice, or is the deterministic `/embark` write needed? Resolved by the smoke
  check in tasks (create a throwaway change, confirm the scaffold).
