# Delta: list-item-management — portal-purchase-modal

## ADDED Requirements

### Requirement: The shared Modal SHALL render through a portal to document.body

The shared `Modal` component (`app/(main)/items/ui/components/purchasemodal/Modal.tsx`), used by the purchase/claim modal (`PurchaseModalSlot`) and the share modal (`ShareButton`), SHALL render its `.modal-overlay` via `createPortal` targeting `document.body`, guarded so nothing renders before client mount (SSR-safe, matching the `ImageSearch.tsx` pattern). The overlay therefore escapes every page-level scroll container and ancestor stacking context and paints above all page chrome (list hero, items toolbar, pagination overlay) on all engines, including iOS WebKit compositing (PWA and iOS browsers).

This requirement governs layering/placement only; the modal's content, flows, and mounting triggers remain governed by the existing purchase-modal requirements in this capability and by `claim-attribution`. `ConfirmDialog` layering is owned by `confirm-dialog-system` and is not constrained here.

#### Scenario: Overlay is a direct child of document.body

- **WHEN** a consumer renders `Modal` with any children after client mount
- **THEN** the `.modal-overlay` element's parent node is `document.body`, not the consumer's subtree

#### Scenario: Nothing renders before client mount

- **WHEN** `Modal` is rendered during SSR or before the client mount effect runs
- **THEN** no `.modal-overlay` element is emitted (no portal call against an unavailable `document`)

#### Scenario: Close interaction unchanged through the portal

- **WHEN** the user activates the modal's close button
- **THEN** the consumer-provided `onClose` handler fires exactly as it did pre-portal
