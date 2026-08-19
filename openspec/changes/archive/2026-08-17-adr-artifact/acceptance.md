# Acceptance — adr-artifact

**Sourcing basis.** This change sets `skip_specs: true`, so it has no delta
`#### Scenario:` blocks to chain and no canonical spec governs the surface it
adds. Every row below sources to the schema `adr` artifact declaration this
change writes and to a Decision in `design.md`; none is asserted on the flow's
own authority. That is a deviation from the artifact's normal contract, stated
here rather than worked around.

**Grammar.** The root actor is the repo owner at a shell, and each Then asserts
what the execution emitted — command output, or a file the command wrote. The
state of hand-written source (the schema YAML, the template, the CLAUDE.md
rows) appears only as a Given: those edits are verified by the tasks checklist,
not walked. No flow below asserts the library's index content, because the
library ships empty — that walk becomes available when the follow-on promotes
the first entry.

## Flows

### Flow: A change reaching design generates an ADR delta

- **Given** the fork declares `adr` between `proposal` and `specs`
- **And** a change on the `spec-driven-review` schema whose `proposal.md` exists
  and whose `adr.md` does not
- **When** the owner runs `/opsx:continue` on that change
- **Then** the run selects `adr` as the next artifact rather than `specs` or
  `design`
- **And** `openspec/changes/<name>/adr.md` exists carrying `## ADDED ADRs`,
  `## MODIFIED ADRs`, and `## REMOVED ADRs` with no entries under them
- **And** `openspec status --change <name>` reports `adr` as `done` and `design`
  as still incomplete

### Flow: The design loop reaches the ADR artifact before it exits

- **Given** a change whose `design.md` does not yet exist
- **When** the owner runs `/embark-design` on that change
- **Then** `adr.md` exists on disk when the run finishes
- **And** the run did not require a `/opsx:continue` invocation beyond its own
  loop to produce it

### Flow: The library directory does not disturb the CLI

- **Given** `openspec/adr/` exists alongside `openspec/specs/` and
  `openspec/changes/`
- **When** the owner runs `openspec list`
- **And** the owner runs `openspec validate adr-artifact --strict`
- **Then** `openspec list` prints the same specs and changes it printed before
  the directory existed
- **And** neither command emits a warning or error naming `openspec/adr`
- **And** `validate` passes without a zero-delta error, the change's
  `skip_specs: true` marker having satisfied it
