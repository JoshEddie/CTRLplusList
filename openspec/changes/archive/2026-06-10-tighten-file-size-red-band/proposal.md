# Tighten file-size red band: 500 → 400 code lines

## Why

The 300/500 band thresholds were chosen with total lines in mind, but both lint rules count **code lines only** (blanks and comments are free), making the enforced bands ~13% looser than intended — repo-wide, 500 code lines ≈ 575 total lines. The active `testing-foundation` spec ("File size SHALL be lint-enforced as three bands") binds the red threshold at 500, so correcting it is a spec modification. Now is the cheapest moment: the largest production file is 310 code lines, so dropping red to 400 flags nothing today and purely hardens the ceiling before anything grows into the 400–500 range (file count under a band only ever escalates).

## What Changes

- Red band (core `max-lines`, severity `error`) tightens from `max: 500` to `max: 400` in `eslint.config.mjs`; `skipBlankLines`/`skipComments` unchanged.
- Yellow band (`sonarjs/max-lines`, severity `warn`) stays at 300 — the warning window narrows from 200 to 100 code lines, making yellow a genuine final-approach signal rather than distant advisory.
- The `testing-foundation` spec's three-band requirement is updated: red >400, yellow 300–400, green <300.
- CLAUDE.md's "File size (red / yellow / green)" section is updated to match.
- Test-file exemption is untouched: test suites remain governed by structural conventions (one lane per source module), not a line count. The illustrative "exceeds 500 lines" figure in the exemption scenario stays as-is.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `testing-foundation`: the "File size SHALL be lint-enforced as three bands" requirement's red threshold drops from over-500 to over-400 code lines; the yellow band becomes 300–400. Floor (300), scope globs, gate interaction (yellow is the single tolerated warning class), and the no-escape-hatch rule are unchanged.
- `data-layer-organization`: the "Module size SHALL be governed by the three bands" requirement restates the band numbers while deferring to `testing-foundation` for enforcement; the restated figures follow (red >400, yellow 300–400). What-extracts-when (table cohesion, no preemptive split) is unchanged.

## Impact

- `eslint.config.mjs` — one value: `max: 500` → `max: 400` in the production-source `max-lines` rule.
- `CLAUDE.md` — band text in "File size (red / yellow / green)".
- `openspec/specs/testing-foundation/spec.md` — via delta in this change.
- `openspec/specs/data-layer-organization/spec.md` — via delta in this change (band-number restatement in its module-size requirement).
- No application code, no behavior change, no interactive surfaces, no cache tags. Zero existing files cross either threshold (current max: 310 code lines), so `npm run lint` output is identical before and after.
