## Why

`acceptance.md`'s `## No manual path — fully automated` section is an exemption whose admission criterion is never true, and it is suppressing findings the artifact exists to surface.

**No entry has ever qualified against the stated criterion.** The section admits "requirements with no human-observable surface". There is always a trigger: across the two changes that used it — `profiles-schema-phase-1` (7 entries) and `profiles-schema-phase-2` (18) — every one of the 25 has one. The criterion is unfalsifiable, so it costs nothing to invoke, so it gets invoked: same instruction, two months apart, 7 exiles versus 18.

**It suppressed a dead-code finding.** `profiles-schema-phase-1` filed this as exempt:

> **Nameless account gets the `UNTITLED` sentinel** — accounts are created only by the Google adapter, which always supplies a name, so no reachable path produces a null-name account.

That is a proof that the requirement, and the design decision behind it, are dead code under CLAUDE.md's KISS rule ("parameters/flags/branches with no current caller = dead code"). Acceptance did the tracing, wrote the conclusion, and filed it as an excused absence rather than a finding — downstream of the grilling session that produced the sentinel, with nothing obliging anyone to act on it. The same entry list carries at least one more of the same shape (`creation is idempotent … fires once per account by construction`). This change does not act on either: `profiles-schema-phase-1` has landed, and under migration by contact the requirement is re-adjudicated when its block is next touched.

**The section is a detector, not a valve.** What it collects is not un-walkable behavior — it is **non-behavioral requirements**, which OpenSpec's own `specs` artifact instruction rules out of a spec. The corpus is 1,672 `#### Scenario:` blocks across 57 capability specs, and the non-behavioral ones are not evenly spread. `data-layer-organization` is 16 of 16 — every scenario is file placement, module organization, or a review disposition (`WHEN lib/data/ is inspected`, `WHEN a PR places a function in a *.actions.ts module`). `store-filter` (15), `error-boundary` (9), and `guest-claim-identity` (9) are clean. The mass sits in the process capabilities: `testing-foundation` 102, `spec-review` 72, `map-workflow` 60, `trunk-workflow` 58. The governing instruction (`@fission-ai/openspec` v1.9.0, `schemas/spec-driven/schema.yaml`, verbatim):

> Create specification files that define WHAT the system should do.
>
> A spec is a behavior contract, not an implementation plan.
>
> Good spec content:
> - Observable behavior users or downstream systems rely on
> - Inputs, outputs, and error conditions
> - External constraints (security, privacy, reliability, compatibility)
> - Scenarios that can be tested or explicitly validated
>
> Avoid in specs:
> - Internal class/function names
> - Library or framework choices
> - Step-by-step implementation details
> - Detailed execution plans (those belong in design.md or tasks.md)
>
> Quick test: if the implementation can change without changing externally
> visible behavior, it likely does not belong in the spec.

The same instruction adds *"Specs should be testable - each scenario is a potential test case."* This is upstream text the repo-owned fork inherits unchanged — the fork's only edits to the `specs` artifact are two words about concision.

**A scenario is a testable outcome.** Not "something executed" — testable. `WHEN the owner runs npm run db:migrate` roots, because a command emits an exit code, stdout, and database rows, deterministically. `WHEN /embark-qualify runs, THEN it names /embark-write-tasks as its successor` does not: that is an instruction to an agent, and an agent following instructions produces nothing a test can pin. The exemption section has been standing in for this missing rule. Stating the rule is what lets the section go.

**The decision record was declined, not removed.** No ADR library has ever existed in this repo; `docs/` has never existed in its history. On 2026-05-22, while resolving a hunt for two dangling ADR references that turned out to be templated from another project, a change resolved that *"this repo does NOT use ADRs. Architectural decisions live in `openspec/specs/` (active capability specs) and `openspec/changes/`"*, and cancelled a planned five-entry backfill. That was a decision recorded in a task checkbox, with no analysis of where durable non-behavioral decisions would go instead. They went to specs, because specs are the only artifact that is durable, indexed, and always current. The exemption section is where that misfiling becomes visible, because acceptance walks behavior and these have none. The library now exists, landed separately by `2026-08-17-adr-artifact`; this change is its first author, not its creator.

**The row grammar forces the exile.** The schema instruction defines an action as a UI click — *"one concrete user action (literal UI verbs and handles — clicks `Claim as Guest`)"* — so a requirement whose chain roots outside a browser has no legal row shape. `profiles-schema-phase-1` already writes operator flows (`When the owner runs npm run db:migrate`, asserting `profile_members` rows) and they read well, but the contract does not sanction them. This is a mis-stated example, not a missing rule: chaining a scenario to its source already implies rooting it.

