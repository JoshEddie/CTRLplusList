## REMOVED Requirements

### Requirement: /embark-design SHALL run the grilling interview and write specs and design

**Reason**: Not spec material under the testable-outcome rule this change states. All ten scenarios root at the skill running and complying — the interview reading an issue first, the map read stopping at the map, the grilling aiming at a written proposal, a re-entry re-running the interview, an epic routing out. An agent following instructions emits nothing a test can pin, and the interview itself is unobservable, so none reroots.

**Migration**: `.claude/skills/embark-design/SKILL.md` carries the whole contract and gains what this change adds: authorship of the `adr` artifact, which the `/opsx:continue` loop already generates ahead of specs, and the duty of applying OpenSpec's own membership definition before a scenario hardens — a testable outcome belongs in the spec, everything else goes to the prose channel that already carries it. The skill applies that loosely and on its own authority, holding every rule for specs, ADRs and design in context at the moment of writing, with `/embark-qualify` as the hard gate behind it.

### Requirement: /embark-qualify SHALL qualify the change in a fresh chat

**Reason**: Same test, same result. The nine scenarios assert that a contaminated run is prevented, that an unbacked step is called a gap, that a verdict is reported before repair, that continue is the owner's ruling, that repair routes through `/opsx:update`, and — explicitly barred by the rule — that the schema instruction and this member agree *when compared*. None has an execution behind it.

**Migration**: `.claude/skills/embark-qualify/SKILL.md` carries the contract and gains the third failure type. **Unreachable** is a scenario written that should not have been: no rooted chain reaches it. Its exits do not cascade — a scenario leaving the spec does not imply the design decision or the implementation goes with it, and the run states what it is removing. **Contradiction** widens from design-against-specs to specs against the proposal or the design. The run sweeps every delta scenario rather than stopping at the first blocker, and where it cannot write a row correctly under these rules it raises that explicitly and the owner rules. The fresh-chat requirement keeps its reasoning in the skill: a run carrying the authoring transcript does not degrade, it inverts.

### Requirement: /landfall SHALL be state-driven and self-healing

**Reason**: Same test. Both scenarios assert what the skill detects and declines to do — resuming at the verification wait, not reconciling a stranded label. Phase detection is derivable from disk, but a scenario about an agent correctly reading disk pins nothing a test can run.

**Migration**: `.claude/skills/landfall/SKILL.md` carries phase detection unchanged and gains ADR promotion: each entry in the change's `adr.md` delta is promoted into `openspec/adr/NNNN-kebab-title.md`, and every declared ADR is verified present in the library and indexed before the seal. `openspec archive` syncs specs only, so without that step a written ADR rides into `archive/` and is lost. The check is disk-derivable, consistent with the state-driven rule it sits beside.
