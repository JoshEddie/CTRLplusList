# Design: non-link-item-states

## Context

`lib/storeValidity.ts` is the single store-validity contract: `storeComplete` (name + `isValidProductUrl` link + `priceTier` good) is consumed by the DAL's `primaryStore` selection, `ItemCard`'s gate before `ItemActions`, `PriceLine`, the deck's tier helpers, and the server actions' `validateStore`. Every consumer currently treats "complete" as the only valid state, so a store-less or priced-but-linkless item is frozen at the write path even though the read path renders it. The map's state model makes FULL / PRICED / BARE first-class; #258 (door) and #266 (fetch-gated link editing) own the entry-path work — this change is validation, tiers, and display only.

## Goals / Non-Goals

**Goals:**

- Tri-state acceptance at the write path (create and update): zero rows, PRICED row, FULL row.
- Symmetric name⇄link coupling everywhere one rule lives (`lib/storeValidity.ts`): either present requires the other; non-empty link additionally requires a good price.
- PRICED display: bare `$X.XX` price line, no store name, no `View item ↗`.
- Editing prod's store-less item works end to end.

**Non-Goals:**

- No entry-path UI for creating linkless items (the #258 door). The failure route's editable fields incidentally allow clearing name+link to reach PRICED/BARE — accepted, not designed for.
- No link-field removal or fetch-gated edit enforcement (#266).
- No schema change, no migration, no prod-data touch.
- Purchase modal store row stays FULL-gated (it is a navigation affordance; PRICED has nowhere to navigate).

## Decisions

### D1 — Two predicates, one home

`storeComplete` keeps its exact meaning (FULL, navigable). A sibling `storeValid` in `lib/storeValidity.ts` accepts FULL ∪ PRICED, where PRICED is `link === ''` ∧ `name.trim() === ''` ∧ `priceTier(price).tier === 'good'`. Requiring `link` exactly `''` (not "invalid") preserves the legacy-row filter: dormant rows with broken non-empty links stay invalid and never resurrect (map decision). Display surfaces gate on `storeValid`; navigation surfaces (`View item ↗`, `Buy & Claim ↗`, purchase-modal store row) key on `!!store.link` / `storeComplete` per the `item-actions` spec.

### D2 — `priceTier` stays a pure format check; link-awareness composes at the gates

`priceTier` remains the single source of price-format validity (`PRICE_PATTERN`). The "empty price is fine when linkless" rule lives in the consumers that know the store context: the deck's step/row gate and Preview's save gate treat an empty price as `good` with a neutral note ("No price — saves without one") **only** when the store's name and link are both empty. A non-empty malformed price is `error` regardless. This avoids threading a store into every existing `priceTier` call site.

### D3 — `storeTier` becomes the symmetric-coupling tier

Both fields empty → `good`, empty note (linkless is a normal state, not a nag — owner decision). Name without link → `error` ("A store name needs a link"). Link without name → `error` (existing "The store needs a name" note). Invalid non-empty link → `error` (existing note). No `warn` tier, as today.

### D4 — `validateStore` returns a tri-state write shape

All-empty input (or absent store) → BARE → `updateItemStores([], id)`: the existing positional sync deletes any legacy rows, consistent with the established collapse-on-first-edit behavior. PRICED → one row `{ name: '', link: '', price, provenance nulls }`. FULL → unchanged. Rejections mirror `storeValid`'s complement with field-level messages. The single-store cap is now "at most one".

### D5 — `primaryStore` widens its filter, keeps its shape

Filter `storeValid` (was `storeComplete`), sort by `priceAmount`, `?? rows[0]` repair fallback, `?? null` — unchanged otherwise. No FULL-over-PRICED preference: rows are already capped at one per item going forward; a legacy multi-row item simply picks the cheapest valid row. Pure mapping over fetched rows — `'use cache'` compatible, no cache-tag changes (reads stay under `items`; all mutating paths already call `updateTag('items')`).

### D6 — Display gating

`ItemCard` passes `storeValid(item.store) ? item.store : null` (was `storeComplete`). `ItemActions`: `showView = !!store?.link` (was `!!store`); `showBuy` already keys on `!!store?.link`. `PriceLine`: gate on `storeValid`; render `· {name}` only when `name` is non-empty (name presence ⇒ FULL by construction). BARE items have no row → no line, `Add Claim`-row action set — already the spec'd matrix.

### D7 — Seed coverage

`scripts/seed-dev-users.ts` gains one PRICED and one BARE hand-authored item so both states are reachable from the seed for preview/e2e verification (dev-only data; prod untouched).

## Risks / Trade-offs

- **Pre-#258 creation leak:** the failure route's editable store fields now permit clearing both to save PRICED/BARE from the add flow. Accepted in grilling — it's the fluid model until #258/#266 land enforcement.
- **Repair fallback unchanged:** an invalid legacy row still reaches the UI as the scalar `store` (for edit seeding) with all display gated off — same rendered outcome as today, verified by existing `item-store-links` scenario coverage.
- **Copy drift risk:** the neutral "no price" note appears in deck tiers only; `PriceLine` renders nothing for BARE. No new tokens or primitives.
