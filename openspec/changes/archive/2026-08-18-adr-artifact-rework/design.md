## Context

See proposal.md — Why. Three facts shape every decision below.

**The library is empty.** `openspec/adr/` holds `INDEX.md` with a header and no rows. Nothing to migrate, no citation to rewrite, no promoted entry to rename. This is the only window in which the identity scheme is a text edit.

**The CLI has no promotion extension point.** `dist/core/specs-apply.js:64` is the promotion site and reaches for `specs/` alone; there is no `adr` string anywhere in the CLI's `dist/`. Anything a fork adds must reach its permanent home through artifacts the fork itself owns, or through a wrapper that not every route runs.

**Glob completeness is one matching file.** Verified in the installed CLI:

```js
export function artifactOutputExists(changeDir, generates) {
    return resolveArtifactOutputs(changeDir, generates).length > 0;
}
```

`dist/core/validation/validator.js:121` separately hardcodes `path.join(changeDir, 'specs')`, so an `adr/` directory is invisible to delta validation — no false "zero deltas", and no risk of a destination file being mistaken for a capability.

## Goals / Non-Goals

**Goals:**

- A durable decision cannot be settled and then land nowhere.
- Promotion runs on every route, not only the fleet's.
- Identity that two parallel branches cannot collide on.
- Supersession that reads in order without anyone checking that it does.

**Non-Goals:**

- **Backfilling the library.** It ships empty and stays empty here, for the reason the `adr-artifact` change gave: the cabinet's shape should not be argued from whichever items happen to be at hand.
- **A machine validator for `adr/`.** The base tooling's validator hardcodes `specs/`, so `adr/` is unchecked. Named as a risk below and left to a later change; the landing gate is the only interim check.
- **Migrating other in-flight changes.** Any change carrying an `adr.md` stops satisfying its artifact once `generates` is a glob, and is migrated after this lands. Designing around an in-flight change would compromise this one.
- **Fixing the dangling `ADR-0007`/`ADR-0009` strings.** They live in user-level skills outside this repo. The new scheme makes them unable to collide, which is all this repo can do.

## Decisions

### D1 — The destination is the filename, not a field

Each file under `adr/` names the document it edits; the path carries the routing exactly as it does for `specs/<capability-path>/spec.md`.

*Alternatives.* A **`Home:` field on each entry** in a single `adr.md` keeps `generates` unchanged and is much cheaper — but it puts two body genres under one heading (a library entry needs trigger terms and a decision record; a destination entry needs a replacement passage) distinguished only by the shape of the entry's title. That is implicit typing, and this artifact has already been bitten once by an authoring rule that misfired on a cold reader. The two shapes still differ — entries carrying trigger terms and a decision record, versus sections of a destination document — but they cannot be two template files: an artifact's `template` is a single required string, which is why the package's own globbed `specs` artifact carries one `spec.md`. The library shape stays the template; the destination shape is stated inline in the instruction, beside the rule that produces it. A **flat `## ROUTED ELSEWHERE` section** has the same defect in a smaller space, and needs a bespoke "what does this displace" field that `MODIFIED` already provides for free once the delta targets a document.

### D2 — `adr/index.md` is always written

The `adr-artifact` change rejected a directory on a real constraint: *"a glob `generates` needs at least one matching file to read complete, so an empty ADR set would need a placeholder file, which needs a convention naming it, which needs a rule saying do not promote it."*

That argument was aimed at **one file per ADR**, where an empty set means zero files. Under one file per **destination**, the library is itself a destination and its file is always present — not a placeholder needing a do-not-promote rule, but a meaningful delta that is empty when the library does not change. The constraint dissolves without being overruled.

`index.md` is the honest name: every library change touches `openspec/adr/INDEX.md`, whether an entry is added, modified, or retired, so it is the one destination invariant across all three. The instruction must preempt the misread it invites — **the file carries entries, never index rows**, which stay derived from each entry's trigger terms.

"Always written" is a convention, not a guarantee. Glob completeness is satisfied by *any* single match, so a change writing only `adr/database.md` reads complete with no library file at all. That is the same shape of gap this change indicts, so it is named rather than assumed away: the landing gate checks the library file exists, and until a real validator lands that check is all there is.

### D3 — A destination file deltas against the document, with the section as its unit

This is what makes `ADDED`/`MODIFIED`/`REMOVED` work unchanged against prose. A rule's own novelty is irrelevant; what matters is whether the destination's *text* is new or altered. A new rule joining an existing list is `MODIFIED` carrying that whole list.

Carrying the section whole is the same discipline `specs` runs for the same stated reason — partial content loses detail at promotion. It also has a consequence worth naming: because the delta holds finished text, promotion becomes a paste rather than a translation, which is what makes D4 safe.

### D4 — Promotion moves into `tasks`; the landing skill verifies

`tasks` is fork-owned and `/opsx:apply` works the list, so both ends sit inside openspec and every route carries promotion. `/landfall` keeps its existing gate and loses the doing, which now catches a skipped task instead of being the only thing between a decision and oblivion.

