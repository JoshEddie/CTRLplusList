## Context

See `proposal.md` — Why. The constraints that actually shape the approach:

- `sanitizePurchases` runs inside three `'use cache'` reads today, taking `showSpoilers` as a pure URL-derived argument. `list-item-management` requires projection before rows escape the data layer.
- Every other items-toolbar facet filters an already-fetched array client-side ([ItemsBrowser.tsx:137](app/(main)/items/ui/components/ItemsBrowser.tsx:137)). Claim visibility cannot: the resolved tier changes what the server sends.
- `lib/data/profile.ts` is already at 366 lines — a standing yellow warning, 34 short of the merge-blocking red band.
- `neon-http` gives no multi-statement atomicity, but nothing here needs it: the migration is additive and every write is a single statement.
- A drizzle migration was already **generated** (not run) against the abandoned membership-columns shape. It must be discarded and regenerated, not layered over.

## Goals / Non-Goals

**Goals:**

- One resolution path serving every consuming surface, computed once per request outside the cache boundary.
- No growth in `lib/data/profile.ts`.
- The removed URL parameters degrade silently on old links rather than erroring.

**Non-Goals:**

- Narrowing cache tags. The map holds this open deliberately ([#309](https://github.com/JoshEddie/CTRLplusList/issues/309)); this change fires the existing coarse tags.
- Any time-based reveal. Logged as [#342](https://github.com/JoshEddie/CTRLplusList/issues/342) on map #230 and explicitly out of scope here.
- Retiring `lib/data/profile.ts`'s existing yellow warning. This change must not deepen it; fixing it is separate work.

## Decisions

### 1. Two homes, neither of them a new module in the request layer

The **baseline read and its writes** go with the profile-preferences data code in the `profile` domain (`lib/data/profile.ts` / `.actions.ts`, or the preferences module they already live in), extended to take the account key added to `profile_preferences`. The **resolution** — baseline layered under the request's transient adjustment — goes in a new `lib/spoilers.ts`, beside `lib/listAccess.ts` and `lib/visibility.ts`.

*Why not fold resolution into the data layer:* composing a stored value with request parameters is not a data-layer concern (spec'd in `data-layer-organization`), and `lib/spoilers.ts` is importable from both page components and the DAL's callers without dragging `lib/data/` into request semantics. Watch `lib/data/profile.ts`'s 366-line count: if the preference read plus writers would cross the 400-line band, they land in a co-located preferences module rather than growing `profile.ts`.

The resolved-tier type is declared in `lib/types.ts`, since both the DAL and its callers depend on it.

### 2. One account-keyed preference value, not membership columns

The spoiler tier is a single catalog value stored in `profile_preferences`, whose key gains a **nullable account** (`profiles-data-model`). A row keyed `(profile, null, 'spoiler_tier')` is the profile-wide default; a row keyed `(profile, account, 'spoiler_tier')` is that account's baseline. `profile_members` gains no spoiler column.

*Why the preference table over three membership columns:* the four-stage tier is a single ordinal, so it needs one value, not three; and keying it in `profile_preferences` puts the profile default and every member baseline in one shape, so a future per-member preference is a new catalog id rather than another membership column. The tier is stored as its stage name (text), validated by the reader against the four stages — `profile_preferences` values are already generic text keyed by a catalog id carrying a per-row `type`.

*Alternative rejected:* a `spoiler_tier` column on `profile_members`. It splits the profile default (a preference) from the member value (a column) into two shapes for one concept, and spends a membership column per future preference.

### 3. Resolution is seeded, and absence resolves to the protected default

Resolution reads the `(profile, account)` preference row. Where it is absent — a membership predating this capability, or a non-member — it resolves to the fully protected default (`surprise`) **without** consulting the `(profile, null)` default row. The default row is read only at invite-open to seed the concrete member row written at acceptance; it never governs a member at resolution time. Changing the default therefore moves nobody, and no per-member backfill is needed — an absent row is already the safe state.

*Alternative rejected:* live fallback (absent member row → the profile default governs). It cannot distinguish a member who never chose from one who accepted the offered value, so changing the default would silently move the first — the inheritance `2026-08-31-a-per-membership-setting-is-seeded-not-inherited` forbids.

### 4. Each item read splits into an uncached wrapper over a private cached half

`getItemsByListId` and `getItemsByProfile` become uncached exported functions, each calling a module-private raw read that carries `'use cache'` and every `cacheTag` call the current function makes — including `cacheTag(...itemRowTags(result))`, which must stay with the rows it describes. The wrapper applies `sanitizePurchases`, sets `hasPurchases`, and derives nothing viewer-scoped beyond the projection.

The raw half stays unexported so no caller outside `lib/data/` can obtain unprojected rows — the data-layer boundary, not the cache boundary, is what the projection precedes.

`getItemsByPurchased` keeps its current shape and projects at `identity`: every row it returns is one the viewer purchased.

Consequence taken knowingly: the cache now holds names and profile ids where it held projected rows. Nothing reaches a client either way.

### 5. One URL parameter carries the transient tier

A single `spoiler` parameter carries the per-page tier (`surprise` | `progress` | `claims` | `identity`; the library omits `progress`). It is omitted from the URL when it equals the viewer's resolved **baseline** and written when it differs. Unlike every other facet's, its omission condition is viewer-dependent — the same URL resolves differently for two people — which is correct: the parameter carries a delta from a baseline, not an absolute.

*Alternative rejected:* three parameters (level plus two toggles). The two-axis model collapsed into one ordinal tier, so one parameter now carries the whole state.

### 6. The hero derives its own claimed-count aggregate rather than receiving it

`ListHeroSection` and `ListItemsSection` are sibling server components with no shared fetching parent, so a value derived in the items read cannot reach the hero without lifting both reads into a common ancestor and re-threading the page.

Instead a small aggregate read lives in `lib/data/purchase.ts`, cached and carrying the same tags as the item reads, returning the claimed-item count for a list. The hero calls it only when the viewer's resolved tier is `progress` or above, so the fully protected default costs nothing. There is no shopper-names aggregate: that disclosure is dropped.

*Alternative rejected:* lifting both reads into `ListDetailPage`. It re-plumbs two sections to serve one progress bar, and `ListDetails.tsx` is already at 234 lines.

### 7. The spoiler control is a hero tile and a library toggle, not a toolbar facet

On a **list page** the control is the hero's **Spoilers tile** beside the Visibility picker (`list-hero-header`), rendered only for a viewer resolving a membership, opening a four-stage menu; on **collapse** its menu hoists into the sticky-strip kebab (`list-hero-collapse`). On the **library** (`/items`) the control is a compact toggle to the **left of the search field** (`items-library-shell`), offering three stages (no `progress`). Neither is a toolbar filter facet: the toolbar's filter bar returns to search / sort / filters, and the filters sheet to Stores / Price.

*Why out of the toolbar:* the control is display state, not a filter, and the 2026-09-01 mockup places it in the hero. Keeping it a toolbar facet would have required the filter-bookkeeping exclusions the old plan spelled out; a hero tile needs none of them.

### 8. The reveal confirmation intercepts the affordance, not the modal

The modal opens from URL params (`?purchaseItem=&purchaseView=`, owned by `claim-attribution`). The confirmation therefore sits in `ItemActions`: at a resolved tier below `claims` (`surprise` or `progress`), activating the affordance opens a `ConfirmDialog` (`confirm-dialog-system`) and only its confirmation writes the params. A deep link carrying `purchaseItem` still opens the modal directly — a URL the viewer pasted is a deliberate act, which is exactly the line the ADR draws.

The modal does gain one thing. Below the `claims` tier the `ItemDisplay` it was handed carries no other party's claims — the projection stripped them — so it cannot render the count and remaining capacity the confirmation promises. `PurchaseFlowContainer` is a client component holding already-fetched props, so the only route to data the page deliberately withheld is an on-demand server read: a single-item claim summary in `lib/data/purchase.ts`, invoked exactly the way that component already invokes `getClaimPickerForItem`. Widening the page's own projection was the alternative and is worse: the count would then ship to the client for every item, including the ones whose action rows must not vary with it.

### 9. The removed parameters degrade, they do not error

`?spoilers=1` stops being read. `?purchases=reveal|only|none` stops being read entirely — it is neither a spoiler signal nor a claim-state filter, since the claim-state filter is removed (`items-browser-chrome`). Old links keep resolving to the list or library, at the viewer's own baseline, with no filter applied.

### 10. Seed fixtures cover both projections and the cross-profile case

`scripts/seed-dev-users.ts` gains, on the existing managed profile: one member at the protected default (`surprise`) and one at `identity`. Local mode can then reach both projections without writing anything, and the cross-profile case is reachable by setting the selection cookie — which is how `e2e-management-flows` already requires a non-default acting profile to be established.

### 11. The reorder layout renders the items toolbar, and the tier no longer leaves it

`SortItems.tsx` renders no toolbar today. With the spoiler control now living in the hero tile rather than the toolbar, the reorder layout no longer needs a toolbar to reach it — but it still needs one so the owner can search, sort, and filter their own list, and the **filter** is the one condition that leaves the layout. `SortItemsContainer` therefore renders `ItemsToolbar` above `SortItems`, and the swap on applying a filter is of the region below the toolbar alone — `ListItemsSection` keeps deciding between the two layouts, on the filter condition.

Raising the tier does **not** leave the reorder layout: the tier changes what each row discloses, not which rows are present or their order, so a drag still writes a position derived from the full set. The owner adjusts their tier from the hero tile while the sortable rows stay in place.

*Alternative rejected:* dropping the toolbar from the reorder layout. The owner could then neither filter nor search their own list without first leaving reorder by some other route.

## Risks / Trade-offs

- **`lib/data/profile.ts` is 34 lines from the red band** → the baseline preference read and its writers land in the preferences module or `profile.actions.ts`, watched against the band; nothing is added to `profile.ts` that would cross it.
- **`SortItems.tsx` gains a toolbar it never had** → the toolbar is mounted by `SortItemsContainer` beside `SortItems` rather than inside it, so the dnd component keeps its current shape and the sort/filter params it does not consume stay the browser's concern.
- **`Item.tsx` is at 296 lines and gains tier-keyed branching** → the claim-information branches extract into the existing `ClaimBanners.tsx` and a co-located helper rather than growing the component.
- **A skipped accept-time tier write fails toward protection** — a membership whose tier row is never written resolves to `surprise` (full protection), not to the owner's chosen seed. Failing toward more protection and silently → the redemption action writes the tier explicitly, and its test asserts the written value against the seed; a member landing at `surprise` unexpectedly is a visible, self-correctable state (they re-set it in Settings).
- **The hero adds a second query per list page** → it is cached under the same tags as the item read and is skipped entirely at `surprise`, which is the default for every existing user.
- **The cache holds unprojected rows** → accepted; recorded as a consequence on `2026-08-31-a-viewer-scoped-projection-lives-outside-the-cache`. Nothing reaches a client, and the read is server-only.
- **Coarse cache tags mean a baseline write busts every user's cached item reads** → accepted, unchanged from today, and owned by [#309](https://github.com/JoshEddie/CTRLplusList/issues/309).
- **An account-keyed preference row does not cascade with membership revocation** → the revocation action deletes the account's `profile_preferences` rows on that profile explicitly (`profiles-data-model`), since only the membership row cascades on its own.

## Migration Plan

The already-generated (unrun) migration targets the abandoned membership-columns shape and SHALL be **deleted and regenerated**, not layered over. Since it has not run against any database, discarding the file and re-running `drizzle-kit generate` against the new schema produces one clean forward-only migration rather than a column-add-then-drop pair.

The regenerated migration is additive only:

1. Add a nullable account column to `profile_preferences`, keyed into its uniqueness alongside (profile, preference) so a profile can carry both a null-account default and per-account rows for the same preference. Existing rows are null-account (profile-wide) values and are unaffected — no rewrite, no backfill.
2. Register the `spoiler_tier` catalog row (owned by this capability). Profiles carrying no value rows, and members carrying no account-keyed row, resolve to the fully protected default, so no per-profile or per-member backfill is needed.

No column is dropped and no existing column changes, so the migration is safe ahead of the deploy and the previous app version runs unchanged against it. Rollback is the deploy, not the migration: the account column and catalog row are inert to code that does not read them.

Deploy order is migration first, then app — the app reads the column and catalog row the migration creates.

## Open Questions

None. One item found in passing and deliberately left alone: `AltvatarCustomizer` sets `variant={selected ? 'primary' : 'ghost'}` alongside `pressed`, which is the exact antipattern `button-system`'s toggle requirement forbids. It predates this change and is untouched by it.
