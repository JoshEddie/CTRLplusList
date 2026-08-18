---
name: embark-design
argument-hint: '[change-name]'
description: Sharpen the proposal and write the contract - run the /mattpocock-skills:grilling interview against the reviewed proposal, make any moved decision durable via /opsx:update, then generate the change's adr.md, delta specs and design.md in the same turn. Second member of the departure arc, after /embark-start and before /embark-qualify. Use when a change has proposal.md and needs its specs and design written.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

## Usage

**Optional: Run this in a fresh chat.** If this conversation wrote the change's proposal it may be beneficial to run the grilling interview in a fresh context.

```
/embark-design [change-name]
```

## Entry

`proposal.md` is required — without one, stop and name [/embark-start](../embark-start/SKILL.md); generate nothing.

Read the issue recorded on the proposal (`gh issue view`) and the map it links — the map's own body, not its sub-issues. The map's Decisions so far are settled context.

Then read whatever this issue blocks:

```bash
gh api --paginate repos/{owner}/{repo}/issues/<n>/dependencies/blocking \
  --jq '.[] | {number, title}'
```

Ensure this design will unblock any dependent issue.

Then load the three instructions you will write against, and hold them through the interview:

```bash
openspec instructions adr --change <name> --json
openspec instructions specs --change <name> --json
openspec instructions design --change <name> --json
```

## Grilling interview

Run `/mattpocock-skills:grilling` against `proposal.md`, and against `adr.md` or `specs/` when an earlier run already wrote either. These are settled facts — cite them, don't relitigate them.

Aim the interview at the proposal's stated **Capabilities** and **Impact** rather than re-establishing what the change is. Any decision carrying an ***unreviewed*** marker (auto-closed scouting, or a proposal line marked provisional) is suspect — re-validate it with the owner rather than citing it as settled.

**Scope.** The issue is the scope: deliver what it asks, in full, and nothing beside it. Ask only what this change needs settled to be right; drop the rest.

**Decision Routing.** Not every decision needs an ADR or a spec. What needs neither goes in `design.md` when it binds only this change, otherwise to the prose channel already firing at its trigger: a skill, an artifact instruction, `TESTING.md`, etc.

**Epic route-out.** Rare. The interview MAY find the work needs more than one change — because it arrived too big, or because what the issue asks can't be delivered without work nobody scoped. Adjacent work you merely noticed is not that. Put it to the owner, and on their confirmation hand off to [/map](../map/SKILL.md)'s chart phase in the same conversation, drafting no specs.

## Pause — the owner's check

When the interview concludes, **pause** for the owner to check its conclusions. This is a pause, not a stop: the conversation continues.

Then run `/opsx:update` wherever the grilling moved a decision the proposal states, so the proposal is durable before specs are drafted. Specs are never drafted against a proposal the interview has already overtaken.

## Write the contract

In the same turn as the interview, while it is still in the conversation, run `/opsx:continue` until `design.md` exists. Do not continue into acceptance or tasks.

The loop generates `adr.md` first, then `specs/`, then `design.md`. Each artifact's own instruction rules what belongs in it. Apply it yourself; do not put a placement to the owner.

## Never commits

This skill never runs `git commit`, stages files for one, or pushes. It flips no label.

## Stop

End the turn here. Next: [/embark-qualify](../embark-qualify/SKILL.md) — and it **must run in a fresh chat**. A qualification run carrying this interview knows things the documents do not state, so it completes routes the documents cannot support and reports a false pass.
