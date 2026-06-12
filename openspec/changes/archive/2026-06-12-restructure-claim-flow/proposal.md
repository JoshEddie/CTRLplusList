# Restructure claim flow — store links route through the claim modal

## Why

The most common claim-leak flow today: a viewer clicks an item's store-link button (opens the store in a new tab), buys the gift, and never returns to click "Claim this gift" — so items get double-bought. The card's two separate actions make the store link an exit ramp that skips the claim UI entirely. The fix is structural: the card gets a single "Get this gift" button that opens the purchase modal, and store links live only inside that modal — reaching a store forces the viewer past the claim UI, and when they return from the store tab the modal is still open with the claim CTA waiting. ([Issue #133](https://github.com/JoshEddie/CTRLplusList/issues/133); hi-fi design settled in Claude Design — V1 "store names as metadata", CTA "Get this gift".)

This restructure also fixes a real bug by construction: today a fully-claimed item hides store links even from the claimer (`showStores={!showPurchased && !showSpoilerInfo}`), locking the claim-then-buy order out of the link needed to buy. In the new anatomy the claimer's "Manage your claim" modal always carries the store row.

Inherited constraints surfaced by the spec audit:

- `claim-attribution` currently mandates a **single-screen modal with the picker always visible** ("no intermediate or confirmation steps"); the new collapsed-by-default "Claiming for someone else?" disclosure is a deliberate requirement change, not a violation — the modal now has three jobs (shop, self-claim, attributed claim) and the third is the rarest.
- `item-store-links` pins the card chip-row anatomy, the exact copy "Claim this gift", and popover-over-card geometry — the epicenter of the delta.
- `button-system`, `menu-system` are conformance targets: every new affordance flows through `<Button>`/`<LinkButton>`/`<Menu>`/`<MenuLinkItem>` unchanged.
- `e2e-critical-flows` requires all eleven flows stay green; pinned copy and picker-reach steps change with the new anatomy.

## What Changes

- **Item card (viewer-facing list view):** the store-link buy pill and "+N stores" popover leave the card. Single primary `<Button>` "Get this gift" opens the existing `?purchaseItem=<id>` modal. Store names render as a muted, non-interactive metadata line in the price row ("$35.50 · Amazon · Target +1", max 2 named, "+N" overflow). Price stays on the card. **BREAKING** for the card's DOM anatomy and the pinned "Claim this gift" copy.
- **Card claim states:** fully-claimed-by-others → greyed card with disabled "✓ Fully claimed" button (no modal). Viewer-has-a-claim → "✓ Claimed" pill in the price row + ghost "Manage your claim" button opening the already-claimed modal state.
- **Purchase modal — new anatomy (all variants get a store row at top):** ghost/secondary store row (primary store `<LinkButton>` + "+N stores" popover via `<Menu>`), then per-viewer claim sections:
  - *Signed-in friend:* primary CTA "Claim this gift", then a collapsed-by-default "Claiming for someone else?" disclosure (avatar-stack hint + chevron) that expands to the attribution picker (search + pool rows + "Someone not listed?" free-text) with a confirm button reflecting the selection.
  - *Guest (signed out):* store row first — never behind the auth wall — then "Your name" + "Claim as Guest", sign-in pitch demoted to a footer line.
  - *Owner:* spoilers OFF → store row + quiet "Your list" label, no claim UI; spoilers ON → "I bought this myself" + "Claiming for someone?" disclosure (same picker).
  - *Already claimed (viewer):* store row + "You claimed this" banner + danger "Remove my claim".
- **Deferred fixes from the PR #132 spec-review (filed on issue #133), folded in because this change rebuilds the same machinery:**
  - `createPurchase` returns the inserted row's id; optimistic claim rows use it instead of fabricated `optimistic-${Date.now()}` ids (fixes immediate-unclaim failure and the duplicate-append race).
  - The duplicated claim-removal block in `Item.tsx` (`handleUndoConfirm` / `handleRemoveClaim`) collapses into one shared removal path.
  - Picker-load failures render an honest error state with retry instead of the empty-pool message (today `.catch(() => {})` makes failures indistinguishable from an empty circle).
- **Scope boundary:** owner-facing management surfaces (choose-items picker rows, sortable owner rows, items library) **keep** their direct buy-link chips — there is no claim-leak problem when the owner is the viewer, and removing chips there would be churn without benefit. Only the viewer-facing list card changes.

## Capabilities

### New Capabilities

None — every behavior lands in an existing capability.

### Modified Capabilities

- `item-store-links`: card anatomy requirements rewritten — chip row, buy pill, +N popover geometry, and "Claim this gift" copy replaced by the metadata line + single "Get this gift" button; store-validity/sort/price-derivation rules carried over unchanged; choose-items and sortable-row chip requirements re-scoped to owner surfaces explicitly.
- `claim-attribution`: the single-screen always-visible-picker requirement becomes the collapsed-disclosure modal anatomy (one-tap self-claim unchanged); owner spoiler-gated entry re-worded to the new structure; modal CTA copy reconciled to "Claim this gift" / "I bought this myself".
- `list-item-management`: the purchase-modal anatomy requirement rewritten for the new variants (store row, disclosure, owner spoiler section, already-claimed state); dispatch contracts (no client `user_id`, guest unclaim via `purchase_id`) unchanged; `createPurchase` return contract gains the inserted row id.
- `e2e-critical-flows`: pinned copy ("Claim this gift", "I purchased it") and picker-reach steps updated to the new anatomy (expand-disclosure step); all eleven flows remain covered — none removed.

## Impact

- **UI:** `app/(main)/items/ui/components/` — `Item.tsx`, `ItemCard.tsx`, `StoreLinks.tsx`, `Purchase.tsx`, `PurchaseModalSlot.tsx`, `purchasemodal/PurchaseFlowContainer.tsx` (+ co-located CSS). New disclosure + store-metadata presentation. All interactive surfaces via existing `button-system` / `menu-system` primitives — no new primitive families, no page-scoped overrides of primitive classes.
- **Data layer:** `lib/data/purchase.actions.ts` (`createPurchase` returns inserted id — additive). No new reads; existing `updateTag('items')` revalidation paths unchanged, so no new cache tags to wire.
- **Tests:** unit/component tests for the touched components; e2e specs for flows 7, 9, 10, 11 (claim, guest claim, attributed claim, owner claim/unclaim) updated for new copy and the disclosure expand step.
- **Out of scope:** localStorage "did you get it?" next-visit nudge; store-chip tap pre-highlighting a store in the modal; any change to claim eligibility, unclaim authorization, or quantity-limit server contracts.
