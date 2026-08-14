---
name: embark-write-tasks
argument-hint: '[change-name]'
description: Break the change into implementation work - generate tasks.md from the specs and design as they stand on disk, then the review.md scaffold, holding no interview of its own. Fourth member of the departure arc, after /embark-qualify and before /embark-apply. Use when a change is qualified and needs its task breakdown.
disable-model-invocation: true
metadata:
  author: list_eddiefamily
  version: '1.0'
---

## Usage

```
/embark-write-tasks [change-name]
```

No argument: the single change whose `acceptance.md` exists and whose `tasks.md` does not (ask if several).

## The run

Run `/opsx:continue` until `review.md` exists.

Read `specs` and `design` from the change directory. Hold no interview: there is nothing for the owner to decide at this boundary, and the contract to break down is the one on disk.

The boundary above this member is load-bearing. After [/embark-qualify](../embark-qualify/SKILL.md) reports failures and `/opsx:update` repairs the specs, that chat still holds the pre-repair documents and the argument that changed them. Tasks written there can encode the argument rather than the settled contract. This member needs no conversation, so the boundary costs nothing.

## Never commits

This skill never runs `git commit`, stages files for one, or pushes. It flips no label.

## Stop

End the turn here, once both artifacts exist. Next: [/embark-apply](../embark-apply/SKILL.md) — occupy the tree and implement.
