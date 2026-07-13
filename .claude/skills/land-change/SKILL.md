---
name: land-change
argument-hint: "[change-name]"
description: Land the active OpenSpec change on dev in two phases - gate checks then stage the issue-N work commit for owner signing and push (land phase); after green CI and the owner's live dev click-test, archive the change, stage the archive commit, and run bookkeeping (seal phase). State-driven and resumable; never runs git commit. Use when a change is implemented, reviewed clear, and ready to land, or to resume a landing in progress.
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /land-change

One command, two phases, driven by repository state. Landing a change is two owner-signed commits: the `issue-<N>:` **work commit** (implementation, verified live on the dev deployment) and the `issue-<N>: archive <change>` **seal commit** (the archived change directory, including its `review.md`, making the spec delta canonical). Archive-last is the point: the contract seals only after the change has been seen working live.

**Skills never commit.** At every commit point: stage, state exactly what is ready to commit and with what message, and **stop** — the owner signs at the screen. Never run `git commit`; never retry a blocked or unattended signature. Sessions may end at any hand-off; re-invocation resumes from state.

## Phase detection

Determine phase from repo state on every invocation (argument optional — resolve the single active change via `openspec list`, ask if several):

| State | Phase |
| --- | --- |
| Active change, work not committed/pushed to `origin/dev` | **Land** |
| Work commit pushed, change dir still active | **Seal** (gate on CI + live check inside) |
| No active change, nothing pending | Report nothing to land |

Signals: `openspec list --json` (active changes), `git status --porcelain` (uncommitted work), `git log origin/dev..dev` (signed but unpushed), `gh run list --branch dev --limit 5` (CI state of the pushed sha).

## Land phase

### Gates — all must pass before anything is staged

1. **Review verdict** — `openspec/changes/<name>/review.md` exists and its **latest round's** verdict is `clear to land`. Missing file or any other verdict → stop, name the gate (run `/spec-review` or `/recheck-review`).
2. **Tasks complete** — every item in the change's `tasks.md` is `[x]`.
3. **`openspec validate <name> --strict`** passes.
4. **Local fast checks** — `npm run lint` (zero errors, zero non-size warnings) and `npx tsc --noEmit`. The full battery (build/coverage/e2e) is **not** run locally — CI runs it after the push, in parallel with the owner's click-testing.

### Stage and hand off

Stage the change's work (per the owner's staging conventions — never blanket `git add` without confirming scope), report the ready state with the commit message:

```
issue-<N>: <summary>
```

…and stop for signing.

### After the owner signs

Push to `dev` (`git push origin dev`), then report the CI run to watch:

```bash
gh run list --branch dev --limit 1
```

Land phase ends here. The owner click-tests the live dev deployment while CI runs.

## Seal phase

Entered when the work commit is pushed and the change dir is still active.

1. **CI green** — check the run for the pushed sha. Red → fix-forward (below). Pending → report and stop; re-invoke later.
2. **Live check** — ask the owner (AskUserQuestion) to confirm the change checks out on the live dev deployment. Not confirmed → stop (or fix-forward if it failed).
3. **Archive** — run the OpenSpec archive flow for the change (`/opsx:archive` semantics). `review.md` travels with the archived directory.
4. **Stage the seal commit** — the archive move (and any sync output), message `issue-<N>: archive <change>`, hand off for signing, stop.
5. **After the signed push** — bookkeeping, in order:
   - `/finalize-spec-purposes` (repairs any TBD Purposes from sync/archive),
   - assign the issue to the currently-open milestone (`gh issue edit <N> --milestone <title>`),
   - close the issue (`gh issue close <N>`).

Bookkeeping never runs before the seal commit is signed and pushed.

## Red CI or failed live check — fix forward

The change is still active (spec delta editable) and the issue still open. Drive the fix in the working tree:

- A **bug** → fix, `/recheck-review` round, stage a follow-up commit under the **same** `issue-<N>:` prefix, hand off, push after signing, re-watch CI.
- A **design realization** (the specced behavior itself should differ) → amend the still-active change's spec delta as part of the fix — cheap because the contract hasn't sealed.

Then re-enter the seal wait. A change whose fixes ball up into what would be multiple substantial commits should be split into a separate change instead.

## Resumability

Every stop above is a legitimate session end. On any invocation, re-derive the phase from state — never from memory of a prior session. Examples: owner signed overnight → detect the unpushed signed commit, push, watch CI; session died after archive but before the seal commit was signed → the staged archive move is still there, re-report the hand-off.
