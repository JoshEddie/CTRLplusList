# Design — reorganize-data-layer

## Context

All ~26 data reads live in [lib/dal.ts](../../../lib/dal.ts) (723 lines); all writes live in `app/actions/` across four unevenly-sized `'use server'` files (`items.ts` 847, `lists.ts` 812, `follows.ts` 196, `user.ts` 12). Tests are already in per-entity lanes (`lib/__tests__/dal.{user,list,item,following,visit-history}.test.ts` plus `app/actions/__tests__/{items,lists,follows,user,visitHistory.actions}.test.ts`), with duplicated seed builders in `test/helpers/seedItemGraph.ts` and `app/actions/__tests__/test-helpers.ts`.

Hard constraints discovered during proposal research:

- **React directive rules** ([react.dev/reference/rsc/use-server](https://react.dev/reference/rsc/use-server)): client code may only *import* Server Functions from a module with the **module-level** `'use server'` directive; function-body directives are props-only. Many action call sites are `'use client'` modules importing actions directly (e.g. `useItemForm.ts`, `ListForm.tsx`, `EditItemButton.tsx`). A module-level directive on a mixed reads+writes file would expose every read as a POST endpoint.
- **Coverage**: universal per-file floor (98/98/95/100) over `lib/**`; `lib/**/index.ts` is coverage-*included* (only `app/**/index.ts` is excluded). There are **no** per-file threshold entries in `vitest.config.ts` and **no** per-file complexity arrays in `eslint.config.mjs` — issue #116's caveats about updating those are stale.
- **No-transactions driver** (DATABASE.md): moved actions stay sequential single-statement calls; `following` spec.md:276 makes this a SHALL for the follows actions.
- **Spec SHALLs name the old paths** — see proposal "Inherited constraints". Active specs govern test placement (`testing-foundation`), the purchase-sanitizer boundary (`list-item-management`), follows-action mechanics (`following`), and action authorization scope (`server-endpoint-authorization`).

## Goals / Non-Goals

**Goals:**

- One folder — `lib/data/` — owns everything about each core entity (user, list, item): reads, writes, tests, fixtures.
- Every moved function lands byte-identical in behavior: same signatures, queries, zod schemas, auth checks, cache tags, `updateTag` calls, error contracts.
- Each new module individually clears the per-file coverage floor.
- Old paths (`lib/dal.ts`, `app/actions/{items,lists,follows,user}.ts`) cease to exist at completion — no permanent shims.

**Non-Goals:**

- No decomposition beyond what the size bands force (see D11): purchasing, visit-history, membership/ordering, and the item schema/association internal modules split now; the social-graph satellite (out of `user`, which lands inside the goal band) remains a documented future extraction, triggered by the bands, not done preemptively.
- No consolidation of the three differing `ActionResponse` types, no broadening of `authedUserId` adoption into item actions, no query or schema changes, no UI changes.
- No renaming of exported functions (call-site edits are import-path-only).

## Decisions

### D1 — Pair of modules per entity, not one mixed file

Each data domain — the core entities `user`/`list`/`item` and the satellites `visit`/`purchase`/`listItems` (D11) — gets `lib/data/<domain>.ts` (reads + private helpers, `'use cache'` where present today) and `lib/data/<domain>.actions.ts` (module-level `'use server'`, writes only); a domain MAY additionally have internal non-directive modules (`item.schema.ts`, `item.associations.ts`) for code that must not become an endpoint. The *folder* is the data layer's single home; the issue's literal "one file per entity" is unachievable without breaking one of two constraints.

Rejected alternatives:

- **Single file, function-level `'use server'` per write** (the issue's proposal) — client components cannot import function-body-level Server Functions (props-only per React docs); ~42 caller files include `'use client'` modules importing actions directly.
- **Single file, module-level `'use server'`** — turns every read into a callable POST endpoint, gutting the server-only posture `server-endpoint-authorization` exists to protect.
- **Refactor callers to receive actions as props** — wholesale consumption-pattern rewrite; violates the pure-move scope.
- **`lib/data/<entity>/` directories with `index.ts`** — barrels under `lib/**` are coverage-included; adds depth for no cohesion gain over flat pair files.

### D2 — No `lib/data/index.ts` barrel

Callers import the concrete module: `@/lib/data/item`, `@/lib/data/item.actions`. A barrel would be coverage-gated dead indirection, and import sites stay greppable per entity.

### D3 — Function and helper placement (the fold map)

Approximate landed sizes are computed from measured function spans of `lib/dal.ts`, `app/actions/items.ts`, and `app/actions/lists.ts`, plus ~15–25 lines of imports per module. Bands per D11: goal <300; 300–500 acceptable once easy wins are taken; >500 forbidden.

| Module | ~Lines | Contents |
|---|---|---|
| `user.ts` | 255 | `getUserById`, `getUserIdByEmail`, `getProfileForUser`, `getFollowingByUser`, `getFollowersOfUser`, `isFollowing`, `viewerHasAnyFollows`, `hasBlocked`, `getBlockedByUser`, `getFollowingFeedUsers` |
| `user.session.ts` | 18 | **exported** `authedUserId` (D5); internal, no directive |
| `user.actions.ts` | 210 | `signInUser`, `signOutUser` (from `user.ts`); `followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser` (from `follows.ts`); its `ActionResponse` type |
| `list.ts` | 160 | `getList`, `getLists`, `getListsByUser`, `getListsSharedByUser`, `getPublicListsByUser`; **exported** `withVisibility` (consumed here and by `visit.ts`) |
| `list.actions.ts` | 345 | `createList`, `updateList`, `deleteList`, `setListVisibility`; `ListSchema`, `VisibilitySchema`, its `ActionResponse` |
| `listItems.actions.ts` | 320 | `setListItems`, `updatePriority`; private `checkListBalance`, `rebalanceList`, `reorderPosition` (lists.ts lines 514–812 — the `list_items` membership/ordering cluster) |
| `visit.ts` | 110 | `getBookmarkedListsByUser`, `getBookmarkStatus`, `getVisitHistoryByUser`; private `withNestedListVisibility` (its only consumers are these reads), importing `withVisibility` from `list.ts` |
| `visit.actions.ts` | 170 | `bookmarkList`, `unbookmarkList`, `clearVisitHistory`, `removeVisit` (lists.ts lines 364–513) |
| `item.ts` | 160 | `getItemsByUser`, `getItemById`, `getItemsByListId`, importing `sanitizePurchases` from `purchase.ts` |
| `item.schema.ts` | 100 | `ItemSchema` + `ItemData` (items.ts lines 41–126 — the large nested zod contract); internal, no directive |
| `item.associations.ts` | 195 | **exported** `updateItemStores`, `updateItemLists` + private `emptyStore` (items.ts lines 470–657); internal, no directive — see note below |
| `item.actions.ts` | 325 | `getItemEditData`, `createItem`, `updateItem`, `archiveItem`, `deleteItem`; its `ActionResponse` |
| `purchase.ts` | 85 | `getItemsByPurchased`; **exported** `sanitizePurchases` + private `firstNameOf` (the spoiler projection is purchase-domain logic; consumed by `item.ts` and here) |
| `purchase.actions.ts` | 280 | `createPurchase`, `removePurchase`; private `resolveClaimIdentity`, `canRemovePurchase`, `RemovePurchaseInput`, `PG_UNIQUE_VIOLATION`; the inline capacity-race comment (items.ts lines 143–389) |

Notes:

- `getItemEditData` is a read by nature but is **exposed as a server action** today (file-level `'use server'`, imported by `'use client'` `EditItemButton.tsx`). It stays in `item.actions.ts` so its exposure surface is unchanged. Reclassifying it is a future change.
- **`item.associations.ts` exists because table purity yields to the endpoint constraint.** `updateItemLists` (`list_items`) and `updateItemStores` (`item_stores`) are private helpers of `createItem`/`updateItem` today — not endpoints. Table cohesion would point `updateItemLists` at the `listItems` module, but exporting it from any `'use server'` module would mint a new client-callable endpoint (an exposure change a pure move must not make). A non-directive internal module keeps them importable by `item.actions.ts` without becoming endpoints.
- `sanitizePurchases` and `firstNameOf` live in `purchase.ts`: the projection's subject is purchase rows and spoiler attribution, and `purchase.ts`'s own read consumes it alongside the two `item.ts` reads. The `following` spec reference (spec.md:202) and `list-item-management` sanitizer requirement re-point there.
- `withVisibility` is exported from `list.ts` (a list-row decorator by nature); `visit.ts`'s `withNestedListVisibility` wraps it for rows carrying a nested `list`. Cross-read-module imports are permitted (D6).
- No co-located `utils.ts` is needed: every private helper lives with all of its consumers, and the helpers that cross modules (`sanitizePurchases`, `withVisibility`, the association helpers) are domain exports of their owning module, not generic utilities.

### D4 — The three `ActionResponse` types stay per-module

They are not identical-by-design: `follows.ts` is `{success, message, error?}` while `items.ts`/`lists.ts` add `errors?: Record<string, string[]>` for field-level form validation. Code that merely looks alike is not a duplication to merge (CLAUDE.md). The folds leave exactly one definition per action module. A future consolidation, if wanted, is its own change.

### D5 — `authedUserId` becomes one exported helper in the internal module `user.session.ts`

`lists.ts` and `follows.ts` carry byte-identical private copies (session → `users.id` via email) — identical-by-design, so it extracts on sight. **Home is `lib/data/user.session.ts`** (an internal non-directive module), NOT the `user.ts` read module as first drafted: the helper statically imports `@/lib/auth`, and `lib/auth.ts` instantiates NextAuth at module scope — putting it in `user.ts` dragged NextAuth initialization into every read consumer, surfacing as unhandled `next/server` resolution errors in ten test suites that mock only `@/db` (discovered during apply; read modules stay side-effect-light). It also cannot live in `lib/auth.ts` itself: tests mock `@/lib/auth` wholesale at the NextAuth boundary, and the helper must stay real so it exercises the mocked `auth()`. `server-endpoint-authorization` spec.md:172 already calls it "the shared `authedUserId` helper". Item actions keep their existing `resolveClaimIdentity` flow untouched — no adoption broadening.

### D6 — Import topology inside `lib/data/`

`*.actions.ts` modules MAY import any `lib/data/*.ts` read module (e.g. `item.actions.ts` → `getUserIdByEmail` from `user.ts`, exactly as `app/actions/items.ts` imports from `lib/dal` today) and the internal modules (`item.actions.ts` → `item.schema.ts`, `item.associations.ts`). Read modules MAY import each other — `item.ts` imports `sanitizePurchases` from `purchase.ts`, `visit.ts` imports `withVisibility` from `list.ts` (D3). Nothing under `lib/data/` imports from `app/**` — the existing unidirectional dependency is preserved and becomes a spec requirement (`data-layer-organization`).

### D7 — Shim-first sequencing, shims deleted before completion

Per the issue's preference for a reviewable diff: (1) move code into `lib/data/`, leaving **plain re-export shims** at `lib/dal.ts` and `app/actions/*.ts` (`export { createItem } from '@/lib/data/item.actions'` — no directive needed; the re-export resolves through to the `'use server'` module, and type re-exports are erased); (2) migrate callers entity-by-entity; (3) delete the shims and old test files. Every step leaves the tree compiling and tests green.

Rejected alternative: **one-shot rewrite** of all ~93 importers in the move step — mechanically fine (the edits are uniform import lines) and kept as the **fallback** if the bundler mishandles re-exported action references from a non-directive shim (verify with a dev-server smoke test at the shim stage; see Risks).

### D8 — One test file per source module

```
lib/data/__tests__/
  user.test.ts              ← lib/__tests__/dal.user.test.ts + dal.following.test.ts
  user.actions.test.ts      ← app/actions/__tests__/follows.test.ts + user.test.ts
  list.test.ts              ← lib/__tests__/dal.list.test.ts
  list.actions.test.ts      ← app/actions/__tests__/lists.test.ts minus the bookmark/visit and ordering suites
  listItems.actions.test.ts ← the setListItems/updatePriority suites from lists.test.ts
  visit.test.ts             ← lib/__tests__/dal.visit-history.test.ts (1:1)
  visit.actions.test.ts     ← app/actions/__tests__/visitHistory.actions.test.ts (1:1)
  item.test.ts              ← lib/__tests__/dal.item.test.ts minus the getItemsByPurchased suites
  item.actions.test.ts      ← app/actions/__tests__/items.test.ts minus the purchase-action suites
  purchase.test.ts          ← the getItemsByPurchased suites from dal.item.test.ts
  purchase.actions.test.ts  ← the createPurchase/removePurchase suites from items.test.ts
```

Mirrors the source structure; keeps each file a sane size (merging whole entities would produce ~60K single files); and respects the differing mock shapes — action suites `vi.mock('@/lib/auth')`, read suites don't — so lanes merge only with like-mocked lanes. The visit lanes are clean 1:1 file moves (the existing suites already split visit-history out); three files need intra-file splits, all along `describe`-block boundaries: `dal.item.test.ts` (its `getItemsByPurchased` blocks go to `purchase.test.ts`), `items.test.ts` (its `createPurchase`/`removePurchase` blocks go to `purchase.actions.test.ts`), and `lists.test.ts` (its `setListItems`/`updatePriority` blocks go to `listItems.actions.test.ts`). The internal modules get no test lane of their own: `item.schema.ts` and `item.associations.ts` are exercised through `item.actions.test.ts` (`createItem`/`updateItem` drive both), which satisfies their per-file coverage floor — v8 attributes covered lines by file, not by which lane invoked them. Test bodies move verbatim (re-nest `describe` blocks as needed); assertions do not change. All files stay `*.test.ts` under the **node** vitest project against PGlite, per `testing-foundation` spec.md:602-604.

### D9 — Fixture consolidation and placement

- Merge `test/helpers/seedItemGraph.ts` + `app/actions/__tests__/test-helpers.ts` into **`lib/data/__tests__/test-helpers.ts`**. After relocation all consumers live in this one `__tests__/` directory, and `testing-foundation` spec.md:38 says single-directory helpers SHALL live in that directory and SHALL NOT sit in `test/helpers/`.
- The two fixtures differ in defaults (e.g. `quantity_limit`: 1 vs unset). The merged builders take **explicit defaults**; where the merge would change what a relocated test seeds, the call site passes the value explicitly. The acceptance check is that relocated suites pass **without assertion edits** — an assertion change signals silently altered seed semantics.
- `test/helpers/seedVisitGraph.ts` moves to `lib/data/__tests__/` too: its only two consumers (`dal.visit-history.test.ts`, `visitHistory.actions.test.ts`) both relocate here, putting it under the same single-directory SHALL.
- `test/helpers/seedFollowGraph.ts` **stays** in `test/helpers/` — 17 importers across many `__tests__/` directories (rails, pages, lib). `db.ts`, `next-cache.ts`, `setup.ts` likewise unmoved.

### D10 — Zero coverage/lint config edits

`coverage.include: ['lib/**', ...]` already gates every new module at the per-file floor; `**/__tests__/**` already excludes the relocated tests and fixture; the eslint cognitive-complexity ceiling is global. This is a deliberate "no work here" decision so implementers don't hunt for the stale config entries the issue mentions.

### D11 — The module-size bands, and the decomposition they force at move time

The owner-set size policy for data-layer modules (also encoded normatively in `data-layer-organization`):

- **Over 500 lines** — must decompose. Table-cohesion decides *what* extracts.
- **300–500 lines** — look for easy wins to pull out; staying in the band is acceptable when the remainder is one cohesive concern with no clean extraction left.
- **Under 300 lines** — the goal; not always achievable, and cohesion is never sacrificed just to hit it.

(This replaces an earlier draft's precedent bar of "larger than the 723-line `lib/dal.ts`", which was arbitrary.) Applied to measured spans at move time:

- `app/actions/items.ts` (847) moved whole would land in the must-split band. Three pulls: the **purchasing** block (lines 143–389, ~247) → `purchase.actions.ts` (~280 ✓); the **association helpers** (lines 470–657, ~190) → `item.associations.ts` (~195 ✓, internal — see D3 note on the endpoint constraint); the **`ItemSchema` block** (lines 41–126, ~100, the 300–500-band easy win) → `item.schema.ts` (~100 ✓). Remainder `item.actions.ts` ≈ 325 — moderate band, pure item CRUD, no clean pull left.
- `app/actions/lists.ts` (812) moved whole would land in the must-split band. Two pulls: the **bookmark/visit** block (lines 364–513, ~150) → `visit.actions.ts` (~170 ✓); the **membership/ordering** cluster (`setListItems`, `updatePriority`, `checkListBalance`, `rebalanceList`, `reorderPosition` — lines 514–812, ~300, all on `list_items`) → `listItems.actions.ts` (~320). Remainder `list.actions.ts` ≈ 345 — moderate band, pure `lists`-table CRUD + visibility, no clean pull left.
- `lib/dal.ts` (723) splits to five read modules, all under 300 (D3 table).
- **`user` does not split**: measured, `user.ts` ≈ 265 and `user.actions.ts` ≈ 210 — inside the goal band. The social-graph satellite (`user_follows`/`user_blocks`, ~160 read + ~195 action lines of it) stays the documented future extraction for when `user` outgrows the bands.

Three modules land in the 300–500 band (`item.actions.ts` ~325, `listItems.actions.ts` ~320, `list.actions.ts` ~345); each has had its easy wins taken and holds a single concern. `listItems.actions.ts` sits just over 300 because the fractional-ordering algorithm and its rebalancing helpers are one unit — splitting them would scatter an algorithm across files to chase a number, which the goal band explicitly does not require.

**Enforcement — the bands are set in stone via lint (red / yellow / green).** Two rules in `eslint.config.mjs`, possible because `eslint-plugin-sonarjs@^4` ships its own line-count rule alongside ESLint core's:

- Core `max-lines: ['error', { max: 500, skipBlankLines: true, skipComments: true }]` — red blocks merge.
- `sonarjs/max-lines: ['warn', { maximum: 300 }]` — yellow warns visibly without blocking (the `lint` script is plain `eslint .` with no `--max-warnings 0`, so warnings never fail the exit code). Verified present in the installed `eslint-plugin-sonarjs@4`.
- **Both thresholds count lines of code** (comments/blanks free): `sonarjs/max-lines` counts code lines natively, so the core rule is configured to match rather than mixing raw-line and code-line semantics in one policy. Discovered during apply: by raw `wc -l` the yellow set was predicted as six files, but code-line counting is what the rules actually measure — the recorded yellow list in tasks 6.6 is the authoritative one.

Scope: production source (`app/**`, `lib/**`, `hooks/**`, `db/**`) only. Exemptions, each with a reason:

- **Tests** (`**/*.test.*`, `**/__tests__/**`, `test/**`, `e2e/**`) — seven existing suites already exceed 500 lines (`StoreLinks.test.tsx` 629, `SegmentedControl.test.tsx` 605, `ItemsToolbar.test.tsx` 562, `Menu.test.tsx` 545, `HeroCollapsedItems.test.tsx` 535, `image-search/route.test.ts` 533, `ListDetails.test.tsx` 502); applying the bands there would force seven unrelated test splits into this change. Test structure is governed by testing-foundation's one-lane-per-source-module convention instead.
- **`scripts/**`** — `seed-dev-users.ts` is 864 lines of dev tooling outside the coverage perimeter.
- **Data literals already coverage-excluded** — `app/changelog/releases.ts` grows append-only by design.

Measured outcome at completion: **zero red production files** (the only >500 sources today — `dal.ts`, `items.ts`, `lists.ts` — are the ones this change deletes). Standing yellows, deliberately not fixed here (pure-move scope): `app/api/image-search/route.ts` (403), `useItemForm.ts` (358), `ChooseItemsForm.tsx` (313), plus `list.actions.ts` (~345), `item.actions.ts` (~325), `listItems.actions.ts` (~320).

Gate interaction, flagged explicitly: the repo's pre-merge bar has been "zero errors, zero warnings." Yellow-by-design creates a deliberate exception class — the bar becomes "zero errors; the only warnings are yellow-band size advisories" (encoded in the testing-foundation ADDED requirement). No `eslint-disable` escape hatches for either rule, consistent with the repo's no-escape-hatch lint stance.

Rejected alternatives:

- **Moving `items.ts`/`lists.ts` whole and deferring splits to a follow-up change** — ships two >500 modules, immediately violating the policy this change encodes, and doubles the churn (two rounds of import rewrites and test relocation for the same functions).
- **Splitting `social` out of `user` now for symmetry** — both `user` modules are inside the goal band; that's the definition of a preemptive split.
- **A single `max-lines` rule** — one rule can carry only one severity, so it cannot express error-at-500 *and* warn-at-300; hence the core + sonarjs pairing.
- **Applying the bands to test files now** — instant red on seven unrelated suites; deferred as a possible follow-up policy change.

### D12 — Documentation and editorial spec fixes

- `openspec/config.yaml` context line "Data reads in `lib/dal.ts`; mutations in `app/actions/`" → "Per-entity data modules in `lib/data/` (`<entity>.ts` reads, `<entity>.actions.ts` writes)".
- `items-library-shell` spec.md:13 references `app/actions/**` in a non-normative scoping sentence. No requirement changes, so no delta; the sentence is fixed **editorially** in the active spec as part of this change (called out in tasks so the reviewer can veto).
- DATABASE.md, TESTING.md, CLAUDE.md greps for `lib/dal` / `app/actions` during implementation; update any stale pointers found.

## Risks / Trade-offs

- **[Shim re-exports of server actions]** A non-directive barrel re-exporting from a `'use server'` module is expected to resolve correctly for client importers, but Turbopack/webpack treatment isn't contractual. → Mitigation: dev-server smoke test (claim an item, create a list) at the shim stage; on failure, fall back to D7's one-shot per-entity rewrite — shims are transient either way.
- **[Silently changed seed semantics]** Merging fixtures with differing defaults could alter seeded rows and flip test meaning. → Mitigation: explicit defaults at merge, relocated suites must pass with zero assertion edits (D9).
- **[Coverage re-bucketing]** Splitting three files into thirteen re-attributes covered lines; a helper exercised only via another module's tests would strand its new file below floor. → Mitigation: D3 keeps every private helper in the same module as all of its consumers; the cross-module exports are each exercised by lanes that drive them (`sanitizePurchases` via `purchase.test.ts` and `item.test.ts`; `withVisibility` via `list.test.ts` and `visit.test.ts`; `item.schema.ts`/`item.associations.ts` via `item.actions.test.ts`'s `createItem`/`updateItem` paths). Run `vitest run --coverage` immediately after the move step, before caller migration.
- **[Cache wiring drift]** A dropped `'use cache'`, `cacheTag`, or `updateTag` during the move silently de-caches or stales a read. → Mitigation: post-move audit comparing per-tag counts of `cacheTag`/`updateTag` call sites against pre-move (`lists`, `items`, `list_visits`, `user_follows`, `user_blocks`); counts must match exactly.
- **[Entity-boundary judgment calls]** `getFollowingFeedUsers` aggregates list `shared_at` data but lives in `user.ts` (it answers "who do I follow, with activity"), per the issue's mapping. Accepted: placement follows the question a function answers, not every table its query touches.
- **[Large mechanical diff]** ~100 files touched. → Mitigation: D7 sequencing keeps commits scoped (move → tests → migrate callers per entity → delete shims), each independently green.

## Migration Plan

1. Scaffold `lib/data/`; move reads into `{user,list,visit,item,purchase}.ts`; reduce `lib/dal.ts` to a re-export shim. Verify: `tsc`, full test suite (old tests still pass through the shim).
2. Move writes into `{user,list,listItems,visit,item,purchase}.actions.ts` (module-level `'use server'`) plus the internal `item.schema.ts` / `item.associations.ts`; reduce `app/actions/*.ts` to re-export shims. Verify: `tsc`, tests, dev-server smoke for client-imported actions through shims.
3. Relocate and merge tests per D8; consolidate fixtures per D9; tests now import `@/lib/data/*` directly. Verify: full suite + coverage (new modules clear the floor).
4. Migrate the ~93 callers entity-by-entity to `@/lib/data/*` imports.
5. Delete shims (`lib/dal.ts`, `app/actions/` entirely), old test files, `test/helpers/seedItemGraph.ts`, `test/helpers/seedVisitGraph.ts`; grep proves no `@/lib/dal` or `@/app/actions` specifier remains.
6. Docs + editorial spec fixes (D12); cache-tag audit; full gates: lint, `tsc`, `vitest run --coverage`, e2e suite.

Rollback: pure code move with no schema/data migration — revert the branch.

## Open Questions

- None blocking. D12's editorial fix to `items-library-shell` (non-delta) is the only judgment call flagged for reviewer veto.
