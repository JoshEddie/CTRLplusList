---
name: landfall
argument-hint: "[change-name]"
description: Land the active OpenSpec change on dev - gate checks, then an owner-chosen verification path. Fast path (no dev verification needed) stages both signed commits for one push with no CI wait; verified path pushes the work commit, waits for green CI and the owner's live click-test, then seals. Promotes the change's ADR delta into openspec/adr/ and runs finalize-spec-purposes before the seal commit, hands off paste-ready commit messages, labels the issue IN PORT (never closes it). State-driven, self-healing, never runs git commit. Use when a change is implemented, reviewed clear, and ready to land, or to resume a landing in progress.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '2.0'
---

# /landfall

One command, driven by repository state. Landing a change is two owner-signed commits: the `issue-<N>:` **work commit** (implementation) and the `issue-<N>: archive <change>` **seal commit** (the archived change directory, including its `review.md`, making the spec delta canonical). Whether dev verification happens between them is the owner's call, asked once up front. A **MUSTER voyage** (tests-only, no change directory) lands through its own no-seal branch below instead.

**Skills never commit.** At every commit point: stage, state exactly what is ready with the **paste-ready commit message**, and **stop** — the owner signs at the screen. Never run `git commit`; never retry a blocked or unattended signature. Sessions may end at any hand-off; re-invocation resumes from state.

**Landfall docks, never closes.** Bookkeeping flips the issue to `IN PORT` and posts one summary comment on it — nothing else. Closing is inspection's act — `/port-inspection`.

## Phase detection — state-driven, self-healing

Determine position from repo state on every invocation (argument optional — resolve the single active change via `openspec list`, ask if several). Never rely on session memory.

| State | Position |
| --- | --- |
| An issue labeled both `MUSTER` and `UNDER SAIL` | MUSTER branch (below) — its own gates and flow |
| Active change, work uncommitted | Start: gates, then the verification question |
| Work staged/signed but unpushed | Push (fast path: only after both commits are signed) and proceed |
| Work pushed, change dir still active, verified path | Verification wait (CI + live check) |
| Seal staged but unsigned | Re-report the hand-off with the message |
| No active change, nothing pending | Report nothing to land |

Signals: `openspec list --json`, `git status --porcelain`, `git log origin/dev..dev`, `gh run list --branch dev --limit 5`, `gh issue view <N> --json labels`.

The label flip is atomic with archive and cannot lag it, so landfall carries no post-push bookkeeping phase and no leftover-bookkeeping sweep. A stranded `IN PORT` — an abandoned seal whose `issue-<N>: archive <change>` commit never reached `origin/dev` — is reconciled by `/port-inspection`, not by landfall; landfall never detects or flips it back.

## Gates — all must pass before anything is staged

1. **Review verdict** — `openspec/changes/<name>/review.md` exists and the **latest round's effective verdict** is `clear to land`. The effective verdict is the latest round as amended by any `### Adjudications` subsection — the last verdict-bearing line in the round (an `### Adjudications` `**Verdict:**` overriding the round's own), per the reader rule in `.claude/skills/spec-review/reference/finding-format.md` — so an adjudication that clears the findings satisfies this gate on its own. Missing file or any other effective verdict → stop, name the gate (run `/spec-review`, `/recheck-review`, `/incremental-spec-review`, or `/adjudicate-review`).
2. **Tasks complete** — every item in the change's `tasks.md` is `[x]`.
3. **`openspec validate <name> --strict`** passes.
4. **Local fast checks** — `npm run lint` (zero errors, zero non-size warnings) and `npx tsc --noEmit`. The full battery is **not** run locally by this skill — CI runs it after the push.

## The verification question — asked once, up front

Ask the owner (AskUserQuestion): **does this change need dev verification (CI + live click-test) before sealing?**

- **No → fast path.** Expected customers: locally-verified changes and doc-only changes that can't affect the battery. Accepted cost: a red CI after the combined push fixes forward against an already-sealed contract.
- **Yes → verified path.** The contract seals only after the change has been seen working live.

## ADR promotion — inside the archive swoop, before the seal

**Promote** each entry in the change's `adr.md` delta into `openspec/adr/NNNN-kebab-title.md`, taking the next unused ordinal from `openspec/adr/INDEX.md`:

- **ADDED** — a new file at the next unused ordinal, carrying the entry body.
- **MODIFIED** — the named file's body is replaced in place; the file, its number and its title stay.
- **REMOVED** — the file and its title stay standing, the whole body replaced by the single redirect line the delta gives (`**Superseded** — see ADR-NNNN: <title>`, or the `**Removed**` form). A number cited in a commit, a comment, a skill or another ADR then resolves to an answer rather than nothing. Numbers are never reused.

