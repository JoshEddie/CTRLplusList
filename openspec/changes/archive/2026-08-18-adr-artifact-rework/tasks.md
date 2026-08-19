# Tasks — adr-artifact-rework

Every edit is instruction text, templates, or markdown — no runtime and no application code. **`npm run test:coverage` and `npm run test:e2e` are omitted**: nothing executable changes, so neither suite has anything to run against this change. The other three gates apply and are tasked in §8.

Other in-flight changes carrying an `adr.md` stop satisfying their `adr` artifact once §1.1 lands. Migrating them is deliberately out of scope — they are moved to `adr/index.md` after this change, not designed around.

## 1. Schema fork — the `adr` artifact

- [x] 1.1 In `openspec/schemas/spec-driven-review/schema.yaml`, change the `adr` artifact's `generates` from `adr.md` to `adr/**/*.md`, **leaving the declaration between `proposal` and `specs` exactly where it is** — and in the same edit move this change's own `openspec/changes/adr-artifact-rework/adr.md` to `adr/index.md`, which stops matching the moment the pattern becomes a glob
- [x] 1.2 Extend the YAML comment above the declaration so it states both load-bearing facts: the declaration position (already there) and that `generates` is a glob whose completeness rests on the library file being written
- [x] 1.3 Update the file's header comment, which describes `adr` as recording decisions "as a delta against `openspec/adr/`" — after this change `openspec/adr/` is one destination among several
- [x] 1.4 Rewrite the `adr` instruction to the six-section shape fixed in design D9, in that order. Each section below is done when everything D9 lists for it is stated; D9 is the contract, this list is the checklist
- [x] 1.5 §1 *What the artifact is* — one file per destination, filename convention, destination path stated inside, collision rule, `adr/index.md` names `openspec/adr/`
- [x] 1.6 §2 *Where a decision goes* — the routing rule, the change-scoped decision staying in `design.md`, and the flat statement that routing away never produces no entry. Also the anti-bloat constraint, **written exactly as D9 states it and neither softened nor widened** — design's Open Questions records it as this change's one unvalidated call
- [x] 1.7 §3 *What an empty library file means* — the library is unchanged, never that no decision was made, naming the misreading being prevented
- [x] 1.8 §4 *The two delta shapes* — entries-never-index-rows for the library file, and the destination shape inline (an artifact carries one template, so it has nowhere else to live), with `MODIFIED` reproducing a destination section whole
- [x] 1.9 §5 *Library identity* — `YYYY-MM-DD-kebab-title.md`, birth date never changing including on a redirect, no allocator, and the parallel-branch reason stated so a later reader does not reintroduce a scan as a convenience
- [x] 1.10 §6 *Supersession* — `ADDED`-only, `MODIFIED` never retires, the restore-adds-and-redirects-both rule, and the boundary test with the rename example and the explicit "edit size is not the discriminator"
- [x] 1.11 Remove what the rewrite replaces: the two-condition earns-an-entry test, every `NNNN` reference, and the "take the next unused ordinal" step
- [x] 1.12 Write every edit in this change against `.claude/basics.md` — CLAUDE.md routes all prose there, and it governs weight (own sub-items get a heading), carrier, one-idea-per-line, and saying each fact once
- [x] 1.13 Apply D9's two additional constraints throughout — rules stated as rules rather than as advice to the author, and every rule preventing a misreading naming that misreading
- [x] 1.14 Read the finished instruction end to end against D9's six sections; confirm each is present and that no wording implies a decision can be settled without being filed

## 2. Schema fork — the `tasks` artifact

- [x] 2.1 Add `adr` to the `tasks` artifact's `requires`, so it no longer reaches `adr` only transitively through `design`
- [x] 2.2 Add to the `tasks` instruction: cut one promotion task per file under `adr/` that changes its destination, naming the destination path
- [x] 2.3 State that promotion is a task rather than a landing step, and why — the base tooling promotes `specs/` alone and offers no extension point, so anything else must ride the task list to be carried by every route