Inherited constraints found in the active specs:

- `trunk-workflow` — *"The failure types are stated once, in the member"*: a new failure type belongs in `/embark-qualify`'s requirement, and the schema `acceptance` instruction SHALL NOT restate it.
- `trunk-workflow` — *"Continue is the owner's ruling"*: withholding the artifact while findings stand must not remove the owner's power to rule a step in on continue.
- `trunk-workflow` — a contradiction is currently *"design and specs disagreeing"*; this change widens it, so the existing requirement text is modified rather than extended.
- `trunk-workflow` — `/landfall` *"SHALL be state-driven and self-healing"*: an ADR check added there must be derivable from disk, not from conversation.
- `acceptance-artifact` — its Position paragraph now contradicts the schema in two places, and this change owns the repair. It states the declaration order *"SHALL be `proposal, specs, design, acceptance, tasks, review`"* while the schema declares `proposal, adr, specs, design, acceptance, tasks, review`; and it states *"The `requires` edges SHALL NOT change"* while `design` now carries `requires: [adr]` instead of upstream's `[proposal]`. The second is the load-bearing one: `design` is an upstream-verbatim block, and the fork's reconcile-clean guarantee depends on those staying copy-forward.
- `spec-review` — the arena *"SHALL take no dependency on `acceptance.md` in either direction"*: no coupling to manage.
- `map-workflow` — `/port-inspection`'s scout reads archived `acceptance.md` as flows; archives receive no delta-sync, so removing the section affects no landed change.

## What Changes

### The exemption is removed

- **Remove `## No manual path — fully automated`** from three places: the artifact template, the schema `acceptance` instruction, and `acceptance-artifact`'s requirement text — which carries it twice, as the SHALL sentence in the requirement body and as the `A fully-automated requirement is exempt` scenario. Nothing replaces it in the document: findings are the run's output, and any section under any name is somewhere for a tired run to put things.

### The row grammar's wording is repaired

- **The root, not the user.** A When is one concrete action by the chain's **root actor**, carrying that actor's literal handle — `clicks Claim as Guest`, `runs npm run db:migrate`, `POSTs to the action`.
- **An actor produces a testable outcome.** The discriminator is not whether something executed but whether what it emitted can be pinned by a test. A command qualifies: an exit code, stdout, rows in a table. An agent following a skill's instructions does not — `WHEN this skill runs, THEN this happens` is a list of instructions, and no test attaches to it.
- **The observation medium follows the execution.** A Then asserts what the execution emitted — rendered page, HTTP response, database state, command stdout or exit code, a generated file. The state of hand-written source MAY be a Given; it SHALL NEVER be a When or a Then. This is the line that cannot be laundered by rewording `WHEN the source is inspected` into `WHEN a maintainer runs rg`: the discriminator is subject matter, not verb.
- **A coverage claim is still barred.** `when the suite runs, then the assertion passes` remains excluded as test-plan content.

### /embark-qualify gains a third failure type

The set becomes complete and symmetric — missing, excess, wrong:

- **Gap** — a scenario that should have been written was not. Unchanged; the specs gain the scenario.
- **Unreachable** (new) — a scenario was written that should not have been: no rooted chain reaches it. Two exits, chosen by whether the scenario states a testable outcome. **Behavioral but unreachable** (`UNTITLED`) is dead code as a *requirement*: the scenario leaves the spec. What else goes with it is decided case by case and SHALL NOT cascade — the `UNTITLED` guard itself was load-bearing, because `user.name` is nullable while `profile.name` is NOT NULL and TypeScript demands a value for the null case. The guard was never wrong; being a requirement was. **Not behavior** (file placement, module organization, single-sourcing, statement ordering, an instruction to an agent) is not spec material under OpenSpec's Quick Test: the scenario leaves the spec and the rule is rehomed. A requirement left with no scenarios exits by name through `## REMOVED Requirements`, which takes names only.
- **Contradiction** — a scenario that should have been written contradicts the **proposal or design**. Widened from the current design↔specs definition: `/embark-design` folds moved decisions back into the proposal via `/opsx:update`, and nothing afterward re-checks that the specs still match what was approved.

Both new exits route through `/opsx:update`, never a direct edit — the existing repair rule is unchanged.

### The run sweeps and withholds

- **The unit is the scenario, not the requirement.** A requirement holding four scenarios owes four rootings; covering one does not discharge the others. Scope is the change's own delta scenarios — canonical scenarios the chains pass through are not swept.
- **Sweep, do not stop at the first blocker.** Ten bad chains surface in one run, not ten runs.
- **No partial artifact.** If any finding stands, the run writes no flows. The findings are its output — which is already how the skill reports, so this states an existing behavior rather than adding a mechanism.
- **Qualify is the hard gate, and it is explicit.** Where the run can rule under the stated rules, it rules. Where it **cannot write a row correctly** under them, it SHALL raise that explicitly rather than write the row anyway — and the owner rules, overriding the run if they choose. This is the asymmetry with `/embark-design`, which runs loose on its own authority because it holds the rules in context at the moment of writing.

