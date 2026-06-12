## ADDED Requirements

### Requirement: list-item-management UI carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The item-management UI carve-out (sub-proposal 4.9b, the UI half of the `test-list-item-management` split) — comprising the choose-items page, the item create/edit form and its `itemform/*` tree, the purchase/claim modal (`purchasemodal/*`), the delete-confirmation dialog and archive affordance (`DeleteItemButton.tsx`, `Item.tsx`), the `@dnd-kit/sortable` reorder surface (`SortItems.tsx`, `SortItemsContainer.tsx`), and the reorder mount gate (`ListItemsSection.tsx`) — SHALL be covered by colocated test files under `__tests__/` directories, each meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`) and referencing the shared constant (no per-file numeric variation). Every executable file in the carve-out SHALL have a per-file `thresholds` entry and a `sonarjs/cognitive-complexity = error` per-file override in `eslint.config.mjs`, promoted from the global `warn`.

This is a Tier-2 carve-out bookkeeping record per the parent `test-coverage` design D13: it lives in this sub-proposal's archive-only delta, does NOT roll into the parent `test-coverage` accumulator, and does NOT modify the active `openspec/specs/testing-foundation/spec.md`. The server actions these UI files call (`createItem` / `updateItem` / `createPurchase` / `removePurchase` / `setListItems` / `archiveItem` / `deleteItem` / `updatePriority`) are owned and floored by the sibling action-layer carve-out (`test-list-item-management`, 4.9a) and are module-mocked in these component tests; the governed primitives and `StoreLinks` are rendered through (not mocked) and are owned by their own carve-outs. On this carve-out's archive, the parent `test-coverage/tasks.md` §4.9 checkbox flips (4.9a having already archived).

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** every executable file in the item-management UI carve-out shows `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%` in the per-file coverage report
- **AND** the gate passes
- **AND** each per-file threshold entry in `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant

#### Scenario: Complexity ceiling fails lint in a carve-out file

- **WHEN** a contributor edits any carve-out file (e.g. `Item.tsx`, `SortItems.tsx`, `useItemForm.ts`, `ChooseItemsForm.tsx`, `PurchaseFlowContainer.tsx`) to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens any executable source file in the carve-out
- **THEN** a colocated test file exists in the sibling `__tests__/` directory

#### Scenario: Elevated UI invariants are regression-locked

- **WHEN** a future change breaks one of this carve-out's elevated UI invariants — the purchase modal sends a client-supplied `user_id`, the guest flow claims with an empty name, the drag-reorder handler dispatches the wrong `target_id` or skips the optimistic reorder, or the image-search modal surfaces a capacity error (HTTP 429 / `quota_exceeded`) as a generic load failure, or vice versa
- **THEN** the corresponding colocated test fails with an assertion naming the specific contract break
- **AND** the `test` pre-merge gate fails
