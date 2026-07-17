# Design — item-actions-single-store

## Context

Issue #234 (chunk 1 of MAP #233); the settled design record is #169's body (state matrix, layout, copy, a11y). Owner decisions from the propose grilling:

1. **Link required** — a store saves only with name + link + price; #256 tracks first-class non-link items.
2. **Entry-card manual door removed** — manual entry is failure-screen-only.
3. **Store decomposes into flat item values** — price its own row; store name + link a grouped pair ("closely tied"); no composite all-or-nothing unit.
4. **Standing `store` deck step**, premarked complete (the deck no longer has conditional steps).
5. **Legacy multi-store items collapse on edit-save**; form seeds from the primary (lowest-priced valid) store.
6. **Interim claimable top slot: `Add Claim`** until chunk 2's `Buy & Claim ↗`.
7. **Component name stays `ItemActions`.**

Current state: action branching split across `ItemCard` (which affordance) and `Purchase` (label/variant); `StoreLinks` renders owner chip rows + `+N` menus; `StoreMetadataLine` renders the non-owner `$X · A · B +N` line; the modal's `ModalStoreRow` is the non-owner's only store navigation; `isValidStore` (`app/(main)/items/ui/components/utils.ts`) and the deck's `priceTier` disagree on price validity; the deck's Preview renders the real `ItemCard`.

## Goals / Non-Goals

**Goals:**

- One component (`ItemActions`) owns the per-item action area for every surface and viewer state.
- `View item ↗` reachable in every state, for every viewer.
- One store-validity predicate everywhere.
- Single-store input model with flat field editing in the deck.

**Non-Goals:**

