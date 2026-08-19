# ADR artifact rework: destination routing, structural promotion, and an allocator-free identity

## Why

The `adr` artifact landed on 2026-08-17. Designing the first change to use it exercised it end to end and surfaced three structural defects, all cheap now for one reason: **`openspec/adr/` holds `INDEX.md` and nothing else** — no entries, no rows.

### A. A decision routed away from the library produces nothing

The instruction's route-away rule is sound: a rule whose trigger is already served by a prose channel earns no entry, because *"one home for a rule beats a complete argument split across two."* Its **output** is null. Nothing records that a decision was made, where it goes, or that it has not got there yet.

Nothing routes a routed rule to a task, either. `/embark-write-tasks` reads `specs` and `design`; the `tasks` artifact requires `specs` and `design`. The proposal's Impact section is visible in apply's context but nothing consumes it — so a rule reaches its destination only if an author both remembers it and someone reviews for it.

That is what happened designing `profiles-schema-phase-3`. Two durable rules were derived and correctly routed to `DATABASE.md` in that change's design — never replace a uniqueness constraint by drop-then-create under a driver with no interactive transactions, and reach for a single data-modifying CTE where two writes need atomicity. Neither was recorded anywhere that would carry it; the owner caught the omission in review and an Impact bullet was added by hand. The change is still mid-planning, so nothing was lost — the point is that nothing structural would have caught it, and the artifact built to hold durable decisions held neither.

The `adr-artifact` change hit the same case without noticing, because it escaped by luck: *"This change's own two candidate decisions fail gate 1 and are not entered"* — and both destinations happened to be files that change was already editing. Routing away works when the destination is inside the diff and evaporates when it is not. Nothing distinguishes the two.

### B. Promotion is orphaned from the artifact that produces it

The base tooling promotes `specs/` and offers no extension point for anything else (`dist/core/specs-apply.js:64`). ADR promotion lives instead in `/landfall`, a repo-owned fleet skill.

There is **no mention of ADRs anywhere in the CLI**, nor in `/opsx:archive` or the archive skill. Either one archives a change with its `adr.md` inside, unread, and the library silently never learns. Specs and ADRs are described alike — deltas against a permanent library, rolled in at archive — but one is guaranteed by the tool and the other by a convention only one route honours.

### C. The ordinal allocator does not survive parallel branches

`NNNN` is a centralised allocator ("take the next unused ordinal from `INDEX.md`") in a system where changes are developed on independent branches. Two branches both mint `0012-*` with **different filenames**, so git raises no conflict — the likely outcome is silent duplicate ordinals rather than a merge someone must resolve.

The scheme also carries a defect its own design recorded and accepted: *"Note the two existing dangling `ADR-0007` / `ADR-0009` references live in **user-level** skills templated from another project and refer to nothing here; the numbering starting at `0001` will eventually collide with those strings textually."*

## What Changes

- **`adr/` becomes a per-destination directory.** Each file names the file it edits — `adr/index.md` for the ADR library, `adr/database.md` for `DATABASE.md` — with the exact destination path stated inside, and path segments added to a filename only where two destinations would collide.
- **A routed rule deltas against its destination document.** The unit is the destination's own section; `MODIFIED` carries that section whole, as it will read after the change.
- **BREAKING (workflow): promotion moves from `/landfall` into `tasks`.** The `tasks` artifact cuts a sync task per `adr/` file, so promotion is carried by the change's own artifacts rather than by one wrapper. `openspec archive` does not work a task list — the point is that it no longer needs to.
- **`/landfall` verifies and no longer promotes**, keeping its gate as a fleet backstop that now catches a skipped task.
- **BREAKING (identity): `NNNN-kebab-title.md` becomes `YYYY-MM-DD-kebab-title.md`.** No allocator, branch-safe, self-describing in citations, and textually incapable of colliding with another project's `ADR-NNNN` strings. The date is a birth date and never changes, including on a redirect.
- **Supersession is forward-only by construction.** Only an `ADDED` entry may supersede; `MODIFIED` may never introduce a redirect, so a backward redirect is unconstructible rather than caught.

Two entries holding the same position is an invalid state, not a case the rules accommodate — the delta that added the second failed to notice the first. The trigger-keyed index surfaces it as two rows sharing a left cell.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change declares `skip_specs: true`.

Everything it alters is instruction text, a template, a filename convention, and a landing gate — all read and carried out by an agent. Nothing executes, so there is no externally visible behavior to contract: the wording of every rule here could be replaced wholesale without any observable output differing. The one mechanical consequence, `generates` becoming a glob, is a configuration value consumed by the base tooling rather than behavior this repository implements.

**Spec-corpus check performed, no delta owed.** Grepping every active spec for the surface this change touches returns only the string `ADRIFT` in `map-workflow`, `trunk-workflow`, and `anchor-and-run-aground` — a routing label, unrelated. No active spec governs the ADR library, ADR promotion, or the `adr` artifact. `trunk-workflow` carries a `/landfall` gate requirement, but its list already omits landfall's existing ADR verification step, so it is not the closed enumeration a new gate would modify.

## Impact

- **Schema fork** — `openspec/schemas/spec-driven-review/schema.yaml`: the `adr` artifact's `generates` becomes a glob, and its instruction gains the destination convention, the supersession rule, and the `ADDED`/`MODIFIED` test. The `tasks` instruction gains the promotion tasks and a direct `requires: adr` (it reaches `adr` only transitively through `design` today). **The `adr` declaration position between `proposal` and `specs` is load-bearing and must not move** — an artifact declared after `design` is never generated at design time, silently. The file's header comment describing the local additions goes stale with the change.
- **Templates** — `openspec/schemas/spec-driven-review/templates/adr.md` becomes the `adr/index.md` template. An artifact carries exactly one template, so a destination file's shape is stated inline in the instruction rather than as a second template file.
- **`/landfall`** — the ADR promotion section becomes verification-only; the ordinal allocation step goes; the frontmatter `description` still says landfall *"Promotes the change's ADR delta into openspec/adr/"*.
- **`openspec/adr/INDEX.md`** — the lead-in states the `NNNN` convention, "ADR numbers are never reused", and the derived-rows rule. The first two are restated; the third stands.
- **This change's own `adr` artifact migrates with the flag.** Once `generates` is a glob, a file named `adr.md` no longer matches it, so this change moves its own `adr.md` to `adr/index.md` in the same edit. Other in-flight changes are migrated after this lands, not designed around.
- **No runtime, no application code.** Nothing in `app/`, `lib/`, `db/`, or `drizzle/` is touched. `npm run test:coverage` and `npm run test:e2e` have nothing to run; `lint`, `tsc --noEmit`, and `build` still apply.
- **Nothing in the library to migrate** — `openspec/adr/` has no entries and no rows. Two in-repo strings do reference the old form: `INDEX.md`'s own illustrative `ADR-0007`, and an `ADR-0009` example at `.claude/handoffs/handoff-basically-contract-blocks.md:73`. The user-level skills carrying the dangling references (11 occurrences across 4 files) are outside this repo and not this repo's to fix; the new scheme makes them permanently unable to collide.
- **No issue, no map** — a pure tooling change to the schema fork and the fleet's own skills, which this repo does not cut issues for. It sits outside every open map's Destination and lands on a plain descriptive commit rather than an `issue-<N>:` one.
