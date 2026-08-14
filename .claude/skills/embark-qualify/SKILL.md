---
name: embark-qualify
argument-hint: '[change-name]'
description: Qualify the change - a change qualifies when every user route it touches runs end to end on what its specs and design say. Generates acceptance.md in a chat that did not author the documents it chains, and gates on what that generation surfaces: a gap or a contradiction disqualifies the change until /opsx:update clears it. Third member of the departure arc, after /embark-design and before /embark-write-tasks. Must run in a fresh chat.
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

## The run

Verify the change holds `design.md` and no `acceptance.md`; without `design.md`, stop and name [/embark-design](../embark-design/SKILL.md). Then run `/opsx:continue`.

Generation surfaces every step it cannot source. Classifying those steps, repairing them and gating on them is this skill's, not the artifact's.

## Two failure types

They repair in different places, so they are distinguished:

- **Gap** — a step nothing backs. Only this is a spec gap. The specs gain the scenario, and the flow chains through it.
- **Contradiction** — design asserts something the specs deny, or the specs deny something design asserts. A coherence failure, not a spec gap: the fix lands wherever the conflict actually sits, in either file, judged when found. The specs are not presumed to be the wrong one.

## The three design.md cases

`design.md` may name an **observable**. It never sources a **behavior**.

1. **Design names the observable** — a spec backs the step but names no surface, and design.md does. The row asserts design's observable. No finding: design supplied the handle, not the behavior.
2. **Design asserts the behavior, and nothing else does** — a **gap**. The step does not chain on design's authority; the scenario goes into the specs.
3. **Design contradicts a spec** — a **contradiction**. The change is disqualified.

## The verdict

Report it to the owner: the change qualifies, or it is disqualified by the findings above.

While a finding stands, the change does not advance on this skill's authority.

**Pause** on one question — repair the findings, or continue. A pause, not a stop: the conversation continues.

- **Repair** — through `/opsx:update`, never a direct edit of specs or design. Re-run afterwards.
- **Continue** — the owner rules the findings do not block. Whether a ruled step chains into its flow or stays out of it is their call, not this skill's.

## Never commits

This skill never runs `git commit`, stages files for one, or pushes. It flips no label.

## Stop

End the turn here, after the run and any repair. Next: [/embark-write-tasks](../embark-write-tasks/SKILL.md) — tasks and the review scaffold.
