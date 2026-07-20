## Context

The review family persists a `review.md` per change (spec-review writes round 1; recheck-review appends rounds; landfall gates on the latest verdict). The shared contract for that file — header, round structure, verdict vocabulary, finding shape — lives in `.claude/skills/spec-review/reference/finding-format.md`, which `/recheck-review` reads "for format only, no runtime dependency."

The one part of the loop that never touched the file is the **post-review handoff**: `/spec-review`'s final requirement (`Optional explore-mode handoff`) enters OpenSpec explore mode *in the review chat*, carrying findings as chat context. Owner adjudications there stay as chat prose; `/recheck-review`, reading only the file, re-litigates findings whose dispositions the owner already changed and reaches wrong verdicts.

This change moves adjudication onto the file. Skill/doc-only effort — no app code, tests, DB, or UI surface.

## Goals / Non-Goals

**Goals:**
- Owner adjudications land in `review.md` structurally, not by remembering to transcribe them.
- `/recheck-review` and `/landfall` read the latest round *as amended*, so a re-dispositioned finding is never re-litigated and an adjudication alone can reach `clear to land`.
- Restore `/spec-review`'s independence: it produces the report and points at the adjudication step, invoking nothing.
- Keep `finding-format.md` the single shared contract for every reader.

**Non-Goals:**
- Changing the review-verdict vocabulary (`clear to land` / `findings remain` / `outgrew recheck`; release `ready to cut` / `not ready`).
- Changing `/release-review`'s flow (it inherits the shared-contract additions mechanically).
- The arena rename to `A/B/C` (#271) — this change uses the current `Standard/Convention/Contract` arenas.
- Wiring the `File issue` → GitHub-issue anchor (deferred with #275, per the map).

## Decisions

### D1 — Adjudication is a standalone `/adjudicate-review <change>` skill, not a `/spec-review` tail

The handoff's failure mode is that its output substrate is chat prose. A fresh-session skill whose **only input is `review.md`** inverts that: a fresh chat's prose is worthless, so the file is the only durable substrate — adjudications cannot be left in chat. It also makes the step provenance-agnostic (works for any `review.md`, including the future `/incremental-spec-review`), and restores `/spec-review`'s no-external-dependency invariant (it now invokes nothing at handoff).

*Precedent:* `/recheck-review` is already a file-driven reader of `review.md` that appends to it; `/adjudicate-review` is the same shape.

*Alternative rejected — keep the in-context handoff, just insist it writes the file:* patches the symptom (still relies on the chat remembering to persist), keeps `/spec-review` coupled to explore + grill-me, and forces a carve-out in its no-dependency invariant. The invariant tension disappears entirely under D1.

*Name:* `adjudicate-review`, matching the `<verb>-review` family (spec-review, recheck-review, release-review).

### D2 — Adjudications nest as a `### Adjudications` subsection inside `## Round N`

Each adjudication batch is a `### Adjudications (<date>)` subsection **inside** the latest round block — not a top-level section, not called "Interlude" (the map's working name). Keeping everything for a round in one block makes "the latest round, as amended" a single local parse for every reader. A subsection may follow the last round with no round after it (adjudicating round 1 straight to `clear to land` with no recheck).

Shape:

```markdown
## Round 2 — recheck (2026-07-20)

| # | Severity | Location | Finding | Disposition | Citation |
| s1 | Major | ... | ... | Fix now | ... |
| c3 | Minor | ... | ... | Fix now | ... |

**Verdict:** findings remain

### Adjudications (2026-07-20)

| # | Old → New | Rationale |
| s1 | Fix now → File issue | out of scope; filed #280 |

**Verdict:** clear to land
```

*Alternative rejected — top-level `## Interlude` section between rounds:* readers would have to stitch a round's table to a sibling section by round number; nesting makes amendment local to the round it amends. (Owner directed the nested `###` shape.)

### D3 — Effective verdict = latest verdict-bearing entry in the latest round

When a round carries an Adjudications subsection, its `**Verdict:**` line **overrides** the round's own verdict line. The single rule for every reader: *the effective verdict is the last verdict-bearing entry (round line or Adjudications line) in the latest round.* An adjudication alone can flip `findings remain` → `clear to land`, because the verdict keys off dispositions, not counts.

*Alternative rejected — readers recompute the verdict from amended dispositions, treating the written verdict as advisory:* duplicates the verdict logic into every reader (recheck, landfall) and diverges if any reader's recomputation drifts. The written line is authoritative; `/adjudicate-review` is responsible for computing it correctly when it writes.

### D4 — Write the subsection only when a disposition actually changes

If the grill confirms every disposition as-is, `/adjudicate-review` writes nothing — the round's original table and verdict stand, `round:` is untouched. A subsection is written only when ≥1 finding is re-dispositioned or findings merge, and it records just the deltas.

*Why:* an always-write "audit trail even for confirmations" would make the explore/grill pass a *required* step in the review loop rather than the optional owner action it is. Only-on-change keeps `review.md` free of no-op noise and keeps adjudication optional.

### D5 — Durable finding IDs: `<arena-letter><global-round-integer>`

Findings are ID'd `s1, s2, c3, k4` — the **integer increments globally across all arena tables within a round** (so it is unique on its own), and the **letter marks the arena** for readability (`s`=Standard, `c`=Convention, `k`=Contract). Merges join with `+` (`s1+c3`). This refines the report contract's existing `number` column into a stable reference key that `/adjudicate-review` grills by and `/recheck-review` cites prior findings by.

*Why the letter and the global integer together:* the integer alone guarantees uniqueness (dodging the `c`-Convention vs `c`-Contract collision — `k4` and `c3` differ by number, not letter), while the letter keeps IDs human-scannable by arena. The scheme survives #271's arena rename unchanged: same mechanism, letters become `a/b/c`.

*Alternatives rejected:* per-arena reset (`s1, s2 / c1, c2 / k1`) needs the arena letter as the uniqueness key, reintroducing the collision; bare global integers (`1..N`) lose at-a-glance arena.

### D6 — `finding-format.md` stays the single shared contract

The `### Adjudications` structure, the effective-findings/effective-verdict reader rule, and the ID scheme are authored once in `.claude/skills/spec-review/reference/finding-format.md`. `/adjudicate-review` reads it "for format only, no runtime dependency," exactly as `/recheck-review` does — so the new skill takes no runtime dependency on the spec-review *skill*, only on the shared reference file. Rounds stay append-only; an Adjudications subsection is an addition *within* the latest round block, never a rewrite of a prior round's table.

## Risks / Trade-offs

- **Two entry points after a review** (the review chat ends; adjudication is a separate command) → `/spec-review`'s final line points explicitly at `/adjudicate-review <change>`, same discoverability as today's opt-in prompt.
- **Fresh chat lacks the reviewer's reasoning trail** → by design: `/adjudicate-review` re-grounds each disposition independently from the citation links, a stronger second look than echoing the first chat's reasoning.
- **ID scheme churns at #271** → the scheme is rename-stable (letters swap, mechanism identical); the `s/c/k` letters are the only #271-scoped detail, and #271 already owns that rename.
- **Map body drifts from reality** (still says in-context "Interlude") → a post-land map-body re-sync to match what landed; both refinements stay within #273's promise, so it's normal set-sail/embark tracking, not an `/anchor` bearing move and no re-charter.

## Migration Plan

Markdown-only; no data or deploy migration. Landing order within the change: extend `finding-format.md` (the contract) → author `adjudicate-review/SKILL.md` → repoint `spec-review` handoff → update `recheck-review` and `landfall` to read as-amended. Existing `review.md` files remain valid: no Adjudications subsection means "no amendments," and the effective-verdict rule degrades to the round's own verdict line.

## Open Questions

None — all interview decisions are settled (D1–D6).
