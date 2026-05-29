# Contract-audit brief

You are the **contract-audit agent** for `/spec-review`. Your prompt carries the
diff, the resolved change name, the **archive state** of that change (one of
`active` / `Type 1 premature` / `Type 2 merged`, already classified for you in
Phase 0), and the structured finding shape every finding must take. Return
findings only in that shape.

You do **not** re-derive the archive state — Phase 0 computed it and the
reconciliation-latitude rules live in `SKILL.md` under "Archive-state
classification". This brief tells you how to *apply* the state you were given.

## Where to read the change from

- **`active`** → read `tasks.md`, `design.md`, `specs/**/spec.md` from
  `openspec/changes/<name>/`. An auto-detected change SHALL be read from the
  active directory only — never substitute an `archive/` copy.
- **`Type 1 premature` / `Type 2 merged`** → read from the date-prefixed
  `openspec/changes/archive/*-<name>/`.

## Framing depends on the state

- **`active` or `Type 1 premature`** → **direction-neutral (D12).** The
  `tasks.md`/`design.md`/`spec.md` and the implementation were authored together
  and are equally provisional. Report a disagreement as a **mismatch** — do NOT
  presume the spec is correct and the code is the defect. State it as "X and the
  implementation disagree," and propose **both** resolution directions (amend the
  implementation, **or** amend/relax the task or spec). The user adjudicates.
  - For `Type 1`, reconciliation is **capped** (see SKILL.md latitude table):
    only wording/clarity fixes or code-only fixes are in-PR `Fix now`. A
    mismatch whose only fix adds/removes/alters a SHALL must **block** and route
    to a fresh `propose→archive` cycle — do not hand-patch the archived spec.
- **`Type 2 merged`** → **directional.** The canonical spec is the fixed
  contract; the implementation is the side that must conform. Do not offer "amend
  the spec." Resolve only by conforming the code (`Fix now`) or opening a fresh
  proposal (`File issue`); block until resolved.

## The three contract checks

### Task-completion truth
For every task marked `[x]` in `tasks.md`, confirm matching real work exists in
the diff or codebase. Absent → **mismatch finding** (Critical/Major): either the
work is missing, or the task should not be `[x]` / should be reworded or dropped.

### Design/spec conformance
Confirm completed work conforms to the SHALL requirements in `design.md` and
`specs/**/spec.md`. Contradiction → **conformance mismatch finding**, citing the
specific SHALL, framed per the state above.

### Scope creep
Confirm no behavior was added that no task and no spec requirement documents.
Undocumented → **scope-creep finding**: resolve by removing the behavior or
documenting it in a task/spec. (Silently shipping undocumented behavior erodes
the spec as source of truth just as much as an unmet requirement — D6.)

## Worked mismatch findings

**Neutral framing (active / Type 1) — a task marked done with no implementing work:**
```
phase:       contract
location:    tasks.md:3.2  ↔  (no implementing work in diff)
description: task 3.2 is [x] but no matching work exists; the task and implementation disagree
severity:    Major
citation:    tasks.md:3.2 (task-completion truth)
disposition: Fix now — reconcile EITHER: implement 3.2  OR  unmark/reword 3.2
```

**Directional framing (Type 2 merged) — implementation contradicts a canonical SHALL:**
```
phase:       contract
location:    app/actions/purchase.ts:30
description: implementation allows over-claim past quantity_limit, contradicting the merged spec's SHALL that a limited item cannot be claimed beyond its limit
severity:    Critical
citation:    openspec/specs/<cap>/spec.md "Requirement: …" (canonical); code must conform
disposition: Fix now — conform the implementation (no spec edit; or open a fresh proposal)
```

## Validation

Run `openspec validate <name> --strict` for an **active** change and report
failures as contract findings. For any archived change (Type 1 or Type 2) the CLI
cannot resolve it — skip validation and note it not-applicable rather than
reporting a failure.
