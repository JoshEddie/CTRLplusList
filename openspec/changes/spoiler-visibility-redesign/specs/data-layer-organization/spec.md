## MODIFIED Requirements

### Requirement: Data-layer code SHALL be organized as per-domain module pairs under `lib/data/`

`lib/data/` SHALL be the single home for data access. Each data domain owns a module pair: reads in `lib/data/<domain>.ts` (together with their private helpers) and server-action writes in `lib/data/<domain>.actions.ts`. The domains are the three core entities — `user`, `list`, `item` — plus the table-cohesive satellites the size bands forced out at reorganization time:

- **`purchase`** (`purchases` table): claim/unclaim actions, the purchased-items read, the claim-attribution projection (`sanitizePurchases` / `firstNameOf`), the list-scoped claimed-count aggregate computed from unprojected rows, and the single-item claim summary the reveal confirmation fetches on demand (`claim-attribution`).
- **`visit`** (`list_visits` table): bookmark and visit-history reads and actions.
- **`listItems`** (`list_items` table): list membership and fractional-ordering actions (`setListItems`, `updatePriority` and their rebalancing helpers). Action module only — it has no standalone reads today.
- **`profile`** (`profiles`, `profile_members` and `profile_preferences` tables): the resolution of the acting identity — the seam that turns a session-resolved account id into the account and the profile the request acts as — together with every read and write keyed on a profile id, including the per-member spoiler baseline and the profile-level default that seeds it — both stored in `profile_preferences`, keyed by profile and, for a member baseline, account. It owns a full module pair (`lib/data/profile.ts`, `lib/data/profile.actions.ts`). It exists as its own domain rather than as part of `user` because profiles are their own table with their own lifecycle, and because an account id and a profile id are both strings and indistinguishable at the type level — the module boundary is what makes the kind visible at the import line.

A domain MAY additionally own **internal modules** — non-directive files whose exports support the domain's actions without being endpoints. At reorganization time: `item.schema.ts` (the `ItemSchema` zod contract), `item.associations.ts` (`updateItemStores` / `updateItemLists`), and `user.session.ts` (the shared `authedUserId` session-resolution helper — see the import-topology requirement). The association helpers are table-cohesive with `item_stores` / `list_items` but MUST NOT live in any `*.actions.ts` module: exporting them from a `'use server'` file would mint new client-callable endpoints — table purity yields to the endpoint constraint.

**Where a read is split across the cache boundary, both halves stay in the domain's read module.** An exported read that projects its rows after a cached inner read returns them (per `list-item-management`) SHALL keep the cached inner read private to that module; the exported name is the domain's endpoint and the raw one is a private helper, so no caller can reach unprojected rows. This splits a function, not a domain.

**Composing a stored value with a request's own parameters is not a data-layer concern.** A resolution that combines a value the data layer reads with something carried on the request — the spoiler baseline layered under the current page's transient adjustment — SHALL live in a domain module under `lib/` alongside `lib/listAccess.ts` and `lib/visibility.ts`, not in `lib/data/`. The data layer answers what is stored; deciding what this request means is the caller's.

Domain assignment follows the entity a function is about and the table it owns; a table-cohesive satellite keeps its own reads whatever id kind they lead with (`getListsByProfile` stays in `list.ts`, `getBookmarkedListsByUser` in `visit.ts`). **Between `user` and `profile` only**, that test cannot decide — both domains are about the acting identity, and an account id and a profile id are both strings and indistinguishable at the type level — so assignment there follows the **id kind of the function's leading identity parameter**: a read or action whose first identity parameter carries an account id belongs to **`user`**; one whose first identity parameter carries a profile id belongs to **`profile`**. A function with no identity parameter stays with the entity it is about. The social graph (`user_follows`, `user_blocks`) is split by this rule rather than folded whole into either domain — a follow edge runs account → profile, so its reads divide by which end they take.

Row types, view types and the identity pair SHALL be declared in `lib/types.ts`, not in a data module, so no module owns a shape its siblings and callers depend on. A type derived from a contract the module itself owns stays with it — `ItemData` is `z.infer` over `item.schema.ts`'s schema and cannot move without inverting the dependency — as does a single function's own return shape (`ClaimPicker`). (The `'use server'` requirement's type-only-export allowance governs what an actions module may re-export without minting an endpoint, not where a type is declared.)

`lib/data/` SHALL NOT contain an `index.ts` barrel; importers SHALL reference the concrete module (`@/lib/data/item`, `@/lib/data/purchase.actions`). No data read or server action SHALL live under `app/actions/**` or in a `lib/dal.ts` monolith.

#### Scenario: A domain's reads and writes share one home

- **WHEN** a contributor needs the data code for claims
- **THEN** the read and the claim-attribution projection are in `lib/data/purchase.ts` and the claim/unclaim actions in `lib/data/purchase.actions.ts`, and no purchase read or write exists outside `lib/data/`

#### Scenario: A new read joins its domain's read module

- **WHEN** a change adds a new bookmark or visit-history read
- **THEN** it is added to `lib/data/visit.ts`, not to `list.ts`, a new top-level module, an actions module, or any `app/` location

#### Scenario: The baseline read joins the profile domain

- **WHEN** a contributor needs the read returning an account's spoiler baseline on a profile
- **THEN** it lives with the `profile` domain, whose tables include `profile_members` and `profile_preferences`, and not in `item.ts` or `purchase.ts` where its result is consumed

#### Scenario: A split read keeps its raw half private

- **WHEN** an item read projects its rows outside the cache boundary
- **THEN** the cached raw read is a private helper of the same module and is not exported, so no caller outside `lib/data/` can obtain unprojected rows

#### Scenario: Request composition lives outside the data layer

- **WHEN** a page combines an account's stored spoiler baseline with the adjustment carried on the current request
- **THEN** that composition lives in a domain module under `lib/`, not in `lib/data/`

#### Scenario: A profile-keyed read or action lives in the profile module

- **WHEN** a change adds a read or server action that belongs to the `user`/`profile` pair — keyed on the acting identity rather than on a satellite's own table — and its leading identity parameter is a profile id, or one that needs the profile a request acts as
- **THEN** the read is added to (or imported from) `lib/data/profile.ts` and the action to `lib/data/profile.actions.ts` — not `user.ts`, `user.actions.ts`, `user.session.ts`, or any `app/` location

#### Scenario: A new mutation joins its domain's actions module

- **WHEN** a change adds a server action that mutates the follow graph by profile, or one that reorders list items
- **THEN** the former is added to `lib/data/profile.actions.ts` and the latter to `lib/data/listItems.actions.ts`

#### Scenario: A function taking both id kinds follows its leading parameter

- **WHEN** a read takes both an account id and a profile id — a follow check taking the follower's account and the followee's profile
- **THEN** it lives in the domain of its leading identity parameter, and is not split, duplicated, or placed by which parameter changed most recently

#### Scenario: A non-endpoint helper lands in an internal module, not an actions module

- **WHEN** a change adds a server-side write helper shared by item actions that client code must not be able to invoke
- **THEN** it lives in `lib/data/item.associations.ts` (or a sibling internal module), never as an export of a `*.actions.ts` file

#### Scenario: A shared shape is declared in `lib/types.ts`, not a data module

- **WHEN** a change needs a row type, a view type, or the identity pair in both a data module and its callers
- **THEN** it is declared in `lib/types.ts` and imported where used, not exported from `lib/data/profile.ts` or any other data module

#### Scenario: No barrel module

- **WHEN** `lib/data/` is inspected
- **THEN** no `index.ts` exists, and call sites import concrete modules per domain