*Alternative rejected.* Leaving promotion at landfall on the grounds that it mirrors spec syncing — both deltas against a library, both rolled in at archive. The symmetry is superficial: spec promotion is compiled into the CLI and fires on every archive path, ADR promotion is a section in one repo-owned skill. They are described alike and are not alike, which is exactly why the defect went unnoticed.

`tasks` likely needs `requires: adr` directly; today it reaches `adr` only transitively through `design`.

### D5 — `YYYY-MM-DD-kebab-title.md`

No allocator, so nothing to coordinate across branches. Self-describing in a citation, where an ordinal says nothing. Textually incapable of colliding with another project's `ADR-NNNN` strings, retiring a defect the ordinal scheme accepted rather than solved.

*Alternatives.* **Keeping `NNNN`** fails the branch case silently — two branches mint different filenames under the same ordinal, so git raises no conflict. **Name only, no date** is shorter and was the first choice, until supersession broke it: a redirect carries no trigger terms and therefore no index row, so the directory listing is the only view of retired entries — and under names alone that listing carries no relationship between a redirect and what replaced it, interleaving dead entries among live ones with nothing to distinguish them. Dates restore the stacking. They are not load-bearing for correctness — D6 handles that — so an odd date is a legibility problem, not a defect.

The date is a **birth** date and never moves, including on a redirect. Citations resolve by filename, so it could not move anyway.

### D6 — Only `ADDED` may supersede

This converts a check into an invariant. A date rule would need someone to compare two filenames and reject a backward redirect; restricting supersession to added entries makes the backward redirect unconstructible, because an added entry is always newer than anything already in the library.

The rule buys more than ordering. *"We reverted to the earlier position"* is itself a decision with its own context — what was tried, what broke, why the older answer turned out right. Redirecting the newer entry to the older one leaves that reasoning homeless, and the restored entry reads as though it was never challenged. Adding a new entry forces it into the record. This is why restoring an older position adds rather than redirects, and why the restored entry becomes a redirect too: two live entries holding one position is the drift the library exists to prevent.

`MODIFIED` needs a test an author can apply and a reviewer can check, and "small in scope" is not one — a large rewrite that changes nothing a reader does is still a modification. **Would a reader following this entry now act differently?** is the test.

Two live entries holding the same position is an invalid state, not a case the rules bend for: the delta that added the second failed to notice the first. It is repaired out of band, and the trigger-keyed index surfaces it as two rows sharing a left cell. No repair tooling is built here; the precedent is `spec-hygiene`, where a known-origin bad state gets a repair skill and the rule itself carries no carve-out.

### D7 — The change migrates its own `adr` artifact

Once `generates` is `adr/**/*.md`, a file named `adr.md` no longer matches it — `resolveArtifactOutputs` stats the literal path when the pattern has no glob character and globs otherwise. So the flag flip alone would leave this change's own artifact unsatisfied, mid-apply.

It therefore moves its own `adr.md` to `adr/index.md` in the same edit that flips the flag. No bootstrap exception, no window in which the change fails its own schema.

The file stays empty, and that is the correct output rather than a workaround: under the instruction in force while this change is planned, every rule it settles lives in a prose channel — the `adr` instruction, `INDEX.md`, the landing skill — and a rule living in a prose channel earns no entry. Reading an empty `adr.md` here as a symptom of the defect being fixed would be a misreading; the defect is that a routed rule produces *nothing anywhere*, not that the library delta is empty.

### D8 — No capability spec; `skip_specs: true`

Two earlier drafts of this change carried a capability spec, each justified by pointing at an existing one. That reasoning is void: the spec corpus is not a calibration source, and a spec that should not have been written is not a licence to write another.

Applying the test instead — *if the implementation can change without changing externally visible behavior, it does not belong in a spec* — nothing here survives. Where a decision is filed, how a destination delta is written, when one entry supersedes another, what identifies an entry: every one is instruction text an agent reads. Reword any of it completely and no output differs, because nothing executes it. "The artifact completes", "a filed decision reaches its destination", "landing refuses" are the same thing in disguise — an agent working a checklist, with no exit code, stdout, or row to assert against.

So the rules live in exactly one place, the `adr` artifact instruction, which is read whenever the artifact is written. A spec restating them would be a second home for a rule, which is the defect this change exists to remove.

### D9 — The shape the rewritten instruction must have

Tasks name edits; they cannot carry a document's coherence. The `adr` instruction is the whole deliverable, so its required shape is fixed here.

Six sections, in this order. Each states the decision named beside it — the decision is the contract, and this list does not restate it.

| § | States | From |
| --- | --- | --- |
| 1 | What the artifact is: one file per destination, filename convention, destination path inside the file, collision rule | D1 |
| 2 | Where a decision goes, including that routing away never produces no entry, and the anti-bloat constraint | D2, and Open Questions |
| 3 | What an empty library file means | D2 |
| 4 | Both delta shapes — the library's, and the destination's inline | D1, D3 |
| 5 | Library identity | D5 |
| 6 | Supersession, with the `ADDED`/`MODIFIED` boundary test | D6 |

