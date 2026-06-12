# Portal the purchase/item modal to document.body

## Why

On iOS WebKit (installed PWA, iOS Chrome, iOS Safari — [issue #148](https://github.com/JoshEddie/CTRLplusList/issues/148)) the purchase/claim modal paints **under** the list hero, items toolbar, and pagination overlay, leaving only a clipped slice of the modal visible. Desktop browsers and device emulation do not reproduce it.

Root cause is structural: the shared `Modal` (`app/(main)/items/ui/components/purchasemodal/Modal.tsx`) renders inline inside the item card's subtree, which sits inside `.item-grid-container` (`overflow-y: auto`) inside the fixed-height `.container--list-details` (`overflow: hidden`). iOS promotes the scroll container to its own composited layer for async scrolling, and the fixed-position overlay's paint order gets resolved within that layer — positioned siblings (`.list-hero-shell` relative, `.items-pagination` z-index 1) composite above it despite the overlay's `z-index: 100`. Even on spec-compliant engines the inline placement is fragile: any stacking context on a card ancestor (`.item-container:has(.menu-popover) { z-index: 30 }`, `.purchased { opacity: 0.85 }`) caps the modal at card level.

Inherited constraints: `list-item-management` §"The purchase modal SHALL render the claim flow for the viewer's state" binds the modal's *content* (guest/self-claim/already-claimed flows mounted by `Item.tsx` via `PurchaseModalSlot`) — content and mounting trigger are unchanged by this proposal. `claim-attribution` binds the claim-flow internals (single screen, pool fetch on open) — also unchanged. The repo already has portal precedent with an SSR mounted-guard: `ImageSearch.tsx` (`createPortal(content, document.body)`).

## What Changes

- The shared `Modal` component renders its overlay via `createPortal(..., document.body)` with the same SSR mounted-guard pattern `ImageSearch.tsx` uses, instead of inline in the item card subtree.
- All `Modal` consumers (purchase/claim modal via `PurchaseModalSlot`, item-form modal via `.item-form-modal`) inherit the fix with no API change.
- No content, flow, or trigger behavior changes — `showModal` state, `purchaseItem` URL param, close handling all stay as-is.
- `ConfirmDialog` (separate primitive, same latent bug class) is explicitly **out of scope**; flagged as follow-up.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `list-item-management`: the purchase/item modal SHALL be rendered through a portal to `document.body` so its overlay escapes every page-level scroll container and stacking context, painting above all page chrome (hero, toolbar, pagination) on all engines including iOS WebKit.

## Impact

- `app/(main)/items/ui/components/purchasemodal/Modal.tsx` — portal + mounted guard.
- Existing unit tests for modal consumers may need `document.body` queries instead of container-scoped queries.
- No data layer, schema, or cache-tag impact (pure rendering-layer change).
- Verification limitation: local preview tools run desktop engines and cannot reproduce the bug; structural verification (overlay is a direct child of `document.body`) plus on-device check post-deploy.
