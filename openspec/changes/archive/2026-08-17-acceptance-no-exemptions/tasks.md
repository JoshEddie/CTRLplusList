## 1. Schema — the `acceptance` instruction and its template

Edited together: the template's example rows outrank the instruction's rules in
practice, so a UI-click example left standing would keep producing UI-click
Whens however the instruction defines a root actor.

- [x] 1.1 In `openspec/schemas/spec-driven-review/schema.yaml`, delete the exemption sentence from the `acceptance` instruction — `A requirement with no human-observable surface is listed as "no manual path — fully automated", never forced into a flow.` Nothing replaces it.
- [x] 1.2 Replace the instruction's `one concrete user action (literal UI verbs and handles — "clicks `Claim as Guest`")` with the root-actor rule: a When is one concrete action by the chain's root actor carrying that actor's literal handle — `clicks `Claim as Guest``, `runs `npm run db:migrate``, `POSTs to the action`.
- [x] 1.3 Add the testable-outcome discriminator to the instruction: the actor must produce something a test can pin — an exit code, stdout, rows in a table — and an agent following a skill's instructions does not.
- [x] 1.4 Add the observation-medium rule to the instruction: a Then asserts what the execution emitted (rendered page, HTTP response, database state, command stdout or exit code, a generated file); the state of hand-written source MAY be a Given and SHALL NEVER be a When or a Then, the discriminator being subject matter rather than verb.
- [x] 1.5 Confirm the instruction's existing bar on coverage claims (`no scenario→test-layer mapping, no coverage claims`) survives 1.1–1.4 unchanged.
- [x] 1.6 Add the no-partial-artifact rule to the instruction: while any finding stands, the run writes no flows and no `acceptance.md` — stated as a property of the artifact so it holds on every generation route, not only `/embark-qualify`.
- [x] 1.7 State in the instruction that the failure types are named once, in `/embark-qualify`'s `SKILL.md`, and that this instruction keeps only "an unsourceable step is surfaced" — carrying forward the single-statement constraint the removed requirement held.
- [x] 1.8 In `openspec/schemas/spec-driven-review/templates/acceptance.md`, delete the `## No manual path — fully automated` heading, its HTML comment, and its example row.
- [x] 1.9 Replace the template's `<one concrete user action, literal UI handle>` row with a root-actor row, and add at least one operator-rooted example (`runs `npm run db:migrate``) so the shape the instruction now sanctions is visible where runs look.
- [x] 1.10 Update the template's header comment, which still describes the drafting basis in the removed requirement's terms.

## 2. Schema — the `adr` instruction's bar

Four repairs, all folding into the existing bar rather than sitting beside it.
Each is a ruling this change's own `adr.md` review produced that the bar as
written could not reach.

- [x] 2.1 Fold into the existing bare-signal sentence that a prose channel — an artifact instruction, a skill — carries its reasoning implicitly whether or not a sentence spells the argument out, so a rule living there earns no entry on the grounds that its why is only implied.
- [x] 2.2 State that drift risk and DRY outrank stating the why: one home for a rule beats a complete argument split across two.
- [x] 2.3 Narrow the existing CLAUDE.md-and-ADR allowance to the exception it is — earned by CLAUDE.md's row scarcity specifically, because the why genuinely cannot fit there, and not available wherever the why is thin.
- [x] 2.4 State the lasting test positively: an ADR binds until removed or superseded, and a rule that exists only to carry a temporary state (a migration, a transition, a deprecation window) ends when that state ends and is not an ADR however many changes it binds on the way. Keep the existing "binds only this change stays in design.md" clause as the other end of the same test.

## 3. `/embark-qualify` — the contract's only home

The removed `trunk-workflow` requirement's normative text moves here rather than
being rewritten. Verify each migrated statement is present and unchanged in
meaning before adding the new material.

- [x] 3.1 Replace the `## Two failure types` heading and its count with the complete, symmetric set of three — missing, excess, wrong.
- [x] 3.2 Add **Unreachable** — a scenario written that should not have been: no rooted chain reaches it.
- [x] 3.3 State Unreachable's two exits, chosen by whether the scenario states a testable outcome: behavioral-but-unreachable is a dead requirement and the scenario leaves the spec; not-behavior (file placement, module organization, single-sourcing, statement ordering, an instruction to an agent) is not spec material and the rule is rehomed.
- [x] 3.4 State that the exits SHALL NOT cascade — a scenario leaving the spec does not imply the design decision or the implementation goes with it — and that the run names which exit it took and what it is removing.
- [x] 3.5 State that a requirement left with no scenarios exits by name through `## REMOVED Requirements`, which takes names only.
- [x] 3.6 Widen **Contradiction** from design-against-specs to specs against the proposal or the design, keeping the rest of its current text — including that the specs are not presumed to be the wrong file.
- [x] 3.7 Add the sweep discipline: the unit is the scenario rather than the requirement, a requirement holding four scenarios owes four rootings, scope is the change's own delta scenarios, and canonical scenarios the chains pass through are traversed rather than swept.
- [x] 3.8 State that the run walks every delta scenario before reporting rather than stopping at the first blocker.
- [x] 3.9 State that where the run cannot classify a leftover, or cannot write a row correctly under the grammar, it raises that explicitly rather than writing the row anyway or dropping it silently — and the owner rules and may override.
- [x] 3.10 State that the failure types are stated once, here, and that the `acceptance` instruction does not restate them.
- [x] 3.11 Verify the migrated normative text is carried in full: fresh-chat-first with its reasoning (a contaminated run does not degrade, it inverts), classification belonging to this member rather than the artifact, the three `design.md` cases, verdict-before-repair, repair routing through `/opsx:update` rather than a hand edit, and continue being the owner's ruling.

