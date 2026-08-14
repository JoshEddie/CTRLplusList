## Why

The post-review explore handoff was designed when `/spec-review` was self-contained, before it persisted a `review.md`. Living inside the review chat, its natural output substrate is chat prose, so owner adjudications produce walls of prose that never reach `review.md` — and `/recheck-review` then re-litigates findings whose disposition the owner already changed, reaching wrong verdicts (e.g. `findings remain` for a finding re-dispositioned to `File issue`). Now that `review.md` exists, the file *is* the handoff interface, so the adjudication step should be a peer skill that reads it — not a tail bolted onto the producer.

## What Changes

- **New `/adjudicate-review <change>` skill**, run in a fresh session, whose only input is `review.md`: it re-grounds each disposition in the cited code (a concise explore pass, Drops included), runs a `grill-me` interview one finding (or merge-group) at a time via `AskUserQuestion`, and appends its adjudications to `review.md`. Because a fresh chat's prose is worthless, the file is the skill's only durable substrate — adjudications structurally cannot be left in chat.
- **Adjudications persist as a `### Adjudications (<date>)` subsection nested inside the latest `## Round N`**, written **only when at least one disposition changes** (or findings merge). Columns `# | Old → New disposition | Rationale`, with a `**Verdict:**` line beneath carrying the recomputed verdict. When the grill confirms every disposition as-is, nothing is written and the round's original table and verdict stand.
- **Durable finding IDs** in the persisted report: `<arena-letter><global-round-integer>` (`s1, s2, c3, k4` today; `a1, a2, b3, c4` after the arena rename in #271). The integer is unique within a round, so a finding is referable by ID across arenas; merges join with `+` (`s1+c3`).
- **`/spec-review`'s explore-mode handoff shrinks to a pointer** — its final line offers `/adjudicate-review <change>` instead of entering explore mode in-context. `/spec-review` invokes nothing new, preserving its no-external-dependency invariant intact.
- **`/recheck-review` and `/landfall` read the latest round as amended** by its Adjudications subsection: re-dispositioned findings are never re-litigated, and the *effective verdict* is the latest verdict-bearing entry in the latest round (an Adjudications verdict overrides the round's line and can reach `clear to land` alone — the verdict keys off dispositions, not counts).

## Capabilities

### New Capabilities
- `adjudicate-review`: the `/adjudicate-review` skill — a file-driven, fresh-session owner adjudication pass over a persisted `review.md`; defines the `### Adjudications` subsection structure and the shared effective-findings / effective-verdict reader rule that `/recheck-review` and `/landfall` consume.

### Modified Capabilities
- `spec-review`: the explore-mode handoff requirement changes from entering explore mode in-context to emitting a pointer to `/adjudicate-review`; the consolidated-report contract gains the durable `<arena-letter><global-integer>` finding-ID scheme (refining the report's `number` column), and its bundled `reference/finding-format.md` — the shared contract — gains the `### Adjudications` structure, the reader rule, and the ID scheme.
- `recheck-review`: verifying "each open `Fix now` finding in the latest round" becomes "in the latest round **as amended** by its Adjudications subsection," with prior findings referenced by durable ID; re-dispositioned findings are not re-litigated.
- `trunk-workflow`: `/landfall`'s review gate reads the change's **effective** latest verdict (the latest round's verdict as amended by any Adjudications subsection) rather than the round's raw `**Verdict:**` line.

## Impact

- **Skills:** new `.claude/skills/adjudicate-review/SKILL.md`; edits to `.claude/skills/spec-review/SKILL.md` (handoff section → pointer; report-contract ID scheme), `.claude/skills/spec-review/reference/finding-format.md` (Adjudications structure, reader rule, ID scheme — the single shared contract), `.claude/skills/recheck-review/SKILL.md` (read-as-amended, ID references), `.claude/skills/landfall/SKILL.md` (effective-verdict gate wording).
- **Out of scope, mechanical ripple only:** `/release-review` inherits the shared `finding-format.md` additions but its flow is unchanged; the review-verdict vocabulary is unchanged; the arena rename to `A/B/C` (#271) is a sibling chunk — this change uses the current `Standard/Convention/Contract` (`s/c/k`) arenas.
- **Docs, not app code:** no runtime, DB, schema, migration, cache-tag, or UI-primitive surface is touched; no tests exercise these skill markdown files.
- **Map re-sync (follow-up):** map #269 still describes this chunk as an in-context handoff producing "Interlude" entries; both refinements (standalone `/adjudicate-review`, `### Adjudications` naming) stay within #273's promise, so the map body just needs re-syncing to match what landed — normal set-sail/embark tracking, not an `/anchor` bearing move.
