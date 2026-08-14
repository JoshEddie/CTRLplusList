## Why

The departure arc runs as two skills — `/embark` (board → propose, one shot) and
`/set-sail` (occupy the tree → apply) — and the seam between them is the only
stop in the whole planning bundle. Three consequences, all live:

- **No checkpoint inside the bundle.** `/embark` delegates to `/opsx:propose`,
  which emits proposal, specs, design, tasks, review, acceptance in one turn.
  The owner reviews a finished bundle or nothing. `/opsx:propose` is an
  `openspec update`-generated file that CLAUDE.md forbids hand-editing, so
  `openspec new change` + repeated `/opsx:continue` is the only supported route
  to a mid-bundle stop.
- **`acceptance.md` cannot do its job.** `acceptance-artifact` SHALL draft it as
  "a spec-completeness probe" whose unchainable journeys "fold back into the
  change's delta specs". A one-turn bundle drafts it in the same context that
  wrote the specs and the grill transcript — so it completes routes the
  documents alone cannot support and reports no gap. Contaminated context does
  not weaken this probe, it silently inverts its result. It also sits *after*
  `tasks` in declaration order, so tasks are written against an unrepaired
  contract.
- **The names are English synonyms.** `embark` and `set sail` read as competing
  commands rather than an ordered arc, and neither name reaches the work
  between them.

Inherited constraints, unchanged by this change: `/embark`'s CHARTED-only
allowlist, blocker query, and terrain check (`trunk-workflow`); `/set-sail` as
the only route into occupying the tree and the sole stamper of the `UNDER SAIL`
beacon (`trunk-workflow`, `map-workflow` label machine); the epic route-out to
`/map`'s chart phase as the sole sanctioned exit from the boarding grilling
(`map-workflow`); `acceptance` keeping `requires: [specs]` and staying in
`apply.requires` (`acceptance-artifact`).

## What Changes

- **BREAKING** — `/embark` and `/set-sail` are replaced by five skills sharing
  an `embark-` prefix, with no bare `/embark`. Every reference in the fleet's
  skills and specs is renamed in one pass.

  | Skill | Produces | Owner in the room? |
  | --- | --- | --- |
  | `embark-start` | proposal | yes — terrain check |
  | `embark-design` | specs · design | yes — grilling interview |
  | `embark-qualify` | acceptance · spec and design repair | no — fresh context is the mechanism |
  | `embark-write-tasks` | tasks · review | no — nothing to decide |
  | `embark-apply` | implementation | yes — task loop |

- All five stay skills carrying `disable-model-invocation: true`, matching every
  other fleet member. A colon namespace (`embark:start`) was considered and
  rejected: the colon comes only from a `.claude/commands/<ns>/` directory, and
  no local command sets `disable-model-invocation` — moving the tree-occupying
  step to an untested autonomy contract is not worth a punctuation mark. The
  `embark-` prefix does the same disambiguating work.
- Every boundary between members is a **stop**: the turn ends and the next
  member resumes from disk alone. Each member closes by naming its successor.
- `embark-start` runs today's gate, boarding check, terrain check and epic
  route-out, then `openspec new change` + one `/opsx:continue` to proposal.
  `/opsx:propose` leaves the fleet's route entirely.
- `embark-design` moves the `/mattpocock-skills:grilling` interview to **after** the proposal, so
  the interview aims at grounded Capabilities and Impact instead of first
  establishing what the change is. It then writes specs and design in the same
  turn — the grill walks the design tree, and no artifact on disk holds a design
  decision until `design.md` exists.
- `embark-qualify` is new. A change qualifies when every user route it touches
  runs end to end on what the specs and design say. The member generates
  `acceptance.md` in a chat that did not author the documents and gates the
  change on what that generation surfaces — a **gap** (a step nothing backs →
  the specs gain the scenario) or a **contradiction** (design and specs
  disagree → either file), both repaired through `/opsx:update`, never a direct
  edit. The fresh chat is stated as its first line. Generating `acceptance.md`
  is not by itself a qualification: the artifact's contract binds every
  generator, and this member adds the uncontaminated context and the gate.
- `embark-write-tasks` writes tasks and the review scaffold from disk, with no
  conversation — so the post-repair context rot from `embark-qualify` cannot
  encode the argument into the tasks.
- `embark-apply` is a pure rename of `/set-sail` — same gate, same `UNDER SAIL`
  beacon, same MUSTER lane, same mid-voyage disciplines — plus: `openspec
  validate --strict` as a hard gate before the beacon is stamped, and a closing
  output line suggesting `/opsx:verify` in a fresh chat after the task loop.
- **BREAKING (schema)** — artifact declaration order becomes `proposal, specs,
  design, acceptance, tasks, review`. `/opsx:continue` picks the next artifact
  by declaration order, so this reordering is the whole mechanism. No `requires`
  edits; upstream's `proposal, specs, design, tasks` relative order is preserved
  so the fork stays reconcile-clean on `openspec update`.
- The three design.md cases are settled and split across their two homes.
  `design.md` never sources behavior: it MAY name the concrete **observable** a
  spec leaves unnamed, which is no finding; design asserting the **behavior**
  itself with nothing else backing it is a gap, not a link; design contradicting
  a spec is a contradiction. The schema instruction carries only the first,
  because it decides what a row may assert. The failure types, the repair route
  through `/opsx:update` and the verdict live in `/embark-qualify` — they decide
  what to do about a step the draft could not source, which is the member's
  business and not the artifact's.
