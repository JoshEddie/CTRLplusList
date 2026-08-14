## Why

Claiming is not on the "I'm going to buy this" path: an authenticated non-owner who intends to buy an item must open the purchase modal and record a claim separately from visiting the store. This chunk of [MAP #233](https://github.com/JoshEddie/CTRLplusList/issues/233) (design: [#169](https://github.com/JoshEddie/CTRLplusList/issues/169)) puts the two on one gesture — `Buy & Claim ↗` opens the store in a new tab and records the claim — and gives the claimer an immediate, non-punitive way out via an undo popup, so an accidental hold (wrong price, sold out, changed mind) is releasable for other givers without re-navigating.

Inherited constraints (grepped from active specs):

- **`item-actions`** already reserves this move: its layout contract states *"The interim top slot for the claimable state is `Add Claim`; a later change introducing `Buy & Claim ↗` displaces it into the secondary row without altering this layout contract."* This change is that later change.
- **`item-store-links`** — the primary store is the lowest-priced complete store; `Buy & Claim ↗` navigates to that same store as `View item ↗`. A store-link activation SHALL NOT propagate to any enclosing row/card handler.
- **`button-system`** — `Buy & Claim ↗` is a `<LinkButton variant="primary" target="_blank" rel="noreferrer">` (a real Next `<Link>`/anchor, ≥44px, `MdOpenInNew` glyph `aria-hidden`, "opens in new tab" in the accessible name). No new variant is introduced; the undo popup reuses `primary` and `ghost`.
- **`claim-attribution`** owns the already-claimed / post-claim surfaces and the `createPurchase`/`removePurchase` contract; this change adds the undo popup as a new post-claim surface. `createPurchase` and `removePurchase` already `updateTag('items')`; the affected reads consume `cacheTag('items')` — no new read is introduced.

## What Changes

- Add `Buy & Claim ↗` as the primary top-slot action for an **authenticated non-owner** viewing a **claimable** item (open slots) **with a complete store**. `Add Claim` demotes into the 2-up secondary row (`View item ↗` · `Add Claim`), exactly the displacement the `item-actions` contract reserves. Guests, owners, store-less items, viewer-already-claimed, and fully-claimed states are unchanged.
- `Buy & Claim ↗` is a real anchor: the browser opens the primary store in a new tab natively. On click it records a **self-claim** through the existing claim path, **awaits** the result, and on success opens an undo popup in the still-alive wishlist tab. No optimistic pre-commit and no rollback path — the claim commits only on server success; on failure the existing error toast fires and the card stays claimable. (Deliberate refinement of the issue's "optimistic … recorded immediately" wording, settled with the owner at propose time — the store tab already foregrounds on click, so awaiting the claim before showing the popup costs nothing and removes rollback complexity.)
- Add the **undo popup**, a controlled modal built on the existing `Modal` primitive (not `ConfirmDialog` — see design D-Undo-Surface):
  - Title **You've claimed this**; message *"Did you purchase it? If not — wrong price, sold out, changed your mind — undo to make it available for someone else."*
  - **Left, `ghost`:** `No — undo claim` → dispatches `removePurchase` (releases the claim).
  - **Right, `primary`:** `Yes, I purchased it` → dismiss, claim stays.
  - Ephemeral (consumer-owned open state) — a page refresh shows `Manage claim`, never re-pops the popup.
- Authed-only in this chunk. Guest one-click `Buy & Claim` arrives in the guest-claim-identity chunk (#3 of the map); the undo copy stays quantity-agnostic ([MAP #230](https://github.com/JoshEddie/CTRLplusList/issues/230) owns slot/unit semantics).

## Capabilities

### New Capabilities

<!-- none — this chunk modifies existing capabilities only -->

### Modified Capabilities

- `item-actions`: activate the reserved `Buy & Claim ↗` top slot for the authenticated-non-owner claimable-with-store state, displacing `Add Claim` into the secondary 2-up row. Add the requirement that `Buy & Claim ↗` records a self-claim on activation and is offered only to authenticated non-owners (guests keep `Add Claim` primary).
- `claim-attribution`: add the undo popup as a new post-claim surface reachable from `Buy & Claim ↗` — a `Modal`-based controlled dialog with a `ghost` undo action (left) and a `primary` keep-claim dismissal (right), distinct from the `Manage claim` already-claimed modal state. The `Buy & Claim` self-claim writes through the existing `createPurchase` self-claim path; undo dispatches the existing `removePurchase`.

## Impact

- **Client / render:** `app/(main)/items/ui/components/ItemActions.tsx` (new `Buy & Claim ↗` slot + authed gating), `Item.tsx` (Buy & Claim click handler reusing `recordClaim`; undo-popup open state + a success callback), `ItemCard.tsx` (thread the authed/Buy-&-Claim signal). New undo-popup component under `app/(main)/items/ui/components/` built on `Modal`. Co-located CSS in the items `styles/` (`purchase.css`) for any popup layout not covered by primitives.
- **Server actions / DAL:** none new — reuses `createPurchase` (self-claim) and `removePurchase` from `lib/data/purchase.actions.ts`, both of which already `updateTag('items')`.
- **Cache:** affected reads consume `cacheTag('items')`; the two mutations already revalidate it. No new read, no new tag.
- **Primitives:** reuses `Button` (`primary`/`ghost`), `LinkButton` (`primary`, `target="_blank"`), and `Modal`. `confirm-dialog-system` and `button-system` are **not** modified.
- **Sibling coordination — [#256](https://github.com/JoshEddie/CTRLplusList/issues/256):** both chunks MODIFY the same `item-actions` matrix requirement and both build on #234; neither blocks the other, so landing order is unspecified. `Buy & Claim ↗` is keyed on a navigable link (`!!store?.link`), the same predicate #256 applies to `View item ↗`, so a linkless PRICED/BARE item keeps its `Add Claim`-only action set under either landing order (design D-Linkless-256). Whichever lands second rebases its delta onto the first.
- **No schema or migration change.**