#### How it must be written

Per `.claude/basics.md`, which governs everything written in this repo, plus two constraints this artifact's own history earned:

**State rules as rules, not as advice to the author.** The predecessor's gate 3 was written as guidance to whoever was picking a term, and a cold reader inverted it.

**Every rule preventing a specific misreading names that misreading.** The reader about to make it is exactly the reader who will not infer it.

#### The one sentence that cannot be paraphrased

*Routing a decision away from the library never produces no entry.* It is the change's reason for existing and must appear flat, not as an implication of the surrounding rules.

#### The anti-bloat constraint is fixed text

Section 2 carries it: a decision may only be filed against a channel that already fires at its trigger. It is this change's one unvalidated call (see Open Questions) and is written as stated — not softened, not widened. If it proves wrong a later change corrects it, not an author's discretion mid-edit.

### D10 — The landing gate is a checklist, not enforcement

Tasks 5.1–5.3 produce prose that an agent reads and acts on. That is not verification in the sense `openspec validate --strict` is verification, and the instruction text must not claim otherwise — a gate that reads as machine-checked when it is agent-performed is a worse position than an acknowledged checklist, because it stops anyone building the real thing.

So the gate is written as what it is, and the artifacts say plainly that `adr/` has no machine validation: the base validator hardcodes `specs/`, and a script that checks destination files resolve is a later change. This is named in Risks rather than papered over.

## Risks / Trade-offs

- **Bloat.** Today, failing the library test produces nothing, so the filter is self-enforcing. After this change it produces a *file*, and the cost of claiming a rule is durable falls to near zero → the load-bearing constraint moves to the destination: a decision may only be filed against a channel that **already fires at its trigger**, and where none exists it is a library entry or it is not durable. Untested against any change but the two that motivated this one. Carried as an open question.
- **No machine validation of `adr/`.** `specs/` gets `openspec validate --strict`; `adr/` gets nothing, because the validator hardcodes `specs/` → the landing gate grows to check that each destination file names an existing repository file and that each `MODIFIED` heading resolves to a real section in it. Mechanical, fails loudly, and cheap. A real validator is a later change.
- **Section-whole `MODIFIED` is verbose.** Spec requirements are small by design; documentation sections are not, so changing a clause can mean pasting many lines → accepted, for the reason `specs` accepts it: a partial edit loses detail at promotion, and this artifact's entire failure mode is detail that never arrives.
- **The `adr` declaration position is load-bearing.** Declared after `design`, the artifact is never generated at design time and nothing errors — `status` reads `ready` forever → the position stays between `proposal` and `specs`, and the YAML comment stating why stays with it. Changing `generates` to a glob must not move the declaration.
- **Every in-flight change carrying `adr.md` breaks on the flag flip.** Its `adr` artifact reads incomplete, and because `adr` is declared before `specs`, a continue-loop will target it and scaffold `adr/index.md` beside the orphaned file → in-flight changes are migrated after this lands, by moving `adr.md` to `adr/index.md`. Accepted deliberately: designing around an in-flight change would compromise this one.
- **A destination the change is already editing gets its content twice.** Under the new rules a decision is filed as a destination delta even when the same diff edits that destination — this change is its own example, since filing its instruction rewrite properly would mean a destination file restating the task list's own output → accepted for uniformity: a conditional rule that fires only when the destination sits outside the diff is exactly the distinction proposal §A shows nobody can be relied on to draw. The cost is real and lands on authoring, not on correctness.
- **The library file is not structurally guaranteed.** See D2 → the landing gate checks it; a validator is a later change.

## Migration Plan

Nothing to migrate. `openspec/adr/` holds `INDEX.md` with no rows, so the identity and supersession changes are text edits to instructions that have never been exercised against a real entry.

Order of edits:

1. Schema fork — `adr` artifact's `generates` and instruction; `tasks` instruction and its `requires`. Declaration position untouched.
2. Templates — `adr.md` becomes the `adr/index.md` template; add a destination-file template.
3. `openspec/adr/INDEX.md` lead-in — identity scheme, supersession rule, and the derived-rows statement restated.
4. `/landfall` — promotion section becomes verification; description updated with it.

**No rollback is needed and none is designed.** Every edit is to instruction text and templates; reverting the commit restores the previous behaviour exactly, because no data structure changes and nothing has been written under the new scheme.

**The fork survives `openspec update`, which clobbers only the package directory.** On the next update, this artifact reconciles against the updated package `spec-driven` schema like the other three local additions.

## Open Questions

- **Does the "channel that already fires" constraint hold as the sole brake on bloat?** Answerable by walking decisions from three or four archived changes and asking, for each, whether it would produce a file under `adr/` and whether that file would earn its read. Deferrable: it changes instruction wording, not the artifact's shape, the task breakdown, or any requirement here.