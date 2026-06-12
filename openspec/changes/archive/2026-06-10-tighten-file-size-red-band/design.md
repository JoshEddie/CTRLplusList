# Design: tighten-file-size-red-band

## Context

The three-band file-size policy (green <300, yellow 300–500, red >500) is bound by the `testing-foundation` requirement "File size SHALL be lint-enforced as three bands" and enforced by two rules in `eslint.config.mjs`. Both rules count code lines only — comments and blank lines are free. The thresholds were originally picked with total lines in mind, so the enforced bands run ~13% looser than intended (repo-wide code/total ratio: 0.866). Current repo state: largest production file is 310 code lines; 2 files sit in yellow; nothing is within 90 lines of red.

## Goals / Non-Goals

**Goals:**

- Bring the hard ceiling (red) closer to the original total-lines intent: 400 code lines ≈ 462 total.
- Keep the change zero-impact on today's lint output — tighten before anything occupies the 400–500 range.
- Update every canonical home of the band text in one change (eslint config, spec, CLAUDE.md).

**Non-Goals:**

- Moving the yellow threshold. It stays at 300.
- Touching the test-file exemption or any test-suite size figure.
- Decomposing any existing file — nothing newly flags.

## Decisions

### Red 500 → 400; yellow stays 300 (asymmetric tightening)

The exact code-line translation of the original intent (300/500 total) is ~260/~433. Moving red to 400 is costless today (zero files in 310–500) and the band-count pressure only escalates, so now is the cheapest moment. Moving yellow to 250 was considered and **rejected**: it would grow the standing-warning population from 2 to 7 files, and the five newcomers (`lib/data/list.actions.ts`, `ChooseItemsForm.tsx`, `db/schema.ts`, `lib/data/listItems.actions.ts`, `lib/data/item.actions.ts`) are mostly files deliberately shaped in `reorganize-data-layer` or canonically cohesive (`db/schema.ts`) — they would become permanent yellow residents, diluting the only tolerated warning class into wallpaper. The resulting 100-code-line yellow window (vs the former 200) also makes yellow a genuine final-approach signal for red.

### Keep `skipBlankLines`/`skipComments` semantics

Counting code lines is retained as a feature, not corrected as a bug: documentation should not consume size budget. The threshold moves; the counting basis does not.

### Test-suite exemption untouched

The "Test files are exempt" scenario's illustrative "exceeds 500 lines" figure stays. Test files are governed by structural conventions (one lane per source module), not a line count, so there is no test-side threshold to move in lockstep.

## Risks / Trade-offs

- [Future cohesive file legitimately needs 400–500 code lines] → The policy's only disposition is decomposition by table cohesion/domain; the repo's history (largest-ever production file ~310 code lines) suggests this is acceptable. If it ever genuinely binds, raising the threshold back is a one-value spec modification — cheap and explicit, unlike an `eslint-disable`.
- [Band text drifts across its three homes] → All three (eslint.config.mjs, testing-foundation spec, CLAUDE.md) are updated in this change; the spec remains the normative home per CLAUDE.md's pointer.
