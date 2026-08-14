# Add Claim opens the claim flow while the viewer holds a claim

## Why

On a multi-quantity/unlimited item where the viewer already holds a claim and slots remain, the card renders `Manage claim` and `Add Claim` — but `PurchaseModalSlot` branches the entire modal on `removableClaim`, so both affordances open the same manage state and the claim flow is unreachable. `Add Claim` is a dead-end alias, contradicting the settled #169 design (`Add Claim` in the slots-remain state records an *additional* claim — attributed or guest). The intent was present in #169's matrix but dropped from #234's scope during ticket restructuring ([#260](https://github.com/JoshEddie/CTRLplusList/issues/260), map [#233](https://github.com/JoshEddie/CTRLplusList/issues/233)).

`item-actions` binds the affordances to "open the existing purchase modal in the viewer-appropriate state (contract owned by `claim-attribution`)" — this change sharpens that contract on the `claim-attribution` side; the `item-actions` matrix and labels are already correct and stay untouched.

## What Changes

- **Affordance-routed modal state**: the purchase modal's opening state is selected by the invoking affordance, carried in a second URL param (`purchaseView=claim`, set only by `Add Claim`); when the param is absent the default preserves today's behavior (manage state when the viewer holds a removable claim, claim flow otherwise). Closing the modal clears both params.
- **Viewer manage state becomes a claims list**: the manage state lists every claim the viewer can remove (their own + those they recorded for others) with per-claim removal — the owner `Manage claims` list generalized to a shared, viewer-scoped component. The single-claim banner + single "Remove my claim" presentation is replaced by the list at every N.
- **Claim flow while holding a claim**: when the viewer is already the recorded purchaser, the one-tap self-claim CTA is hidden behind a single predicate (second self-claim is [MAP #230](https://github.com/JoshEddie/CTRLplusList/issues/230) cargo; least-rework presentation for that flip — no auto-expand plumbing). Attributed and guest claims are the live paths. No cross-navigation between modal states — card affordances are the only router.
- **N-claims audit of single-claim consumers**: the `Buy & Claim` undo popup targets the *just-recorded* claim (not first-match `removableClaim`); the card's "You claimed this" banner enumerates all viewer-removable claims; `has-my-claim` container class and `viewerClaimed` predicates keep their any-removable-claim semantics.
- **E2E coverage** (deferral from #235 rides here): happy-path specs covering the #234 ItemActions matrix, #235 Buy & Claim + undo popup, and this change's affordance routing + viewer manage list.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `claim-attribution` — modal opening-state contract (affordance-routed via URL param + default rule), viewer manage-list state (replaces the single-claim already-claimed state), self-claim CTA suppression while the viewer is the recorded purchaser, undo-popup just-recorded-claim targeting, multi-claim card banner.
- `e2e-critical-flows` — new covered flows: Buy & Claim → undo popup (keep and undo), Add Claim → claim flow while claimed, viewer manage list with per-claim removal, ItemActions matrix spot-checks.

## Impact

- **Code**: `app/(main)/items/ui/components/Item.tsx` (state routing, undo target, banner data), `PurchaseModalSlot.tsx` (state branch), `ItemCard.tsx`/`ClaimBanners.tsx` (banner enumeration), `purchasemodal/PurchaseFlowContainer.tsx` (claims-list generalization, self-CTA predicate), co-located tests, `e2e/` specs.
- **No schema, no migration, no DAL read-shape change** — map #233 constraint holds; the partial unique index on `purchases (item_id, user_id)` remains the concurrency backstop and is unconsumed by this change.
- **No new server reads** — the modal consumes purchase rows already delivered to the card; no cache tags added.
- **Specs**: delta on `claim-attribution` and `e2e-critical-flows`; `item-actions`, `item-store-links` (modal store row renders in every state incl. the manage list) unchanged.
