# Alignment brief (arena A)

You are the **alignment agent** — arena A of the review. Your prompt carries the
diff command, the resolved change name, and the **archive state** of that change
(one of `active` / `Type 1 premature` / `Type 2 merged`, classified by the
orchestrator). Emit findings in the shape and disposition vocabulary defined in
`.claude/skills/spec-review/reference/finding-format.md`, with `phase: alignment`.

**Scope: the diff your prompt's diff command produces.** Arena A audits the
change's promise — `tasks.md`, `design.md`, `specs/**/spec.md`,
`acceptance.md`, and `openspec validate` — against that delta.

You do **not** re-derive the archive state — the orchestrator computed it; the
states and reconciliation-latitude rules live in
`.claude/skills/spec-review/reference/archive-state.md`. This brief tells you how to
*apply* the state you were given.

## Where to read the change from

- **`active`** → read `tasks.md`, `design.md`, `specs/**/spec.md` and
  `acceptance.md` from `openspec/changes/<name>/`. An auto-detected change SHALL
  be read from the active directory only — never substitute an `archive/` copy.
- **`Type 1 premature` / `Type 2 merged`** → read from the date-prefixed
  `openspec/changes/archive/*-<name>/`.

## Framing depends on the state

- **`active` or `Type 1 premature`** → **direction-neutral.** The
  `tasks.md`/`design.md`/`spec.md` and the implementation were authored together
  and are equally provisional. Report a disagreement as a **mismatch** — do NOT
  presume the spec is correct and the code is the defect. State it as "X and the
  implementation disagree," and propose **both** resolution directions (amend the
  implementation, **or** amend/relax the task or spec). The user adjudicates.
  - For `Type 1`, reconciliation is **capped** (see
    `.claude/skills/spec-review/reference/archive-state.md`):
    only wording/clarity fixes or code-only fixes are in-PR `Fix now`. A
    mismatch whose only fix adds/removes/alters a SHALL must **block** and route
    to a fresh `propose→archive` cycle — do not hand-patch the archived spec.
- **`Type 2 merged`** → **directional.** The canonical spec is the fixed
  contract; the implementation is the side that must conform. Do not offer "amend
  the spec." Resolve only by conforming the code (`Fix now`) or opening a fresh
  proposal (`File issue`); block until resolved.

**Arena boundary:** task-completion truth — including unchecked or
false-complete "add tests" tasks — stays here in arena A. Test quality,
substance, and suite staleness against the changed behavior are arena T's; do
not audit test files or sweep the suite.

## The four alignment checks

### Task-completion truth
For every task marked `[x]` in `tasks.md`, confirm matching real work exists in
the diff or codebase. Absent → **mismatch finding** (Critical/Major): either the
work is missing, or the task should not be `[x]` / should be reworded or dropped.

A `[~]` task explicitly deferred to CI (e.g. a build/typecheck/lint gate the
change records as "verified by GitHub PR CI") is **not** a false-complete — do
not flag it as missing work. Instead, surface it in your return as a
"deferred-to-CI" gate so the orchestrator can confirm it against the actual
check run (the orchestrator reads CI after the agents return; you do not). Judge
only whether the deferral itself is reasonable for the work in scope.

### Design/spec conformance
Confirm completed work conforms to the SHALL requirements in `design.md` and
`specs/**/spec.md`. Contradiction → **conformance mismatch finding**, citing the
specific SHALL, framed per the state above.

### Scope creep
Confirm no behavior was added that no task and no spec requirement documents.
Undocumented → **scope-creep finding**: resolve by removing the behavior or
documenting it in a task/spec.

### Unresolved acceptance markers
`acceptance.md` may carry inline `*TODO:*` markers — handles the planning draft
could not name because the shape did not exist yet (defined in the schema's
`acceptance` instruction). Apply is where the shape exists, so by review time
every marker should have been replaced with the literal handle that landed.

Any `*TODO:*` still present → **mismatch finding**: the change promised a
walkable flow and shipped a hole. Cite the flow and the marker's row. This is a
finding, never a reason to abort the review — the other arenas still run, and
the fix is one row.

An unresolved marker is what a reader hits as *"I cannot walk this, the shape it
says it needs is not here"*. Archived flows are `/port-inspection`'s e2e walk
scripts, so a marker that lands degrades a downstream consumer with no way back.

## Worked mismatch findings

**Neutral framing (active / Type 1) — a task marked done with no implementing work:**
```
phase:       alignment
location:    tasks.md:3.2  ↔  (no implementing work in diff)
description: task 3.2 is [x] but no matching work exists; the task and implementation disagree
severity:    Major
citation:    tasks.md:3.2 (task-completion truth)
disposition: Fix now — reconcile EITHER: implement 3.2  OR  unmark/reword 3.2
```

**Directional framing (Type 2 merged) — implementation contradicts a canonical SHALL:**
```
phase:       alignment
location:    app/actions/purchase.ts:30
description: implementation allows over-claim past quantity_limit, contradicting the merged spec's SHALL that a limited item cannot be claimed beyond its limit
severity:    Critical
citation:    openspec/specs/<cap>/spec.md "Requirement: …" (canonical); code must conform
disposition: Fix now — conform the implementation (no spec edit; or open a fresh proposal)
```

## Validation

Run `openspec validate <name> --strict` for an **active** change and report
failures as alignment findings. For any archived change (Type 1 or Type 2) the CLI
cannot resolve it — skip validation and note it not-applicable rather than
reporting a failure.
