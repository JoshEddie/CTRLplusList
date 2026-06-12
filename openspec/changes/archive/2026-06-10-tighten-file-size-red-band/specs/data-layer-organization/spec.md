# Delta: data-layer-organization

## MODIFIED Requirements

### Requirement: Module size SHALL be governed by the three bands, with table cohesion deciding what extracts

`lib/data/` modules SHALL be held to the repo-wide size bands (lint-enforced per `testing-foundation`: red >400 is an eslint error, yellow 300–400 a warning, green <300 the goal). This requirement owns what happens when a data-layer module crosses them:

- **Red (over 400 lines)** — the module SHALL be decomposed. The extraction SHALL be the adjacent sub-domain that maps to its own table (a satellite module pair) or a self-contained non-endpoint unit (an internal module) — never an arbitrary or size-balanced split.
- **Yellow (300–400 lines)** — easy wins SHOULD be pulled out where a clean, self-contained extraction exists; remaining in this band is acceptable when the remainder is one cohesive concern.
- **Green (under 300 lines)** — the goal. It is not always achievable, and cohesion SHALL NOT be sacrificed (e.g. scattering one algorithm across files) just to reach it.

The bands forced the `purchase`, `visit`, and `listItems` satellites plus the `item.schema.ts` / `item.associations.ts` internal modules out at reorganization time (`app/actions/items.ts` was 847 lines, `app/actions/lists.ts` 812 — both in the must-split band). The remaining named candidate is **social-graph** (`user_follows` / `user_blocks` tables) out of `user`, whose modules currently sit inside the goal band. Satellites SHALL NOT be split out while the parent module is within the bands.

#### Scenario: A module crossing 400 lines is decomposed along its table seam

- **WHEN** a `lib/data/` module grows past 400 lines (e.g. `user.ts` after social-feature growth)
- **THEN** the table-cohesive sub-domain (`user_follows`/`user_blocks` reads and actions) extracts into its own satellite module pair, not an arbitrary or size-balanced split

#### Scenario: A moderate-band module with one cohesive concern stays whole

- **WHEN** a module sits between 300 and 400 lines, its easy wins are already extracted, and the remainder serves a single concern (e.g. `listItems.actions.ts`'s fractional-ordering algorithm and its rebalancing helpers)
- **THEN** no further split is required, and splitting the cohesive unit to chase the under-300 goal is rejected at review

#### Scenario: No preemptive split

- **WHEN** a domain module is inside the goal band
- **THEN** no satellite extraction is proposed for it, even for the named candidates
