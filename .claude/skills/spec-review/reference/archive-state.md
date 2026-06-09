# Archive-state classification

Classify the resolved change into one of three states; each sets the contract
agent's framing and the in-PR reconciliation latitude below.

## States

### Active

`openspec/changes/<name>/` with no archive move. The normal pre-archive flow; the
contract agent reads from there. An auto-detected change is read from the active
directory only — never substitute an `archive/` copy for an auto-detected match.

### Type 1 — premature archive

The change lives under `openspec/changes/archive/*-<name>/` (date-prefixed, e.g.
`archive/2026-05-21-add-following-and-history/`) and that archive dir is
**introduced by the diff** — the `openspec archive` move is part of *this* PR and
the dir is absent on the base branch. Its spec delta was synced inside this PR.

### Type 2 — merged archive

The change lives under `openspec/changes/archive/*-<name>/` and **already exists on
the base branch** (the diff does not add it). Its spec delta is canonical — the
expected path when a PR is reviewed after its change was already merged-and-archived.

## Discriminate Type 1 from Type 2 with git

Check against the diff's base (`<base>` = the PR base branch for a `<PR>`
invocation, else `dev`, else the left side of an explicit range):

```bash
# Type 2 (merged) if the archive dir exists on the base; Type 1 (premature) if added by the diff.
git cat-file -e "<base>:openspec/changes/archive/<dir>/proposal.md" 2>/dev/null && echo "Type 2 (merged)" || echo "Type 1 (premature)"
```

Equivalently, the archive path shows as `A` in `git diff --name-status <base>...HEAD` ⇒ Type 1.

**Worked example.** The diff touches `openspec/changes/archive/2026-05-21-add-following/proposal.md`. Run `git cat-file -e "dev:openspec/changes/archive/2026-05-21-add-following/proposal.md"`:

- exits `0` (file exists on base) → **Type 2 merged**; the spec is canonical, contract findings are directional.
- exits non-zero (added by this diff) → **Type 1 premature**; neutral framing, reconciliation capped to sync-neutral edits.

## Reconciliation latitude by archive state

How far past the spec-sync step the change sits caps what a finding's reconciliation
may touch. The governing rule: **you may hand-edit the spec only to the degree the
edit wouldn't have needed the sync you are now bypassing** — pure wording is
sync-neutral, a changed/added/removed SHALL is not.

| State | Framing | In-PR reconciliation |
| --- | --- | --- |
| **Active** | neutral | edit either side freely; the archive step's sync reconciles spec↔canonical later |
| **Type 1 — premature** | neutral | **minor only**: wording/clarity fixes, or fixes affecting only the code being merged. A changed/added/removed SHALL **cannot** be hand-patched (it would bypass the sync that already ran in this PR) — block and route to a fresh `propose→archive` cycle |
| **Type 2 — merged** | directional — code must conform | **no spec-side edits**: conform the code (`Fix now`) **or** open a fresh proposal (`File issue`); block until resolved |

For Type 2, never propose amending the merged spec to make a finding go away — that
bypasses spec-sync; changing canonical requires its own proposal cycle. "Block +
needs a fresh proposal" is not a fourth disposition — it is a `Request changes`
verdict whose reconciliation is a `File issue` (new cycle) rather than an in-PR edit.
