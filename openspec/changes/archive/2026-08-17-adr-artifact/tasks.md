## 1. The template

- [x] 1.1 Create `openspec/schemas/spec-driven-review/templates/adr.md` with
      `## ADDED ADRs`, `## MODIFIED ADRs`, `## REMOVED ADRs` in that order, each
      with a comment describing its entries and no entries under it
- [x] 1.2 Give the ADDED section a commented body shape for one entry —
      `### ADR-NNNN: <title>` plus **Touching** / Context / Decision /
      Consequences — matching what a promoted
      `openspec/adr/NNNN-kebab-title.md` file will carry
- [x] 1.3 State in the ADDED comment that **Touching** takes one or more terms
      from the bank in `openspec/adr/INDEX.md`; that an entry takes EVERY term
      it binds, not only the central one; that an entry fitting no term does NOT
      force the nearest but proposes the term in this delta for review to
      promote alongside it; and that the index row's left cell is derived from
      the field
- [x] 1.4 State in the MODIFIED comment that the copied entry includes
      **Touching** along with the rest of the body
- [x] 1.5 State in the template comment that entries are edited in place, not
      superseded, and that REMOVED gives the resulting one-line stub — both
      forms (`**Superseded** — see ADR-NNNN`, `**Removed** — …`), that the file
      is NOT deleted, that **Reason** stays in the delta and not in the stub,
      that a stub has no **Touching** line and so leaves the index, and that ADR
      numbers are never reused

## 2. The schema declaration

- [x] 2.1 Add the `adr` artifact to
      `openspec/schemas/spec-driven-review/schema.yaml`: `id: adr`,
      `generates: adr.md`, `template: adr.md`, `requires: [proposal]`
- [x] 2.2 Place the declaration BETWEEN `proposal` and `specs` — verify by
      reading the file that no other artifact's position changed and that
      `specs`, `design`, `acceptance`, `tasks`, `review` remain in their
      existing relative order
- [x] 2.3 Add a YAML comment beside the declaration recording WHY the position
      is load-bearing: `/embark-design` loops `/opsx:continue` until `design.md`
      exists, so an artifact declared after `design` is never generated at
      design time, and the failure is silent
- [x] 2.4 Write the `instruction` block: the delta shape, the CLAUDE.md-vs-ADR
      boundary (read frequency, not content type), that the file scaffolds empty
      when the change has no architectural decision, and that promotion to
      `openspec/adr/` happens at landing — cross-reference, do not restate, the
      follow-on's authorship and promotion duties
- [x] 2.5 Confirm `specs`' own `requires` is unchanged and `apply.requires`
      remains `[tasks, review, acceptance]`
- [x] 2.6 Update the fork's header comment: it currently says the trailing
      `review` and `acceptance` artifacts are the local additions — name `adr`
      and correct "trailing", which is no longer accurate
- [x] 2.7 Name **Touching** in the instruction's entry sentence alongside
      Context / Decision / Consequences, stating that it takes bank terms, that
      every binding term is taken, that a missing term is proposed rather than
      forced, and the index-is-derived consequence
- [x] 2.8 Restate the `REMOVED ADRs` bullet so the delta gives the resulting
      stub — which form, and the replacement's ID where there is one — with
      **Reason** staying in the delta, and add the gutted-not-deleted rule to
      the living-documents paragraph, including that a stub leaves the index and
      that numbers are never reused

- [x] 2.9 State gate 1 in the instruction beside the scaffolds-empty paragraph:
      a decision earns an entry only where the channel already firing at its
      trigger carries the rule WITHOUT its reasoning — a lint error earns one,
      an instruction carrying rule and context together does not
- [x] 2.10 State the term-proposal rules in the instruction, where the author is
      when a term is proposed. WHEN first: only where the entry binds work no
      existing term names, rewording or splitting a covering term being a change
      to the shared vocabulary rather than part of writing an entry. Then shape
      — a SURFACE by default and an ACTION only where the action is the trigger;
      must DISCRIMINATE; may be a parameterized family whose instance binds in
      the entry's own cell — and that growth runs through review, never the
      author alone

## 3. The library

