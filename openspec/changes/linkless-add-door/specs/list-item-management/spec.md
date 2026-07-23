# list-item-management Delta

## REMOVED Requirements

### Requirement: The image-search modal SHALL distinguish capacity errors from generic upstream failures in the UI

**Reason**: The retained-but-unwired image-search cluster (`ImageSearch.tsx`, `ImageResultsViewer`, `image-search.css`, `GET /api/image-search`, their tests) is deleted — the prospective generic-lists reuse never materialized, the provider approach was judged unviable, and the linkless add door (this change) plus the candidate picker are its successors. Curated imagery for non-link gifts is parked at idea #280.

**Migration**: None — the code had zero live callers. A future feature wanting provider-backed image search re-specs from scratch.

## MODIFIED Requirements

### Requirement: The shared Modal SHALL render through a portal to document.body

The shared `Modal` component (`app/(main)/items/ui/components/purchasemodal/Modal.tsx`), used by the purchase/claim modal (`PurchaseModalSlot`) and the share modal (`ShareButton`), SHALL render its `.modal-overlay` via `createPortal` targeting `document.body`, guarded so nothing renders before client mount (SSR-safe). The overlay therefore escapes every page-level scroll container and ancestor stacking context and paints above all page chrome (list hero, items toolbar, pagination overlay) on all engines, including iOS WebKit compositing (PWA and iOS browsers).

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
