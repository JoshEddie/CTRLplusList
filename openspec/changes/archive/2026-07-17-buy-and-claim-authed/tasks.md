## 1. Undo popup component

- [x] 1.1 Add an undo-popup component under `app/(main)/items/ui/components/` built on the shared `Modal` primitive: title "You've claimed this", the quantity-agnostic message, a left `<Button variant="ghost">` "No — undo claim" (calls an `onUndo` prop then closes), and a right `<Button variant="primary">` "Yes, I purchased it" (calls `onClose`). Controlled via an `isOpen`/`onClose` contract; renders nothing when closed.
- [x] 1.2 Add any popup-specific layout to the co-located items stylesheet (`app/(main)/items/ui/styles/purchase.css`); reuse existing tokens, no page-scoped overrides of primitive classes.
- [x] 1.3 Unit-test the popup per `TESTING.md`: closed renders nothing; open renders the title/message and the two buttons with the correct variants and order (ghost undo left, primary keep right); "No — undo claim" invokes `onUndo` then closes; "Yes, I purchased it" invokes `onClose` without `onUndo`.

## 2. Buy & Claim in ItemActions

- [x] 2.1 Add a `showBuyClaim` input to `ItemActions.tsx` gated on a **navigable link** (`!!store?.link`, the same predicate as `View item ↗` — never mere store presence, so a PRICED/linkless item never qualifies); when true, render `Buy & Claim ↗` as the primary top slot (`<LinkButton variant="primary" href={store.link} target="_blank" rel="noreferrer">`, `MdOpenInNew` `aria-hidden`, accessible name conveys "opens in new tab", `onClick` stops propagation) and demote `Add Claim` into the 2-up secondary row alongside `View item ↗`.
- [x] 2.2 Keep every other state byte-identical: guest claimable → `Add Claim` primary; store-less/PRICED/BARE (no navigable link) → `Add Claim` full width (the store-navigating `Buy & Claim` drops out with `View item`); viewer-claimed / fully-claimed / owner rows unchanged.
- [x] 2.3 Thread the authed/Buy-&-Claim signal from `Item.tsx` (which owns `user_id`) through `ItemCard.tsx` to `ItemActions.tsx` — computed once in `Item.tsx` (authenticated AND not owner AND not fully claimed AND no removable claim AND primary store has a navigable link), matching how `showOwnerClaimAction` is derived.
- [x] 2.4 Update `ItemActions` unit tests for the new matrix rows: authed claimable+link → Buy & Claim primary + View·Add 2-up; guest claimable → Add Claim primary (no Buy & Claim); linkless (PRICED) or store-less authed claimable → Add Claim full width, no Buy & Claim, no View item.
- [x] 2.5 Coordinate with sibling chunk [#256](https://github.com/JoshEddie/CTRLplusList/issues/256) (both MODIFY the same `item-actions` matrix requirement; landing order unspecified): if #256 has landed, rebase onto its `!!store?.link`-keyed View and looser store-validity; if this lands first, ensure the link-keyed gate holds before #256's validity loosening reaches `lowestPricedStore`.

## 3. Buy & Claim click + undo popup wiring

- [x] 3.1 In `Item.tsx`, add an ephemeral undo-popup open state and a Buy & Claim click handler that records a self-claim through the existing `recordClaim` path (awaited; commits local state only on success) and opens the undo popup on success — no optimistic pre-commit, no rollback. On failure the existing `toast.promise` error fires and no popup opens.
- [x] 3.2 Wire the popup's `onUndo` to the existing `removeClaim(removableClaim)` for the just-recorded claim, and `onClose` to clear the popup open state. Render the popup as a sibling of `PurchaseModalSlot`, gated out of `preview` mode.
- [x] 3.3 Confirm no new server action or DAL read is introduced — the flow reuses `createPurchase` (self-claim) and `removePurchase`, both already `updateTag('items')`; affected reads already consume `cacheTag('items')`.
- [x] 3.4 Unit-test the `Item.tsx` behavior per `TESTING.md`: successful Buy & Claim opens the popup and shows the viewer's claim; undo dispatches `removePurchase` and returns the item to claimable; keep dismisses with the claim intact; a rejected claim opens no popup.

## 4. Verification

- [x] 4.1 Run the gates: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:coverage`.
- [x] 4.2 Add or extend e2e coverage if the critical-flow specs require it; otherwise record the two test gates' status with rationale per `CLAUDE.md`. — Rationale: e2e coverage for the Buy & Claim → undo flow is deferred to [#260](https://github.com/JoshEddie/CTRLplusList/issues/260), which must cover the #234, #235, and #260 changes together; this change's behavior is covered by the unit matrix (`ItemActions`, `Item`, `ClaimUndoPopup` tests) and the full e2e suite still runs green on the dev-push CI battery.
- [x] 4.3 `openspec validate buy-and-claim-authed --strict`.