### /embark-design enforces spec membership and authors ADRs

- The member gains the duty of applying OpenSpec's own definition **before** a scenario hardens: a testable outcome belongs in the spec, everything else goes elsewhere. It runs this loosely and on its own authority — every rule for specs, ADRs and design is already loaded in its context, so it rules rather than asks. `/embark-qualify` is the hard gate behind it, not the first line.
- It also gains authorship of the `adr` artifact, which the `/opsx:continue` loop already generates ahead of specs. The requirement's heading names specs and design and therefore changes with it.

### The ADR library gains its lifecycle

The artifact, its template, the schema registration, and `openspec/adr/` landed separately. What is missing is what happens to an entry after it is written:

- **`/landfall` promotes** each entry from the change's `adr.md` delta into `openspec/adr/NNNN-kebab-title.md`, and **verifies** that every declared ADR exists in the library and is indexed — a disk-derivable check, consistent with its state-driven requirement. `openspec archive` syncs specs only, so without this step a written ADR rides into `archive/` and is lost.

### The ADR bar is sharpened

Writing this change's own `adr.md` put two entries in front of the owner and both were rejected — the membership rule as duplicating what OpenSpec's `specs` instruction already states and enforces, and migration-by-contact as a transitional state rather than a lasting decision. Neither rejection is reachable from the bar as currently written, so the bar gains what the rulings turned on:

- **Prose channels carry their reasoning implicitly.** An artifact instruction or a skill carries context by nature, whether or not a sentence spells the argument out, so a rule living there earns no entry on the grounds that its why is only implied. A bare signal is the contrast the instruction already draws: a lint error states a threshold and never the argument behind it. This folds into that existing sentence rather than sitting beside it.
- **Drift risk and DRY outrank stating the why.** One home for a rule beats a complete argument split across two.
- **CLAUDE.md's split is the narrow exception.** The existing allowance — the rule in CLAUDE.md, the argument in an ADR — is earned by CLAUDE.md's row scarcity specifically, because the why genuinely cannot fit there. It is not available wherever the why is thin, and saying so is what keeps it from reading against the two rules above.
- **An ADR is lasting, stated positively.** It binds until removed or superseded. A rule that exists only to carry a temporary state — a migration, a transition, a deprecation window — ends when that state ends, and so is not an ADR however many changes it binds on the way. The existing "binds only this change stays in design.md" clause is kept as the other end of the same test.

### The scenario-coverage bar is written down

The reviewer-side gate already exists and already runs. `spec-review`'s testing arena, check 2 (`openspec/specs/spec-review/spec.md:541-550`, `.claude/skills/spec-review/testing-brief.md:94`), requires a named test pinning every delta-spec scenario, is already delta-scoped, and already takes no dependency on `acceptance.md`. What does not exist is an author-facing bar: `TESTING.md` says nothing about spec-scenario pinning, so an author learns the rule only when review finds the omission.

- **`TESTING.md` carries the bar** an author writes against. No `spec-review` delta, no testing-brief edit.
- **The unit differs by layer, and the reason is failure attribution.** A failing test should name the scenario that broke. A unit or integration test covering several scenarios makes that ambiguous, so one scenario per test is the ideal. An e2e test covers one acceptance flow — and a flow *is* a chain of scenarios, so spanning several is the correct shape there, not an exemption.
- **It is a norm, not a hard count.** One scenario may honestly earn several tests, and a shared flow test is not the failure this gate exists to catch: a scenario with zero tests is.
- **This is not spec material either.** It governs how tests are authored, and no execution roots it. `TESTING.md` carries the rule together with its why, which is the bar a self-documenting home has to clear; an ADR is earned only where the reasoning would otherwise have no home. No `testing-foundation` delta.

### This change is its own first case

Under the testable-outcome rule, most of `acceptance-artifact` and `trunk-workflow` is instruction to an agent rather than behavior — measured, 1 of 13 scenarios and 1 of 58 state a testable outcome. Migration by contact therefore fires on its own blocks, and it fires hard: rerooting each touched requirement onto a real execution was attempted and failed, so the deltas are pure removals rather than the `MODIFIED` blocks first planned. That is the rule working, not a conflict to design around, and it makes this change the worked example every later one reads.

