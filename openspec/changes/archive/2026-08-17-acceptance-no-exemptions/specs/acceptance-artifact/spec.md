## REMOVED Requirements

### Requirement: acceptance.md is a schema-registered artifact drafted by chaining sourced scenarios

**Reason**: Not spec material under the testable-outcome rule this change states. Every one of its six scenarios roots at an agent following the `acceptance` instruction — the artifact being generated, a draft surfacing a step it cannot source, the contract naming no failure type — and no test can produce that WHEN. Rerooting was attempted and failed: an assertion that `acceptance.md` exists on disk still triggers on an agent's run, and `WHEN openspec status --json` reports the declaration order is the state of a hand-written YAML file wearing a command, which the rule bars as subject matter regardless of verb. The requirement also carried the Position paragraph's two contradictions against the landed schema; removing it retires the contradictions with it, so no repair is needed.

**Migration**: The registration, the declaration order and its reasoning, the sourcing contract, the withholding rule and the `design.md`-never-sources-behavior line all live in the `acceptance` artifact instruction in `openspec/schemas/spec-driven-review/schema.yaml`, which this change updates. That instruction is prose an author passes through at the moment of writing the artifact, so it carries its own reasoning and needs no second home. The declaration order remains enforced by the schema file itself, which is what `/opsx:continue` reads.

### Requirement: Flows use uniform chained Given/When/Then rows

**Reason**: The requirement carried the fully-automated exemption this change removes, and its three scenarios assert the shape of markdown an agent drafted — a journey splitting into arcs, a compound row splitting into atoms, a requirement being listed as exempt. None states an outcome a test can pin.

**Migration**: The row grammar moves in full to the `acceptance` artifact instruction, repaired as this change specifies: a When is one concrete action by the chain's root actor carrying that actor's literal handle, the actor must produce a testable outcome, a Then asserts what the execution emitted, and the state of hand-written source may be a Given but never a When or a Then. Coverage claims stay barred. The exemption is not rehomed — it is deleted from the instruction and the template, and nothing replaces it; what it used to collect is surfaced instead as an **Unreachable** finding by `/embark-qualify`.