- [x] 3.1 Create `openspec/adr/` with its index file and no ADR entries
- [x] 3.2 Write the index: a lead-in stating where entries live
      (`openspec/adr/NNNN-kebab-title.md`) and why the ordinal is zero-padded —
      reader-facing only, since every authoring rule already ships with the
      artifact instruction at the moment it is written
- [x] 3.3 Give the index a trigger-keyed table, not a title list, with the
      header row present and zero data rows — left column headed `Touching…`,
      matching CLAUDE.md's *Read this before touching that* table
- [x] 3.4 State in the index that rows are DERIVED: a row is one ADR's own
      **Touching** line plus its number and title, so nothing is authored at
      index level and the index cannot drift from the library
- [x] 3.5 State in the index lead-in only the READER's half of the removal rule
      — a one-line body means the file is a redirect for a dangling ADR-number
      reference, it carries no **Touching** line and so has no row, and numbers
      are never reused. The gutting procedure and both stub forms stay in the
      artifact instruction, which ships at the moment an entry is gutted
- [x] 3.6 Keep the index free of authoring rules — the CLAUDE.md-vs-ADR
      boundary, the gutting procedure, and promotion at landing are all already
      in the `adr` artifact instruction, which carries rule AND reasoning to the
      author at write time; restating them here is the duplication gate 1 exists
      to prevent, and this file's own gates would condemn it
- [x] 3.7 Add the TERM BANK to the index file as its own table — term plus what
      it covers — seeded with twelve terms, naming the concrete path wherever
      one exists: `Unit Test` (`**/__tests__/**`), `E2E Test` (`e2e/`),
      `Running Tests`, `DB Schema` (`db/schema.ts`), `Migrations` (`drizzle/`),
      `DAL` (`lib/data/`), `DB Queries`, `Seeding / Reset`
      (`scripts/seed-dev-users.ts`, `db:reset:dev`), `Local Dev`,
      `Skills & Agents` (`.claude/skills/`, `.claude/agents/`), `Docs`,
      `Reading a GitHub Issue`
- [x] 3.8 Introduce the bank as the index's VOCABULARY and nothing more — every
      **Touching** cell is one or more of these terms, so the table says what a
      term in that column means. Proposing, shaping, and admitting a term are
      authoring acts and belong to the artifact instruction (2.10)
- [x] 3.9 Confirm the index table itself ships with its header row and ZERO
      data rows — both of this change's candidate decisions fail gate 1, so the
      library ships with a seeded bank and no entries

## 4. CLAUDE.md

- [x] 4.1 Add ONE row to the *Read this before touching that* table pointing at
      the ADR index, keyed on a trigger in the column's existing "Touching…"
      voice — one row, never one per ADR
- [x] 4.2 Extend the `openspec update` fork-reconciliation duty in *Trunk
      workflow* to name `adr` alongside `acceptance` and `review`
- [x] 4.3 Verify no other CLAUDE.md text is touched and the file did not grow a
      new section

## 5. Verification

- [x] 5.1 `openspec validate adr-artifact --strict` passes — no zero-delta
      error, `skip_specs: true` having satisfied it
- [x] 5.2 `openspec list` runs clean and prints the same specs and changes as
      before `openspec/adr/` existed; no warning or error names the directory
- [x] 5.3 `openspec status --change <a change with a proposal and no adr.md>`
      reports `adr` as `ready`, not `blocked`
- [x] 5.4 Run `/opsx:continue` on that change and confirm it selects `adr` —
      not `specs`, not `design` — and writes `adr.md` with the three headings
      and no entries
- [x] 5.5 Confirm `openspec status` on an existing in-flight change is
      unaffected: no previously-complete artifact reads incomplete, and `adr`
      appearing as `ready` blocks nothing, since it is not in `apply.requires`

## 6. Pre-merge

Non-executable change — the diff is markdown and YAML only (`CLAUDE.md`,
`openspec/**`). Per CLAUDE.md's five-gates rule the `test:coverage` and
`test:e2e` gates are omitted rather than run, and carry no checklist item below.
Any executable edit voids this exemption. CI on the `dev` push still runs the
full battery.

- [x] 6.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 6.2 `npx tsc --noEmit` — zero errors
- [x] 6.3 `npm run build` — completes successfully