Neither capability is retired. A requirement that ends with no scenarios leaves by name through `## REMOVED Requirements`; the capability itself only comes into question when its last requirement goes, which is not this change.

### Migration is by contact, not by campaign

Future correctness is the point. Rectifying the standing corpus is not, and SHALL NOT be scheduled as a campaign — a later change may sweep it deliberately, and would regenerate the work list more accurately than any list maintained meanwhile.

- **Contact is the trigger.** The rule binds what a change writes. An untouched requirement block is grandfathered, and the corpus's standing non-behavioral scenarios are not re-adjudicated up front.
- **A copied block is ruled by the agent, not by the owner.** A `MODIFIED` delta copies the entire requirement block, so stale scenarios arrive in view whether or not the change means to touch them. The agent rules each on a three-step test — does it meet today's standard; if not, does it clear the ADR bar; if neither, plain removal — and reports what it did. It SHALL NOT put a scenario to the owner for a ruling: an owner asked about a scenario written months ago has no context to rule with, and buying that context costs more than the cleanup.
- **A block left alone is recorded nowhere.** Grandfathered is a state, not a list. A second index of deferred blocks drifts against the specs it describes, and the sweep that would rebuild it costs one pass.
- **Where this surfaces is deliberately unfixed.** Ideally the grilling interview catches it, often the spec write does, sometimes not until qualification. The discovery point tightens with use rather than being specified ahead of it.

## Capabilities

### Modified Capabilities

Both deltas are pure removals. Neither capability gains anything, because under the rule this change states neither has anything a spec can hold — every requirement it touches roots at an agent following instructions, and rerooting was attempted and failed. Neither capability retires: each keeps the requirements this change does not touch.

- `acceptance-artifact`: **REMOVED** `acceptance.md is a schema-registered artifact drafted by chaining sourced scenarios` and `Flows use uniform chained Given/When/Then rows`. The Position paragraph's two contradictions against the landed schema retire with the first, so the planned repair is unnecessary. `Apply refines flows with literal handles` and `Archived acceptance flows are hints, not truth` are untouched and stay grandfathered.
- `trunk-workflow`: **REMOVED** `/embark-design SHALL run the grilling interview and write specs and design`, `/embark-qualify SHALL qualify the change in a fresh chat`, and `/landfall SHALL be state-driven and self-healing`. Ten requirements are untouched and stay.

Everything removed lands in prose that already carries it: the `acceptance` instruction in `schema.yaml`, and the three SKILL.md files. Those are the channels an author passes through at the trigger, so each carries its own reasoning and earns no ADR.

## Impact

Documentation and workflow contract only — no application code, no schema changes, no tests.

- `openspec/schemas/spec-driven-review/templates/acceptance.md` — delete the exemption section
- `openspec/schemas/spec-driven-review/schema.yaml` — two instructions. `acceptance`: exemption removed, root actor and emitted observable stated, withholding rule added. `adr`: the three bar repairs below
- `openspec/specs/acceptance-artifact/spec.md` — delta, two removals with Reason and Migration. No repair: the Position paragraph retires with the requirement holding it
- `openspec/specs/trunk-workflow/spec.md` — delta, three removals with Reason and Migration. The *"Two failure types"* heading and the `/embark-design` requirement heading go with their requirements rather than being rewritten.
- `.claude/skills/embark-qualify/SKILL.md` — third failure type, and the normative text the removed requirement held; this file becomes the contract's only home
- `.claude/skills/embark-design/SKILL.md` — spec-membership duty, ADR authorship, and the normative text the removed requirement held
- `.claude/skills/landfall/SKILL.md` — ADR promotion and verification, and the phase-detection text the removed requirement held
- `TESTING.md` — the scenario-coverage bar an author writes against
- `CLAUDE.md` — the trunk-workflow line reads *"Normative: `map-workflow` + `trunk-workflow` specs; mechanics: each skill's SKILL.md"*. For the departure arc that inverts once these requirements are removed, so the line is corrected rather than left pointing at a spec that no longer holds the contract
- `openspec/adr/` — untouched. This change writes `adr.md` empty and authors no entry: the membership rule is already stated and enforced by OpenSpec's own `specs` instruction, and migration-by-contact governs a transitional state rather than a lasting decision — it would be dead text once the corpus has migrated. `/landfall`'s promotion step therefore ships with nothing to promote, and the library stays at zero entries until a change earns one

Not affected: `/port-inspection`'s scout (reads archived flows, no delta-sync), `/spec-review` (no dependency in either direction, and its testing arena already runs the coverage check), and every archived `acceptance.md` (history, left as written).

Non-executable change — markdown and skill text only. Per CLAUDE.md's five-gates rule the two test gates may be omitted, with the omission named in the tasks lead-in.
