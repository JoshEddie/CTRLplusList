# Reorganize the data layer into per-entity `lib/data/` modules

Tracking issue: [#116](https://github.com/JoshEddie/CTRLplusList/issues/116) — surfaced by #111 (`test-dal-remainder`, sub-proposal 9.1).

## Why

The data layer is lopsided and split across two homes. [lib/dal.ts](../../../lib/dal.ts) is a 723-line monolith owning all ~26 reads — users, lists, items, purchases, follows, blocks, visit history — while the writes live separately under `app/actions/` with wildly uneven segmentation (`items.ts` 847 lines, `lists.ts` 812 lines vs `user.ts` 12 lines). Reads and writes for the *same* entity sit on opposite sides of the `lib/` ↔ `app/` boundary, so there is no single place that owns "everything about items." The per-file coverage gate made the cost concrete during #111: the whole `lib/dal.ts` monolith hit the floor at once. The **tests** are already split into per-entity lanes (`dal.user` / `dal.list` / `dal.item` / `dal.following` / `dal.visit-history`); the source should follow the same lanes.

### Inherited constraints (binding SHALLs that name the old paths)

These requirements stay behaviorally identical; their path references must move with the code (hence the delta specs below):

- `testing-foundation` [spec.md:602-604](../../specs/testing-foundation/spec.md) — DAL functions (`lib/dal.ts`) and server actions (`app/actions/*.ts`) SHALL be tested under the **node** vitest project against a real migrated PGlite database, never mocked query builders. Also the helper-location rules at spec.md:38-63 (single-`__tests__/`-dir helpers stay local; hoist to `test/helpers/` only when a second directory imports).
- `list-item-management` [spec.md:552](../../specs/list-item-management/spec.md) — the `lib/dal.ts` item reads SHALL project `purchases` through the role-aware sanitizer before any row escapes the DAL boundary; spec.md:315 documents the accepted claim-capacity race at `app/actions/items.ts`.
- `following` [spec.md:202](../../specs/following/spec.md) — first-name derivation via `firstNameOf()` in `lib/dal.ts`; spec.md:276 — the `app/actions/follows.ts` actions SHALL be sequential single-statement calls (no transactions); spec.md:286 — residual races commented inline, mirroring `app/actions/items.ts`.
- `server-endpoint-authorization` [spec.md:8](../../specs/server-endpoint-authorization/spec.md) — scoped to "every Next.js server action under `app/actions/**`"; spec.md:46-47 and :172 enumerate the covered functions per file. After the move that scope clause would cover nothing — it must follow the actions to their new home.

### Constraint correction vs. the issue's mechanics

Issue #116 proposed one file per entity holding both reads and writes, with **function-level** `'use server'` on each write. That cannot work here: React only allows client code to import Server Functions from a module with the **module-level** directive ([react.dev/reference/rsc/use-server](https://react.dev/reference/rsc/use-server): "To import a Server Function from client code, the directive must be used on a module level"; function-body directives are props-only). Many of the ~42 action call sites are `'use client'` modules importing actions directly (e.g. [useItemForm.ts](<../../../app/(main)/items/ui/components/itemform/useItemForm.ts>), [ListForm.tsx](<../../../app/(main)/lists/ui/components/ListForm.tsx>)). A module-level `'use server'` on a mixed file is also not an option — it would expose every read as a callable POST endpoint. So each entity gets a **co-located pair** instead: `<entity>.ts` (reads + helpers) and `<entity>.actions.ts` (module-level `'use server'`, writes only). The folder, not the file, is the entity's single home.

## What Changes

- **New `lib/data/` folder** — module pairs per data domain plus two internal (non-endpoint) modules, tests co-located. Approximate landed sizes from measured spans of the source files:

  ```
  lib/data/
    user.ts                 reads: identity + social graph (follows/blocks)      ~265
    user.actions.ts         'use server' — sign-in/out, follow/block actions     ~210
    list.ts                 reads: list CRUD surface                             ~160
    list.actions.ts         'use server' — list CRUD + visibility                ~345
    listItems.actions.ts    'use server' — membership/ordering (list_items)      ~320
    visit.ts                reads: bookmarks + visit history (list_visits)       ~110
    visit.actions.ts        'use server' — bookmark/visit actions                ~170
    item.ts                 reads: item library/detail                           ~160
    item.schema.ts          ItemSchema zod contract (internal, no directive)     ~100
    item.associations.ts    store/list sync helpers (internal, no directive)     ~195
    item.actions.ts         'use server' — item CRUD                             ~325
    purchase.ts             reads: claims + spoiler projection (purchases)       ~85
    purchase.actions.ts     'use server' — claim/unclaim                         ~280
    __tests__/              relocated per-module test lanes + seed fixture
  ```

- **Module-size policy (owner-set) drives the decomposition, applied at move time.** The bands: **over 500 lines SHALL split** (by table-cohesion); **300–500 SHOULD pull easy wins**; **goal is under 300**, not always achievable. Moved whole, `app/actions/items.ts` (847) and `app/actions/lists.ts` (812) both land in the must-split band, so their satellites extract now: **purchasing** (`purchases` table, items.ts lines 143–389), **visit-history** (`list_visits` table, lists.ts lines 364–513), **membership/ordering** (`list_items` table: `setListItems`, `updatePriority` + rebalancing helpers, lists.ts lines 514–812), and out of the item module the **schema** and **association-helper** internal modules. Nothing lands over ~345; the three modules in the 300–500 band each have their easy win already taken and hold one cohesive concern.
- **The bands are set in stone repo-wide**: lint-enforced as **red / yellow / green** — core `max-lines` at `['error', { max: 500, skipBlankLines: true, skipComments: true }]` (red blocks merge) and `sonarjs/max-lines` at `['warn', { maximum: 300 }]` (yellow is the one tolerated warning class). Both rules count **lines of code** — comments and blank lines are free. Scoped to production source (`app/**`, `lib/**`, `hooks/**`, `db/**`), exempting tests/e2e (seven existing test suites exceed 500 lines and are governed by testing-foundation's one-lane-per-module convention instead), `scripts/**` (`seed-dev-users.ts` is 864 lines of dev tooling), and coverage-carved data literals (`releases.ts`). After this change's splits, **zero production files are red** and the standing yellows are exactly two: `app/api/image-search/route.ts` and `useItemForm.ts` — visible in every lint run, deliberately not fixed here (pure-move scope). A new `CLAUDE.md` "File size" subsection documents the bands and points at the canonical homes (eslint config + testing-foundation spec).
- **Folds**: follows + blocks fold into `user` — measured, it lands inside the goal band (~265 read / ~210 action lines), so the social-graph satellite stays a future candidate rather than splitting preemptively. `updateItemLists` / `updateItemStores` are table-cohesive with `list_items` / `item_stores` but are **internal helpers, not endpoints** — exporting them from a `'use server'` module would mint new callable endpoints (an exposure change), so they live in the non-directive `item.associations.ts` instead: table purity yields to the endpoint constraint.
- **`lib/dal.ts` is deleted; `app/actions/{items,lists,follows,user}.ts` are deleted.** All function bodies move verbatim — no behavior changes, no signature changes, no cache-tag changes.
- **All call sites migrate**: ~51 files importing `@/lib/dal` and ~42 importing `@/app/actions/*` are rewritten to `@/lib/data/*`. No permanent barrel or shim remains at the old paths (a `lib/data/index.ts` barrel would also be coverage-included, unlike `app/**/index.ts`).
- **Tests relocate** to `lib/data/__tests__/` in per-entity lanes, merging the existing dal lanes with the action suites. The duplicated seed fixtures — [test/helpers/seedItemGraph.ts](../../../test/helpers/seedItemGraph.ts) and [app/actions/__tests__/test-helpers.ts](../../../app/actions/__tests__/test-helpers.ts) — consolidate into one fixture.
- **Stale-config note**: issue #116's caveats about per-file `vitest.config.ts` threshold entries and an `eslint.config.mjs` complexity array are stale — neither exists today. Coverage is a universal per-file floor over `lib/**`, so the new modules are gated automatically with zero config edits.
- **Orientation docs** that point at the old layout are updated: `openspec/config.yaml` context ("Data reads in `lib/dal.ts`; mutations in `app/actions/`") and the non-normative scoping note at `items-library-shell` spec.md:13 (`app/actions/**`).

### Not changing

- Any query, validation schema, auth check, return shape, or error contract — pure move.
- Cache freshness wiring: reads keep their tags (`lists`, `items`, `list_visits`, `user_follows`, `user_blocks`); the moved mutations keep their matching `updateTag(...)` calls. No new reads, no new tags.
- The `drizzle-orm/neon-http` no-transactions constraint (DATABASE.md) — relocated multi-statement actions stay sequential single-statement calls.
- `db/schema.ts`, migrations, or any UI surface.

## Capabilities

### New Capabilities

- `data-layer-organization`: the structural contract for `lib/data/` — read module + `'use server'` action module per data domain (core entities `user`/`list`/`item` plus table-cohesive satellites `purchase`/`visit`/`listItems`), internal non-endpoint modules where helpers must not become actions (`item.schema.ts`, `item.associations.ts`), the directive boundary (only `*.actions.ts` carries `'use server'`), the unidirectional import rule (`lib/data/` never imports from `app/`), the numeric module-size bands (>500 split / 300–500 easy wins / goal <300) with table-cohesion governing *what* extracts (social-graph out of `user` is the remaining named candidate), and co-located per-module tests with a single shared seed fixture.

### Modified Capabilities

- `testing-foundation`: (a) path re-pointing — the data-layer test contract names `lib/dal.ts` / `app/actions/*.ts`; re-point to `lib/data/*` and update the scenario references to the relocated test files; (b) **ADDED requirement** lint-enforcing the repo-wide file-size bands (red >500 error via `max-lines`, yellow 300–500 warning via `sonarjs/max-lines`, tests/scripts/data-literals exempt, yellow as the sole tolerated warning class in the pre-merge bar) — this capability owns lint-config governance per its cognitive-complexity precedent.
- `list-item-management`: the purchase-sanitizer boundary requirement moves from `lib/dal.ts` to the `lib/data/purchase.ts` sanitizer consumed by the `item.ts`/`purchase.ts` reads; the documented residual-race location moves from `app/actions/items.ts` to `lib/data/purchase.actions.ts`.
- `following`: `firstNameOf()` home moves from `lib/dal.ts` to `lib/data/purchase.ts` (it serves purchase attribution, beside `sanitizePurchases`); the follows-actions no-transaction requirement re-points `app/actions/follows.ts` → `lib/data/user.actions.ts`.
- `server-endpoint-authorization`: the scope clause "under `app/actions/**`" becomes the `lib/data/*.actions.ts` modules; the per-file function enumerations re-point accordingly.

## Impact

- **Deleted**: `lib/dal.ts` (723 lines), `app/actions/items.ts` (847), `app/actions/lists.ts` (812), `app/actions/follows.ts` (196), `app/actions/user.ts` (12), `app/actions/__tests__/` (5 suites + `test-helpers.ts`), `lib/__tests__/dal.*.test.ts` (5 suites), `test/helpers/seedItemGraph.ts`.
- **Created**: `lib/data/{user,list,visit,item,purchase}.ts`, `lib/data/{user,list,listItems,visit,item,purchase}.actions.ts`, `lib/data/item.schema.ts`, `lib/data/item.associations.ts`, `lib/data/__tests__/` (relocated suites + consolidated fixture).
- **Edited (imports only)**: ~51 `@/lib/dal` importers and ~42 `@/app/actions/*` importers across `app/` and `lib/`.
- **Coverage**: `coverage.include` already spans `lib/**`; each new module is individually held to the 98/98/95/100 per-file floor — the structural payoff this change exists to enable.
- **Specs**: one new capability, four delta specs (the `testing-foundation` delta carries both path re-points and the new size-band lint requirement), one editorial cross-reference fix (`items-library-shell`).
- **Config**: `eslint.config.mjs` gains the two size rules with their scope overrides — the one config edit this change makes.
- **Docs**: `CLAUDE.md` gains a "File size" subsection (red/yellow/green bands, pointing at the eslint config and testing-foundation spec as canonical); `openspec/config.yaml` "Where things live" pointers updated; DATABASE.md/TESTING.md re-checked for `lib/dal.ts` / `app/actions/` mentions during implementation.
