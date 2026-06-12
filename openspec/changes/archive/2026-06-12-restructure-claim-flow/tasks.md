## 1. Data layer — createPurchase return id + optimistic state

- [x] 1.1 Extend `createPurchase` in `lib/data/purchase.actions.ts` to return the inserted row's id via `.returning({ id })` (additive to the existing success shape); update the action's unit tests for the new return field
- [x] 1.2 Rework `recordClaim` optimistic state in `Item.tsx` to use the server-issued id (no more `optimistic-${Date.now()}`), reconciling optimistic vs server rows by id; add a unit test for unclaim-immediately-after-claim and for no-duplicate when the server snapshot lands first
- [x] 1.3 Collapse the duplicated removal blocks (`handleUndoConfirm` / `handleRemoveClaim`) into one shared removal helper (one home for the `removePurchase` dispatch, toast copy, and `localPurchases` filter); undo path closes the modal after it

## 2. Store presentation split

- [x] 2.1 Extract shared store validity/sort/price helpers (valid-store predicate, price-ascending sort, lowest price) into a co-located `utils.ts` so card chips, the metadata line, and the modal store row share one home
- [x] 2.2 Build the store-metadata line (price row text `{price} · {store} · {store} +N`, max 2 named, muted, inert, single-line) for non-owner card and row views
- [x] 2.3 Build the modal store row: ghost `<LinkButton target="_blank" rel="noreferrer">` primary + "+N stores" `<Menu>`/`<MenuLinkItem>` popover (hover-open with collapse grace, plus click/tap; price-ascending, `$X.XX`); verify Escape closes the menu without closing the modal; renders nothing when no valid store
- [x] 2.4 Simplify `StoreLinks.tsx` to the owner-surface chip row: drop the claim-button `children` passthrough (render `null` with no valid store), keep choose-items / sortable / items-library behavior unchanged

## 3. Card restructure

- [x] 3.1 Replace the non-owner card actions with the single "Get this gift" `<Button>` (full label at all viewports) opening `?purchaseItem=<id>`; card body stays inert — the button is the sole modal-opening affordance
- [x] 3.2 Implement the fully-claimed card state: muted/desaturated treatment, disabled "✓ Fully claimed" pill (right-column cell, shared 165px width floor in row view), modal not openable
- [x] 3.3 Implement the viewer-claimed card state: outline "Manage your claim" button opening the modal's already-claimed state; route existing `ClaimBanners` undo affordances to the same state
- [x] 3.4 Update row-view grid CSS for the viewer-aware anatomy (owner keeps cols 3–4 pill/+N; non-owner collapses them, metadata joins the price row, leader dots owner-only) at ≥600px and the <600px reflow; retire the `<600px` "Claim" short label

## 4. Purchase modal restructure

- [x] 4.1 Restyle the modal shell content: header with item thumbnail, name, price, close — inside the existing `Modal` primitive; map mockup values to existing `global.css` tokens
- [x] 4.2 Signed-in friend variant: store row → primary "Claim this gift" → collapsed "Claiming for someone else?" disclosure (avatar-stack hint, chevron; `variant="link"`/list-row treatment per button-system)
- [x] 4.3 Disclosure + picker: pool fetch starts on modal open; expanded states for loading ("Loading {owner}'s circle…"), loaded picker (search live-filter, select-toggle rows with checkmark, "Someone not listed?" free-text, mutual-exclusion of selection vs free-text), "Confirm — {name}" appearing only with a target; collapse resets state
- [x] 4.4 Picker error state: replace the swallowed `.catch(() => {})` with an honest "Couldn't load {owner}'s circle" + retry; genuinely-empty pool renders only the free-text fallback
- [x] 4.5 Guest variant: store row → "Your name" + "Claim as Guest" (disabled until non-empty) → sign-in pitch footer ("Have an account? Sign in to claim with your profile."); dispatch contract unchanged
- [x] 4.6 Owner variant: spoilers OFF → store row + "Your list" label only (no claim UI/data); spoilers ON → "I bought this myself" + "Claiming for someone?" disclosure (same picker, "Search your circle…")
- [x] 4.7 Already-claimed state replacing the confirm-only unclaim modal in `PurchaseModalSlot.tsx`: store row + "✓ You claimed this" banner (or attributed-person naming) + danger "Remove my claim" (single activation, no extra confirm)
- [x] 4.8 Component/unit tests for the modal variants: store row in every variant, disclosure states (collapsed default, loading, loaded, error+retry, empty pool), guest disabled-CTA, owner spoiler gating, already-claimed removal dispatch

## 5. E2E updates

- [x] 5.1 Update flows 7/9/10/11 specs for the new anatomy: "Get this gift" entry affordance, "Claim this gift" self-claim, disclosure expand + select-then-confirm for the attributed claim, owner "I bought this myself", guest path unchanged copy assertions
- [x] 5.2 Add the store-row assertion: purchase modal renders the primary store link (new-tab) alongside the claim CTA; no direct store-link affordance on the non-owner card

## 6. Pre-merge

- [x] 6.1 `npm run lint` — zero errors, zero warnings (size bands respected on touched files; split if any file goes red)
- [x] 6.2 `npx tsc --noEmit` — zero errors
- [x] 6.3 `npm run build` — completes successfully
- [x] 6.4 `npm run test:coverage` — zero failing tests, coverage reported
- [x] 6.5 `npm run test:e2e` — zero failing tests
