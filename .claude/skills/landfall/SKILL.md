---
name: landfall
argument-hint: "[change-name]"
description: Land the active OpenSpec change on dev - gate checks, then an owner-chosen verification path. Fast path (no dev verification needed) stages both signed commits for one push with no CI wait; verified path pushes the work commit, waits for green CI and the owner's live click-test, then seals. Runs finalize-spec-purposes before the seal commit, hands off paste-ready commit messages, labels the issue IN PORT (never closes it). State-driven, self-healing, never runs git commit. Use when a change is implemented, reviewed clear, and ready to land, or to resume a landing in progress.
metadata:
  author: list_eddiefamily
  version: '2.0'
---

# /landfall

One command, driven by repository state. Landing a change is two owner-signed commits: the `issue-<N>:` **work commit** (implementation) and the `issue-<N>: archive <change>` **seal commit** (the archived change directory, including its `review.md`, making the spec delta canonical). Whether dev verification happens between them is the owner's call, asked once up front.

**Skills never commit.** At every commit point: stage, state exactly what is ready with the **paste-ready commit message**, and **stop** — the owner signs at the screen. Never run `git commit`; never retry a blocked or unattended signature. Sessions may end at any hand-off; re-invocation resumes from state.

**Landfall docks, never closes.** Bookkeeping labels the issue `IN PORT` — nothing else. Closing is inspection's act — `/close-map`.

## Phase detection — state-driven, self-healing

Determine position from repo state on every invocation (argument optional — resolve the single active change via `openspec list`, ask if several). Never rely on session memory.

| State | Position |
| --- | --- |
| Active change, work uncommitted | Start: gates, then the verification question |
| Work staged/signed but unpushed | Push (fast path: only after both commits are signed) and proceed |
| Work pushed, change dir still active, verified path | Verification wait (CI + live check) |
| Seal staged but unsigned | Re-report the hand-off with the message |
| Seal pushed but bookkeeping incomplete | Finish `IN PORT` labeling silently |
| No active change, nothing pending | Report nothing to land |

Signals: `openspec list --json`, `git status --porcelain`, `git log origin/dev..dev`, `gh run list --branch dev --limit 5`, `gh issue view <N> --json labels`.

**Bookkeeping sweep:** before handling the current change, any invocation that finds a previously-landed issue missing its `IN PORT` label completes that labeling first.

## Gates — all must pass before anything is staged

1. **Review verdict** — `openspec/changes/<name>/review.md` exists and its **latest round's** verdict is `clear to land`. Missing file or any other verdict → stop, name the gate (run `/spec-review` or `/recheck-review`).
2. **Tasks complete** — every item in the change's `tasks.md` is `[x]` (doc-only skip markers count as complete).
3. **`openspec validate <name> --strict`** passes.
4. **Local fast checks** — `npm run lint` (zero errors, zero non-size warnings) and `npx tsc --noEmit`. The full battery is **not** run locally by this skill — CI runs it after the push.

## The verification question — asked once, up front

Ask the owner (AskUserQuestion): **does this change need dev verification (CI + live click-test) before sealing?**

- **No → fast path.** Expected customers: locally-verified changes and doc-only changes that can't affect the battery. Accepted cost: a red CI after the combined push fixes forward against an already-sealed contract.
- **Yes → verified path.** The contract seals only after the change has been seen working live.

## Fast path — two signed commits, one push

1. Stage the change's work (per the owner's staging conventions — never blanket `git add` without confirming scope). Hand off with the paste-ready message `issue-<N>: <summary>`; stop for signing.
2. After the signature: archive the change (`/opsx:archive` semantics; `review.md` travels with it), run `/finalize-spec-purposes` so its repairs ride inside the seal commit, stage the archive move (and any sync/repair output). Hand off with the paste-ready message `issue-<N>: archive <change>`; stop for signing.
3. After both signatures: **one push** (`git push origin dev`) — no CI wait. Report the CI run to watch (`gh run list --branch dev --limit 1`).
4. **Bookkeeping, eagerly now**: flip the issue's label to `IN PORT` (removing `UNDER SAIL`). Never close the issue.

## Verified path — push, verify, then seal

1. Stage the work commit as above, hand off with `issue-<N>: <summary>`, stop for signing.
2. After the signature: push to `dev`, report the CI run to watch. The owner click-tests the live dev deployment while CI runs. Stop here if the session ends — re-invocation resumes at the wait.
3. **CI green** — check the run for the pushed sha. Red → fix forward (below). Pending → report and stop.
4. **Live check** — ask the owner (AskUserQuestion) to confirm the change checks out on the live dev deployment. Not confirmed → stop (or fix forward if it failed).
5. Archive the change, run `/finalize-spec-purposes`, stage the seal commit — hand off with `issue-<N>: archive <change>`, stop for signing.
6. After the signed push: **bookkeeping** — flip to `IN PORT`. Never close the issue.

## Red CI or failed live check — fix forward

Drive the fix in the working tree under the **same** `issue-<N>:` prefix:

- A **bug** → fix, `/recheck-review` round, stage a follow-up commit, hand off, push after signing, re-watch CI.
- A **design realization** (the specced behavior itself should differ) → on the verified path, amend the still-active change's spec delta as part of the fix — cheap because the contract hasn't sealed. On the fast path the contract has sealed — the amendment is the accepted cost of skipping verification.

A change whose fixes ball up into what would be multiple substantial commits should be split into a separate change instead. At most one change is in the apply stage at a time.