## 4. `/embark-design` and `/landfall`

- [x] 4.1 Add the spec-membership duty to `.claude/skills/embark-design/SKILL.md`: apply OpenSpec's own definition before a scenario hardens — a testable outcome belongs in the spec, everything else goes to the prose channel that already carries it.
- [x] 4.2 State that the member applies membership loosely and on its own authority, holding every rule for specs, ADRs and design in context at the moment of writing, with `/embark-qualify` as the hard gate behind it.
- [x] 4.3 Add authorship of the `adr` artifact to the same skill, which the `/opsx:continue` loop already generates ahead of specs.
- [x] 4.4 Verify the removed requirement's normative text is carried in full by `.claude/skills/embark-design/SKILL.md` — the interview reading the recorded issue first, the map read stopping at the map, the grilling aiming at a written proposal, a re-entry re-running the interview, an epic routing out.
- [x] 4.5 Add the ADR promotion step to `.claude/skills/landfall/SKILL.md`: each entry in the change's `adr.md` delta is promoted into `openspec/adr/NNNN-kebab-title.md`, taking the next unused ordinal from the index.
- [x] 4.6 State promotion's per-operation behavior: `MODIFIED` entries replace the file's body in place; `REMOVED` entries leave the file and its title standing with the body replaced by a single redirect line, so a cited number resolves to an answer rather than nothing.
- [x] 4.7 Add the verification step before the seal: every ADR the change declares exists in the library and carries an index row, the row derived from the entry's own `Touching` line, read from disk on every invocation.
- [x] 4.8 State why the step exists where a reader meets it — `openspec archive` syncs specs only, so without promotion a written ADR rides into `archive/` and is lost.
- [x] 4.9 Verify `.claude/skills/landfall/SKILL.md` carries the removed requirement's phase-detection text in full — resuming at the verification wait, and declining to reconcile a stranded label.

## 5. Repo docs

- [x] 5.1 Add the scenario-coverage bar to `TESTING.md`: a named test pins every delta-spec scenario, delta-scoped.
- [x] 5.2 State the per-layer unit and its reason: one scenario per unit or integration test, because a failing test should name the scenario that broke; an e2e test spans a flow, because a flow is a chain of scenarios.
- [x] 5.3 State that it is a norm rather than a hard count — a scenario with zero tests is the failure, not a scenario sharing one.
- [x] 5.4 Verify `TESTING.md`'s wording states the same unit rule `spec-review`'s testing arena check 2 enforces (`openspec/specs/spec-review/spec.md:541-550`), so an author is not written to one bar and reviewed against another. No `spec-review` delta, no testing-brief edit.
- [x] 5.5 Correct `CLAUDE.md:30` — after the removals, the departure arc's contract lives in the `SKILL.md` files rather than in `trunk-workflow`, so the "Normative … mechanics" line no longer describes it.

## 6. This change as its own first case

- [x] 6.1 Verify `acceptance.md` carries no `## No manual path — fully automated` section and lists no scenario as exempt.
- [x] 6.2 Verify every When in `acceptance.md` roots at the owner at a shell and every Then asserts what the execution emitted, with hand-written source appearing only as a Given.
- [x] 6.3 Refine `acceptance.md`'s flows with the literal handles the applied edits produce — refine, not rewrite; flow identity and journey scope stay as drafted.
- [x] 6.4 Verify `map-workflow`'s four citations of `trunk-workflow` and `muster-review`'s one still resolve, none naming a removed requirement.

## 7. Pre-merge

Doc-only change — every file in the diff is markdown, `.claude/**`, or
`openspec/**`, none of which can affect test outcomes. The `npm run
test:coverage` and `npm run test:e2e` gates are therefore omitted rather than
run, and carry no checklist item. CI on the `dev` push still runs the full
battery.

- [x] 7.1 `openspec validate acceptance-no-exemptions --strict` passes.
- [x] 7.2 `npm run lint` passes — zero errors, zero non-size warnings.
- [x] 7.3 `npx tsc --noEmit` passes — zero errors.
- [x] 7.4 `npm run build` completes successfully.
