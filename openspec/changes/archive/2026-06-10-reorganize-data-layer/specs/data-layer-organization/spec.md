# data-layer-organization

Structural contract for the application data layer: per-domain module pairs under `lib/data/` (core entities plus table-cohesive satellites), the server-action directive boundary, import topology, and the decomposition rule for oversized modules. Test placement for these modules is owned by `testing-foundation` (colocation, harness, helper-location rules) and is deliberately not duplicated here.

## ADDED Requirements

### Requirement: Data-layer code SHALL be organized as per-domain module pairs under `lib/data/`

`lib/data/` SHALL be the single home for data access. Each data domain owns a module pair: reads in `lib/data/<domain>.ts` (together with their private helpers) and server-action writes in `lib/data/<domain>.actions.ts`. The domains are the three core entities — `user`, `list`, `item` — plus the table-cohesive satellites the size bands forced out at reorganization time:

- **`purchase`** (`purchases` table): claim/unclaim actions, the purchased-items read, and the purchase-spoiler projection (`sanitizePurchases` / `firstNameOf`).
- **`visit`** (`list_visits` table): bookmark and visit-history reads and actions.
- **`listItems`** (`list_items` table): list membership and fractional-ordering actions (`setListItems`, `updatePriority` and their rebalancing helpers). Action module only — it has no standalone reads today.

A domain MAY additionally own **internal modules** — non-directive files whose exports support the domain's actions without being endpoints. At reorganization time: `item.schema.ts` (the `ItemSchema` zod contract), `item.associations.ts` (`updateItemStores` / `updateItemLists`), and `user.session.ts` (the shared `authedUserId` session-resolution helper — see the import-topology requirement). The association helpers are table-cohesive with `item_stores` / `list_items` but MUST NOT live in any `*.actions.ts` module: exporting them from a `'use server'` file would mint new client-callable endpoints — table purity yields to the endpoint constraint.

Domain assignment otherwise follows the question a function answers and the table it owns; the social graph (follows and blocks — `user_follows`, `user_blocks`) folds into **user**, which is inside the goal size band (see the decomposition requirement).

`lib/data/` SHALL NOT contain an `index.ts` barrel; importers SHALL reference the concrete module (`@/lib/data/item`, `@/lib/data/purchase.actions`). No data read or server action SHALL live under `app/actions/**` or in a `lib/dal.ts` monolith.

#### Scenario: A domain's reads and writes share one home

- **WHEN** a contributor needs the data code for claims
- **THEN** the read and the spoiler projection are in `lib/data/purchase.ts` and the claim/unclaim actions in `lib/data/purchase.actions.ts`, and no purchase read or write exists outside `lib/data/`

#### Scenario: A new read joins its domain's read module

- **WHEN** a change adds a new bookmark or visit-history read
- **THEN** it is added to `lib/data/visit.ts`, not to `list.ts`, a new top-level module, an actions module, or any `app/` location

#### Scenario: A new mutation joins its domain's actions module

- **WHEN** a change adds a server action that mutates the follow graph, or one that reorders list items
- **THEN** the former is added to `lib/data/user.actions.ts` and the latter to `lib/data/listItems.actions.ts`

#### Scenario: A non-endpoint helper lands in an internal module, not an actions module

- **WHEN** a change adds a server-side write helper shared by item actions that client code must not be able to invoke
- **THEN** it lives in `lib/data/item.associations.ts` (or a sibling internal module), never as an export of a `*.actions.ts` file

#### Scenario: No barrel module

- **WHEN** `lib/data/` is inspected
- **THEN** no `index.ts` exists, and call sites import concrete modules per domain

### Requirement: The module-level `'use server'` directive SHALL mark exactly the action modules

`lib/data/*.actions.ts` modules SHALL carry the module-level `'use server'` directive; every other module under `lib/data/` (read modules and internal modules alike) SHALL NOT. Every function exported from a `*.actions.ts` module is thereby a client-invocable server-action endpoint — a function SHALL NOT be exported from an actions module unless it is deliberately such an endpoint (type-only exports are permitted). Reads and internal helpers SHALL NOT be made client-invocable by placing them in an actions module for convenience; the one read-shaped endpoint that exists by design, `getItemEditData`, is invoked directly by client components and therefore belongs in `item.actions.ts`.

#### Scenario: Non-action modules are not action endpoints

