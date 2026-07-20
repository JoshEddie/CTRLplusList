# Proposal: non-link-item-states

Issue: [#256](https://github.com/JoshEddie/CTRLplusList/issues/256) · Map: [#233](https://github.com/JoshEddie/CTRLplusList/issues/233)

## Why

The write path requires exactly one complete store (`validateStore` in `lib/data/item.actions.ts`, create **and** update), while the read path already renders store-less items correctly. Production contains one store-less item ("Target Gift Card") that is consequently frozen — any edit fails validation — and priced-but-linkless items are unrepresentable entirely. The map's settled state model (FULL link+price · PRICED price-only · BARE neither; link-without-price forbidden) makes these first-class states; this change is the validation loosening only — UI entry paths (the #258 door) and fetch-gated link enforcement (#266) land separately.

Inherited binding constraints found by spec sweep:

- `item-store-links` — "A store SHALL be considered valid only when it has a name, a link, and a numeric price" (the predicate this change splits in two); "Items SHALL be capped at a single store on create and update"; "Primary-store selection SHALL happen once at the DAL read boundary" (lowest-priced complete, else first row for repair, else null; display surfaces gate on the shared validity predicate); "The price line SHALL name the primary store as inert metadata" (`$X.XX · {store name}`, renders only with a complete store); "The purchase modal store row … whenever the item has a complete store" (stays FULL-gated — a PRICED row has no navigable link).
- `item-actions` — already normative for the display half: `Buy & Claim ↗` and `View item ↗` gate on `!!store.link`; a PRICED or BARE item falls to the `Add Claim` row. This change brings the implementation into conformance (`ItemActions.showView` currently keys on row presence).
- `item-decision-deck` — "The price SHALL be required … never silently zero" (price card, no Skip); `storeTier` "error when the store name is empty; error when the link is empty/invalid; no warn tier — a link is required (owner decision on #234; first-class non-link items are tracked separately)" — this change is exactly that separately-tracked work; Preview save gate "disabled … while any store or price row is in the `error` tier (an item cannot be saved without a complete store)".
- `product-link-prefill` — the fetch path always seeds a link and requires a price before create; unchanged by this change (link present → FULL rules apply).

## What Changes

- **Validation split (`lib/storeValidity.ts`):** `storeComplete` (FULL: name + valid link + good price) remains the navigability/complete predicate. A new shared predicate accepts the tri-state — FULL, PRICED (link exactly `''`, name `''`, good price), or (at the row level) nothing. Name⇄link symmetric coupling: either present requires the other; a non-empty link additionally requires a good price.
- **Server actions (`lib/data/item.actions.ts`):** `validateStore` accepts zero store rows (BARE), a PRICED row, or a FULL row; rejects name-without-link, link-without-name, link-without-price. BARE persists zero `item_stores` rows via the existing positional sync.
- **Deck/preview tiers (`deck/utils.ts`, `neededSteps.ts`):** `storeTier` — both fields empty → `good` (linkless is a supported state); name without link → `error`; link without name → `error`; invalid link → `error`. `priceTier` becomes link-aware at the step/row gate: link present → price required as today; linkless → empty price is `good` with a neutral note. The editable link field is untouched in this chunk.
- **Display:** `ItemActions` keys `View item ↗` on `!!store?.link` (not row presence). `PriceLine` gates on the tri-state predicate and renders `$X.XX` alone — no `· {name}` — for a PRICED row.
- **Read-side (`primaryStore`):** valid set widens to FULL ∪ PRICED; invalid non-empty-link legacy rows stay filtered exactly as today (repair fallback preserved). Pure mapping — no cache-tag changes; reads stay under the existing `items` tag and mutations already call `updateTag('items')`.
- No schema change, no migration, no data touch. No new interactive-surface primitives — existing `TextField`/button primitives untouched.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `item-store-links` — validity predicate splits into complete (FULL) vs valid (FULL ∪ PRICED); single-store cap loosens to "at most one" with tri-state acceptance; primary-store selection widens to valid rows; price line renders bare `$X.XX` for PRICED.
- `item-decision-deck` — `storeTier` symmetric coupling with empty-empty `good`; price required only when a link is present; Preview save gate wording no longer claims "an item cannot be saved without a complete store".

### Removed Capabilities

(none)