## 3. Template

- [x] 3.1 Update `openspec/schemas/spec-driven-review/templates/adr.md` to serve `adr/index.md`: new identity scheme, the entries-not-rows preempt, and a comment naming the instruction as the home of the destination-file shape
- [x] 3.2 Confirm the schema's single `template` reference still resolves and a generated change scaffolds `adr/index.md`

## 4. The ADR library

- [x] 4.1 Rewrite `openspec/adr/INDEX.md`'s lead-in for `YYYY-MM-DD-kebab-title.md`, replacing the `ADR-NNNN` prose form and the "ADR numbers are never reused" sentence — including the illustrative `ADR-0007` in the lead-in itself
- [x] 4.2 State the forward-only supersession rule in the lead-in, alongside the existing redirect explanation
- [x] 4.3 Confirm the derived-rows statement still reads correctly beside the new identity scheme, and leave the term bank and index table untouched — this change alters identity and routing, not the trigger vocabulary

## 5. `/landfall`

- [x] 5.1 Replace the ADR promotion section in `.claude/skills/landfall/SKILL.md` with a verification-only gate: every destination declared under the change's `adr/` carries its entry, and every library entry declared exists and is reachable from the index
- [x] 5.2 Add to the gate: the change carries an `adr/index.md`, since glob completeness alone does not require one
- [x] 5.3 Add to the gate: each destination file names an existing repository file, and each `MODIFIED` heading resolves to a real section in it
- [x] 5.4 Remove the ordinal-allocation step, which no longer exists
- [x] 5.5 Update the skill's `description` frontmatter, which states landfall "Promotes the change's ADR delta into openspec/adr/"
- [x] 5.6 Confirm the empty case still passes: a change whose `adr/index.md` has no entries and which declares no destination files promotes nothing and clears the gate
- [x] 5.7 Write the gate as an agent-performed checklist and do not describe it as validation — per design D10, `adr/` has no machine checking, and prose that reads as machine-checked deters anyone from building the real thing

## 6. Reconcile references

- [x] 6.1 Update `CLAUDE.md`'s fork description, which names `adr` as recording decisions "as a delta against `openspec/adr/`" — no longer true once a delta targets arbitrary destinations
- [x] 6.2 Update the three `adr.md` references in `.claude/skills/embark-design/SKILL.md`: the frontmatter `description`, the grilling line naming `adr.md` as a prior artifact, and the loop order line
- [x] 6.3 Give the `ADR-0009` example at `.claude/handoffs/handoff-basically-contract-blocks.md:73` a disposition — update to the new form or leave with a note; it is the one in-repo citation of the retired scheme outside `INDEX.md`
- [x] 6.4 Grep the tree for surviving `adr.md`-as-single-file and `ADR-NNNN` references, **excluding `openspec/changes/archive/`** (history, never reconciled) and `openspec/changes/profiles-schema-phase-3/` (in-flight, migrated separately). List every remaining hit
- [x] 6.5 Reconcile only hits that are now false. A reference that still reads true is left alone, and any hit outside the files named in §1–§6 is reported rather than edited — the sweep confirms coverage, it does not license unscoped edits
- [x] 6.6 Confirm `.claude/skills/embark-write-tasks/SKILL.md` does not contradict the new promotion tasks

## 7. Verification

- [x] 7.1 Scaffold a throwaway change, confirm `openspec status` reports `adr` complete with only an empty `adr/index.md`, then confirm it still reports complete after adding an `adr/database.md`
- [x] 7.2 On that throwaway, confirm `openspec validate --strict` passes and names no capability for `adr/database.md`, then delete it
- [x] 7.3 `openspec validate adr-artifact-rework --strict` after this change's own `adr.md` has moved to `adr/index.md`

## 8. Gates

- [x] 8.1 `npm run lint`
- [x] 8.2 `npx tsc --noEmit`
- [x] 8.3 `npm run build`