- **WHEN** any `lib/data/` module other than `*.actions.ts` (read modules `user.ts`, `list.ts`, `visit.ts`, `item.ts`, `purchase.ts`; internal modules `item.schema.ts`, `item.associations.ts`, `user.session.ts`) is inspected
- **THEN** no module-level `'use server'` directive is present, and none of their exports is invocable from client code as a server action

#### Scenario: A server-only read is rejected from an actions module

- **WHEN** a PR places a function in a `*.actions.ts` module that no client module invokes
- **THEN** the PR is rejected at review and the function moves to the entity's read module

### Requirement: `lib/data/` SHALL NOT import from `app/**`

Dependency direction SHALL stay unidirectional: modules under `lib/data/` SHALL NOT import from `app/**`. Within `lib/data/`, `*.actions.ts` modules MAY import any domain's read or internal module (e.g. `item.actions.ts` importing `getUserIdByEmail` from `user.ts`, `ItemSchema` from `item.schema.ts`, and the sync helpers from `item.associations.ts`), and read modules MAY import each other (e.g. `item.ts` importing `sanitizePurchases` from `purchase.ts`, `visit.ts` importing `withVisibility` from `list.ts`); the shared session-resolution helper `authedUserId` is exported from the internal module `lib/data/user.session.ts` for the action modules (it imports `@/lib/auth`, which initializes NextAuth at module scope — keeping it out of `user.ts` keeps read modules free of that side effect).

#### Scenario: No app imports inside the data layer

- **WHEN** the import specifiers of every module under `lib/data/` are inspected
- **THEN** none resolves into `app/**`

#### Scenario: Cross-domain read import is permitted

- **WHEN** `lib/data/item.actions.ts` needs the session user's id, or `lib/data/item.ts` needs the purchase-spoiler projection
- **THEN** the former imports `getUserIdByEmail` from `@/lib/data/user` (or `authedUserId` from `@/lib/data/user.session`) and the latter imports `sanitizePurchases` from `@/lib/data/purchase`, rather than duplicating the logic

### Requirement: Module size SHALL be governed by the three bands, with table cohesion deciding what extracts

`lib/data/` modules SHALL be held to the repo-wide size bands (lint-enforced per `testing-foundation`: red >500 is an eslint error, yellow 300–500 a warning, green <300 the goal). This requirement owns what happens when a data-layer module crosses them:

- **Red (over 500 lines)** — the module SHALL be decomposed. The extraction SHALL be the adjacent sub-domain that maps to its own table (a satellite module pair) or a self-contained non-endpoint unit (an internal module) — never an arbitrary or size-balanced split.
- **Yellow (300–500 lines)** — easy wins SHOULD be pulled out where a clean, self-contained extraction exists; remaining in this band is acceptable when the remainder is one cohesive concern.
- **Green (under 300 lines)** — the goal. It is not always achievable, and cohesion SHALL NOT be sacrificed (e.g. scattering one algorithm across files) just to reach it.

The bands forced the `purchase`, `visit`, and `listItems` satellites plus the `item.schema.ts` / `item.associations.ts` internal modules out at reorganization time (`app/actions/items.ts` was 847 lines, `app/actions/lists.ts` 812 — both in the must-split band). The remaining named candidate is **social-graph** (`user_follows` / `user_blocks` tables) out of `user`, whose modules currently sit inside the goal band. Satellites SHALL NOT be split out while the parent module is within the bands.

#### Scenario: A module crossing 500 lines is decomposed along its table seam

- **WHEN** a `lib/data/` module grows past 500 lines (e.g. `user.ts` after social-feature growth)
- **THEN** the table-cohesive sub-domain (`user_follows`/`user_blocks` reads and actions) extracts into its own satellite module pair, not an arbitrary or size-balanced split

#### Scenario: A moderate-band module with one cohesive concern stays whole

- **WHEN** a module sits between 300 and 500 lines, its easy wins are already extracted, and the remainder serves a single concern (e.g. `listItems.actions.ts`'s fractional-ordering algorithm and its rebalancing helpers)
- **THEN** no further split is required, and splitting the cohesive unit to chase the under-300 goal is rejected at review

#### Scenario: No preemptive split

- **WHEN** a domain module is inside the goal band
- **THEN** no satellite extraction is proposed for it, even for the named candidates
