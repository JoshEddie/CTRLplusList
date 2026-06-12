# Design — portal-purchase-modal

## Context

Shared `Modal` ([Modal.tsx](../../../app/(main)/items/ui/components/purchasemodal/Modal.tsx)) is a plain inline component: `.modal-overlay` (`position: fixed; z-index: 100`) renders wherever its consumer sits in the tree. Two consumers:

- `PurchaseModalSlot` — mounted by `Item.tsx` inside `.item-grid-container` (`overflow-y: auto`) inside `.container--list-details` (`overflow: hidden`).
- `ShareButton` — mounted inside the list hero.

On iOS WebKit the items scroll container is composited as its own layer; the fixed overlay's paint order resolves inside that layer, so positioned siblings (`.list-hero-shell { position: relative }`, `.items-pagination { z-index: 1 }`, toolbar) paint above the modal regardless of its `z-index: 100` (issue #148). Inline placement is also fragile on all engines: any stacking context on a card ancestor (`.item-container:has(.menu-popover) { z-index: 30 }`, `.purchased { opacity: 0.85 }`) traps the overlay.

Repo precedent: `ImageSearch.tsx` portals to `document.body` with a `mounted` state guard for SSR.

## Goals / Non-Goals

**Goals:**

- Purchase/claim modal fully visible above all page chrome on iOS (PWA, iOS Chrome/Safari).
- Fix at the shared `Modal` primitive so both consumers inherit it with no API change.
- Structural testability: overlay is a direct child of `document.body`.

**Non-Goals:**

- `ConfirmDialog` primitive (same latent bug class, separate spec `confirm-dialog-system`) — follow-up change.
- Focus trap, `<dialog>` element migration, scroll-locking, or other modal a11y work.
- Removing the dead `.item-form-modal` CSS selectors (no TSX consumer) — cleanup noted, not required here.

## Decisions

### D1: Portal inside `Modal`, not in consumers

Single seam — both consumers (`PurchaseModalSlot`, `ShareButton`) fixed at once, no caller changes, future consumers safe by default. Alternative (portal at each call site) rejected: duplicates the guard, leaves the primitive trappable.

### D2: `createPortal(..., document.body)` + mounted guard, mirroring `ImageSearch.tsx`

`Modal` becomes a client component (`'use client'`) returning `null` until a `useEffect`-set `mounted` flag is true, then `createPortal(overlay, document.body)`. Matches the established repo pattern exactly; no new dependency or pattern. Alternatives rejected:

- **`<dialog showModal()>`** — native top-layer also solves stacking, but changes focus/ESC/backdrop semantics and test surface; bigger change than the bug needs.
- **CSS-only fix (hunt and neutralize each stacking context)** — whack-a-mole; iOS compositing behavior isn't addressable from CSS on the trapped subtree, and new ancestors can reintroduce the trap.
- **Restructure list-details layout** — high blast radius; layout is governed by `items-browser-chrome` / `list-hero-collapse` specs.

One-render-cycle mount delay from the guard is imperceptible (modal opens from user interaction post-hydration).

### D3: Spec delta is ADDED requirement on `list-item-management`

Existing requirement "purchase modal SHALL render the claim flow…" governs content and is untouched. Layering/escape is a new concern → ADDED requirement, avoiding archive-time loss from a partial MODIFIED copy. Cross-capability note: `confirm-dialog-system` owns ConfirmDialog layering; not constrained here.

## Risks / Trade-offs

- [Existing tests query the modal within the rendered container] → portal moves DOM to `document.body`; RTL `screen.*` queries still find it (jsdom body), but `container`-scoped queries or snapshot assumptions may need updating. Run targeted suites for `PurchaseModalSlot`, `Item`, `ShareButton`; `ShareButton.test.tsx` mocks `Modal` so it is insulated.
- [Cannot reproduce the bug in local preview (desktop engine)] → verify structurally (overlay parent is `document.body`) + on-device check after deploy. Do not claim device-verified in the PR.
- [Backdrop click/close-button behavior could shift if event handlers relied on tree position] → handlers live inside the portaled subtree; React portals propagate events through the React tree, so `onClose` wiring is unchanged.
