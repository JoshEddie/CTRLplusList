---
name: embark-qualify
argument-hint: '[change-name]'
description: Qualify the change - a change qualifies when every user route it touches runs end to end on what its specs and design say. Generates acceptance.md in a chat that did not author the documents it chains, and gates on what that generation surfaces: a gap, an unreachable scenario or a contradiction disqualifies the change until /opsx:update clears it. Third member of the departure arc, after /embark-design and before /embark-write-tasks. Must run in a fresh chat.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

## Usage

**Run this in a fresh chat.** If this conversation wrote the change's specs or design, or held the grilling that produced them, stop and start a new one.

```
/embark-qualify [change-name]
```

## Entry

Verify the change holds `design.md` and no `acceptance.md`; without `design.md`, stop and name [/embark-design](../embark-design/SKILL.md).

Classifying a surfaced step, repairing it and gating on it is this skill's, not the artifact's. The failure types are stated once, here; the schema `acceptance` instruction carries only the rule that an unsourceable step is surfaced, and does not restate them.

## The sweep

Chain the change's delta scenarios into flows and surface every step you cannot source. Write nothing.

The unit is the scenario, not the requirement. A requirement holding four scenarios owes four rootings, and covering one does not discharge the other three. Scope is the change's own delta scenarios — canonical scenarios the chains pass through are traversed, not swept.

Walk every delta scenario before reporting. Do not stop at the first blocker.

## Three failure types

Missing, excess, wrong. They repair in different places, so they are distinguished:

- **Gap** — a step no spec backs: the flow needs it, the specs lack it, stated in the `proposal.md`, `design.md`, or by nothing.
- **Unreachable/Untestable** — a scenario written that should not have been: the specs carry it and no rooted chain reaches it. The inverse of a gap.
- **Contradiction** — the specs assert something the **proposal or the design** denies, or deny something either asserts. A coherence failure, not a spec gap: the specs are not presumed to be the wrong one.

### Unreachable's two exits

Chosen by whether the scenario states a testable outcome:

- **Behavioral but unreachable** — it states an outcome a test can pin, and no chain reaches it. A dead requirement: the scenario leaves the spec.
- **Not behavior** — file placement, module organization, single-sourcing, statement ordering, an instruction to an agent. Not spec material: the scenario leaves the spec and the rule is rehomed to the prose channel that already carries it.

The exits do not cascade: a scenario leaving the spec does not imply the design decision or the implementation goes with it. Name which exit was taken, and what is being removed.

A requirement left with no scenarios exits by name through `## REMOVED Requirements`, which takes names only.

## The three design.md cases

`design.md` may name an **observable**. It never sources a **behavior**.

1. **Design names the observable** — a spec backs the step but names no surface, and design.md does. The row asserts design's observable. No finding: design supplied the handle, not the behavior.
2. **Design asserts the behavior, and nothing else does** — a **gap**. The step does not chain on design's authority; the scenario goes into the specs.
3. **Design contradicts a spec** — a **contradiction**. The change is disqualified.

## The verdict

If the change does not qualify, report it to the owner before repairing anything.

While a finding stands, the change does not advance on this skill's authority.

**Pause** on one question — repair the findings, or continue. A pause, not a stop: the conversation continues.

- **Repair** — through `/opsx:update`, never a direct edit of specs or design. Re-run afterwards.
- **Continue** — the owner rules the findings do not block. Whether a ruled step chains into its flow or stays out of it is their call, not this skill's.

## The write

Run `/opsx:continue`. It writes `acceptance.md`. 

You may discover new disqualifications during the write. Write what you can then issue a new verdict.

## Never commits

This skill never runs `git commit`, stages files for one, or pushes. It flips no label.

## Stop

End the turn here, after the run and any repair. Next: [/embark-write-tasks](../embark-write-tasks/SKILL.md) — tasks and the review scaffold.