- `config.yaml` moves the grill gate from `rules.proposal` to `rules.specs`.
  Rules fire at artifact-creation time, so on `proposal` it fires before the
  proposal exists — the wrong side of the new ordering.
- Skills stop restating `/mattpocock-skills:grilling`'s own instructions (one question at a time,
  concludes only on the owner's confirmation). That text lives in
  the `/mattpocock-skills:grilling` skill itself; the current duplication in `/embark` and in
  `trunk-workflow` is drift bait and is stripped.

## Capabilities

### New Capabilities

None. The arc this change restructures is already governed by `trunk-workflow`.

### Modified Capabilities

- `trunk-workflow`: the `/embark` requirement splits into `embark-start`
  (gate · boarding · terrain · proposal) and `embark-design` (grill · specs ·
  design); a new requirement covers `embark-qualify` and `embark-write-tasks`
  and the stop-per-boundary rule; the `/set-sail` requirements rename to
  `embark-apply` and gain the `validate --strict` pre-stamp gate; the restated
  interview mechanics are removed.
- `map-workflow`: `/embark` and `/set-sail` references in the label machine,
  chunk-birth rules, scouting hand-off and epic re-validation sweep rename to
  the members that own each act — `embark-start` boards and inherits map
  decisions, `embark-apply` stamps `UNDER SAIL` and owns the MUSTER lane.
- `acceptance-artifact`: `acceptance.md` moves from propose-time bundle draft to
  a draft generated between `design` and `tasks`; its unchainable-journey probe
  gains the gap-vs-contradiction distinction and the three design.md cases, and
  repairs route through `/opsx:update`. The contract stays generator-agnostic
  and states no verdict — the fresh chat and the disqualification belong to
  `/embark-qualify` under `trunk-workflow`, so the artifact is equally valid
  when generated by any other route.
- `review-artifact`: the scaffold's requirement is retitled from "at propose" to
  "during planning" and its scenarios stop naming a route the fleet no longer
  takes. The binding behavior — scaffold exists before apply, verbatim,
  `round: 0` — is unchanged; without this the requirement's trigger condition
  can never fire.

## Impact

- **Skills** — `.claude/skills/embark/` and `.claude/skills/set-sail/` move to
  `.claude/skills/embark-start/` and `.claude/skills/embark-apply/`; three new
  skill directories for `embark-design`, `embark-qualify`, `embark-write-tasks`.
  No `.claude/commands/` entries are added.
- **Rename sweep, eight files** — the two skills above plus
  `.claude/skills/anchor/SKILL.md`, `.claude/skills/map/SKILL.md`,
  `.claude/skills/map/reference/issue-cut.md`,
  `.claude/skills/map/reference/label-machine.md`,
  `openspec/specs/trunk-workflow/spec.md`,
  `openspec/specs/map-workflow/spec.md`. Plus `CLAUDE.md` § Trunk workflow, whose
  fleet line names `/embark` → `/set-sail`. Bench archives under `.claude/bench/`
  and prior handoffs are history — left alone.
- **OpenSpec config** — `openspec/schemas/spec-driven-review/schema.yaml`
  (artifact order + `acceptance` instruction), `openspec/config.yaml` (grill gate
  moves to `rules.specs`).
- **No production code.** No `app/**`, `lib/**`, `db/**`, no migrations, no cache
  tags, no interactive surfaces. Doc-only for the test gates.
- **Post-archive scenario rename.** A MODIFIED delta must reproduce every
  scenario name the live spec has, so four scenario headings land with bodies
  that no longer match them: `Propose grilling routes out an epic` (now the
  terrain check), `Embark gates on both signals`, `Propose drafts acceptance
  flows from scenarios`, `Propose emits a review.md scaffold`. They are renamed
  by hand in `openspec/specs/**` after archive, in the same window
  `/finalize-spec-purposes` uses — before the seal commit is staged, so the
  repair rides inside it. Nothing conflicts at that point: the deltas are spent
  and no change is mid-apply. Before renaming, grep open `MUSTER` ticket bodies
  for each heading — a MUSTER plan cites scenario headings verbatim and
  `/embark-apply`'s staleness check would read a renamed one as a stale plan.

### Open, for design.md to settle

- **Label machine.** Five members share the `/embark` lane and only
  `embark-apply` stamps a label. Whether the machine names the namespace or the
  stamping member is undecided.
- **Epic route-out, two sources.** The route-out to `/map`'s chart phase is
  reachable from `/embark-start`'s terrain check (no interview answers to carry,
  no change directory yet) and from `/embark-design`'s grilling (answers plus a
  drafted proposal to re-validate). The specs carry both; whether the fleet wants
  the thinner start-side route at all is design.md's call.

### Known live hazard, accepted

`embark-design` writes `specs` — the binding contract — under a name that does
not mention it. In the design session the owner twice went looking for where
specs get written, found no command naming it, and attached it to the wrong
member. The frontmatter `description` line is the only mitigation. Alternative
names (`write-flows`, `embark-plan`, uniform `write-<artifact>`) were tried and
rejected; see design.md's ledger.