- `Buy & Claim ↗`, optimistic claim, undo popup (chunk 2).
- Guest claim identity cookie (chunk 3).
- Quantity model changes (MAP #230).
- Schema/migration changes; cleanup of dormant extra store rows on untouched items.
- Non-link item support (#256).

## Decisions

### D1 — `ItemActions` shape

`app/(main)/items/ui/components/ItemActions.tsx`, client component. Input: the already-computed flags `Item.tsx` derives (`isOwner`, `removableClaim`, `claimActionDisabled`, `showOwnerClaimAction`, `showOwnerManageAction`, spoiler state), the primary store, and `onPurchaseClick`. It returns the full action block: primary slot, secondary row, status. `Purchase.tsx` is absorbed: its four branches become matrix rows; the component is deleted. The matrix (interim, chunk 1):

| Viewer state | Top slot | Below |
|---|---|---|
| Non-owner, claimable | `Add Claim` (primary) | `View item ↗` (full width) |
| Non-owner, viewer claimed, slots remain | `Manage claim` | `View item ↗` · `Add Claim` (2-up) |
| Non-owner, viewer claimed, no slots | `Manage claim` | `View item ↗` (full width) |
| Non-owner, fully claimed by others | `Fully claimed` (`role="status"`) | `View item ↗` (full width) |
| Any viewer, no valid store | `Add Claim` (full width) | — |
| Owner, spoilers off | `View item ↗` | — |
| Owner, spoilers on, claimable | `Add Claim` (owner modal copy) | `View item ↗` |
| Owner, spoilers on, has claims | `Manage claims` | `View item ↗` |
| View-only (preview surfaces) | `View item ↗` (full width) | — |

`View item ↗` is a `<LinkButton target="_blank" rel="noreferrer">` to the primary store; `↗` = `MdOpenInNew`, `aria-hidden`, "opens in new tab" in the accessible name. Buttons flow through `button-system` primitives — visual styling stays the primitives'; page CSS is positional only.

Internal model (apply-stage decision): **DOM decides which actions show, CSS decides their layout.** The component renders a flat, fixed-priority list of conditional children in one `.item-actions` grid container — no top-slot/secondary-row structure in JSX. Each control carries a purely positional class (`item-actions-claim`, `item-actions-status`, `item-actions-add`, `item-actions-view`). CSS defaults every child to a full-width row; sibling detection (`:has(.item-actions-claim)`) demotes View + Add Claim into the two-up pair when a top action coexists, with `order` giving the spec's `View · Add Claim` reading order. Accepted trade: in the pair, focus order (DOM: Add → View) diverges from visual order — within WCAG 2.4.3 tolerance for two adjacent targets. `View item ↗` is `secondary` beside other actions but promoted to `primary` when it is the card's only action (owner spoilers off, view-only) — the sole action is the primary intent. #235's `Buy & Claim ↗` later becomes one more conditional child plus CSS, with no structural change.

Alternative considered: keeping `Purchase` and composing it inside `ItemActions` — rejected, the split is exactly the branching #169 consolidates. Also rejected: a descriptor/slot model (`itemActionSlots()` returning top + secondaries) — it modeled a top/secondary distinction the matrix doesn't actually have; every state is a subset of four fixed-priority actions.

### D2 — Single validity predicate

`storeComplete(store)` := non-empty `name` && `isValidProductUrl(link)` && `priceTier(price).tier === 'good'`. Home: the deck's tier module is client-side and the server action needs it too, so the predicate lives in a shared pure module (with `PRICE_PATTERN`/`priceTier`) importable by both `app/(main)/items/ui/components/utils.ts` consumers and `lib/data/item.actions.ts`. `isValidStore` is deleted; `sortedValidStores`/`lowestPricedStore` re-predicate on `storeComplete`. Display surfaces keep filtering: legacy invalid/dormant rows stay invisible, same as today.

### D3 — Deck field model

`rowTiers` rows: `photo`, `title`, `note`, `price`, `store` — unchanged set, but `store` now means the name+link pair only (price fully owned by the `price` row). `storeTier` becomes: error when name empty; error when `isValidProductUrl(link)` fails; good otherwise — no warn tier, no composite check spanning price. The Store row opens a grouped two-field Focus editor (`editors/StoreEditor.tsx`: Store name `TextField` + Link `TextField type="url"`), matching the other Focus editors' shell. `StoresSheet` is deleted; `useItemActions` drops `addStore`/`removeStore` (`setStore` keeps index 0 semantics or simplifies to field setters). `FieldRows`' Store row routes to the Focus editor, not a sheet.

`neededSteps`: standing order photo → title → price → store → note (note still gated on clean title); `store` premarked complete when the seeded fetch result already satisfies `storeTier`. `stepBlocked('store')` mirrors the error tier. Fetch path always has the link (pasted URL); the step's live gap is the store name.

`viewModel` keeps the `stores: DeckStore[]` shape (adapter writes `stores[0]`) — flattening to three scalars would churn the adapter and edit seeding for no behavioral gain.

### D4 — Edit seeding and legacy collapse

Edit path seeds the deck from the **primary** store — `lowestPricedStore(item.stores)` — falling back to `stores[0]` when no store passes the predicate (legacy incomplete rows must surface for repair, not vanish). Save submits exactly one store; `updateItemStores`' positional sync updates row 0 and deletes the rest. No passthrough plumbing. Consequence accepted by owner: alternate stores on a legacy item are silently dropped on its first edit-save.

### D5 — Server-side validation

`createItem`/`updateItem` reject payloads where `stores.length > 1` or where the single store fails `storeComplete` — mirroring the client gate so the API can't produce what the UI forbids. (Items with zero stores can't be produced by the deck — price row blocks — and the action rejects a store-less payload too, keeping one rule.) Error shape follows the existing `ActionResponse` failure pattern.

### D6 — Modal store row under single-store

`ModalStoreRow` keeps the primary-store `LinkButton` but drops the `+N stores` `<Menu>` (single store; legacy extras are invisible per D2). Escape/modal semantics unchanged.

### D7 — Price line

`StoreMetadataLine` simplifies to `$X.XX · {primary store name}` in the unclaimed non-owner state (one store — the two-name/`+N`/width-adaptive logic dies). `PriceRow` (claimed states) unchanged. Whether the file merges into `ItemCard` is an apply-time leanness call.

### D8 — Entry card and failure screen

The URL entry state's footer loses "Fill in details manually →" (paste field + Fetch Details remain). The failure screen keeps its manual affordance and the draft-guard prompt; the #205 "mirrors URL entry exactly" coupling is repealed — the failure screen's affordance is now specified standalone (same copy it has today).

### D9 — Preview surfaces

Preview keeps rendering the real `ItemCard`; the card's action area is `ItemActions` in view-only mode (`View item ↗` full width, inert claim-wise). Preview's "Store links" action row becomes "Store", opening the grouped Store editor; "Lists & quantity" and Triage unchanged. Choose-items / sortable / library preview rows inherit the same view-only mode through `<Item preview>`.

## Risks / Trade-offs

- **[Row-anatomy CSS churn]** `item-store-links`' grid templates assume buy-pill/`+N`/claim-CTA columns. → Deltas re-anchor the affected requirements on the `ItemActions` block; apply stage adjusts `store-links.css`/`purchase.css` under the existing selectors' surfaces rather than inventing new primitives.
- **[Legacy data loss on edit]** D4 drops alternate stores. → Owner-accepted; rows were already unreachable in the UI; untouched items keep them.
- **[e2e breadth]** Card-action assertions appear across critical flows. → `e2e-critical-flows` delta updates the flow contract; expect wide but mechanical e2e edits.
- **[Localized label width]** DE/FI labels expand ~30%. → min-height + flexible widths per #169's a11y constraints; 200% zoom and text-spacing checks in tasks.

## Migration Plan

Pure code change — no schema, no data migration, no flags. Rollback = revert the commits. Dormant multi-store rows remain valid data under rollback.

## Open Questions

None — grilling resolved all deltas from the charted scope (link-required, manual-door removal, flat store fields, standing step, collapse-on-edit, interim slot, name).