Index rows are derived from each entry's own **Touching** line — nothing is authored at index level.

**Verify before the seal:** every ADR the change declares exists in the library and carries an index row. Read `openspec/adr/` and `INDEX.md` from disk on every invocation, never from the conversation. A declared entry missing from either → stop and name it; do not hand off the seal.

An `adr.md` of three empty headings declares nothing, promotes nothing, and passes the check.

## Fast path — two signed commits, one push

1. Stage the change's work (per the owner's staging conventions — never blanket `git add` without confirming scope). Hand off with the paste-ready message `issue-<N>: <summary>`; stop for signing.
2. After the signature: archive the change (`/opsx:archive` semantics; `review.md` travels with it), promote and verify the change's ADR delta (above), run `/finalize-spec-purposes` so its repairs ride inside the seal commit, stage the archive move (and any sync/repair output). **Bookkeeping, in the same swoop as the archive:** flip the issue's label to `IN PORT` (removing `UNDER SAIL`) and post one summary comment on the landed issue — a short user-visible-changes summary when the change touched UI, a "no user-visible changes" one-liner otherwise (no scout lookup — the comment is harvested later by the map's e2e scout) — independent of staged/committed/pushed state. Never close the issue. Hand off with the paste-ready message `issue-<N>: archive <change>`; stop for signing.
3. After both signatures: **one push** (`git push origin dev`) — no CI wait. Report the CI run to watch (`gh run list --branch dev --limit 1`).

## Verified path — push, verify, then seal

1. Stage the work commit as above, hand off with `issue-<N>: <summary>`, stop for signing.
2. After the signature: push to `dev`, report the CI run to watch. The owner click-tests the live dev deployment while CI runs. Stop here if the session ends — re-invocation resumes at the wait.
3. **CI green** — check the run for the pushed sha. Red → fix forward (below). Pending → report and stop.
4. **Live check** — ask the owner (AskUserQuestion) to confirm the change checks out on the live dev deployment. Not confirmed → stop (or fix forward if it failed).
5. Archive the change, promote and verify the ADR delta (above), run `/finalize-spec-purposes`, stage the seal commit. **Bookkeeping, in the same swoop as the archive:** flip to `IN PORT` (removing `UNDER SAIL`) and post one summary comment on the landed issue — UI summary or "no user-visible changes" one-liner, no scout lookup — independent of staged/committed/pushed state. Never close the issue. Hand off with `issue-<N>: archive <change>`, stop for signing.

## MUSTER branch — one commit, no seal, always CI-verified

A MUSTER voyage is tests-only: no change directory, so no `review.md`, no `tasks.md`, no `openspec validate`, and nothing to archive or seal.

**Gates:**

1. **Muster-review verdict** — ask the owner (AskUserQuestion) to confirm the latest `/muster-review` round's verdict reads `clear to land` (the verdict is reported in the review session, not persisted). No round run, or verdict not clear → stop, point at `/muster-review`.
2. **Local fast checks** — `npm run lint` (zero errors, zero non-size warnings) and `npx tsc --noEmit`.

**No verification question.** A MUSTER landing is always CI-verified: the e2e battery is the deliverable's own verification, and there is no live surface to click-test.

**Flow:**

1. Stage the tests-only work (never blanket-stage unasked). Hand off with the paste-ready message `issue-<N>: <summary>`; stop for signing.
2. After the signature: push to `dev`, report the CI run to watch.
3. **Green CI** → remove `UNDER SAIL`, add `IN PORT` — `MUSTER` stays as the lane marker. No summary comment (this chunk is the e2e scout's own output — there is no later scout to feed), no archive, no seal commit. The issue stays open for inspection to close.
4. **Red CI** → fix forward under the same `issue-<N>:` prefix, run a fresh `/muster-review` round, then hand off the follow-up commit. The issue stays `UNDER SAIL` until CI is green.

## Red CI or failed live check — fix forward

Drive the fix in the working tree under the **same** `issue-<N>:` prefix:

- A **bug** → fix, `/recheck-review` round, stage a follow-up commit, hand off, push after signing, re-watch CI.
- A **design realization** (the specced behavior itself should differ) → on the verified path, amend the still-active change's spec delta as part of the fix — cheap because the contract hasn't sealed. On the fast path the contract has sealed — the amendment is the accepted cost of skipping verification.

A change whose fixes ball up into what would be multiple substantial commits should be split into a separate change instead. At most one change is in the apply stage at a time.
