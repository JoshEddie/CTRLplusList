## Context

Sub-proposal **4.9b** of `test-coverage` adds unit/component coverage for the **item-management UI** — the UI half of the `test-list-item-management` mid-flight split. The action half (4.9a, `app/actions/items.ts` / `app/actions/lists.ts`) archived with both files at the per-file `COVERAGE_FLOOR` and complexity-promoted to `error`; the partial-unique-index claim-race and the `updatePriority` fractional-reorder algorithm are locked there. This carve-out covers the UI that drives those actions.

The foundation is fully in place and authoritative: vitest 4.x with the jsdom/node two-project split (`.test.tsx` → jsdom, `.test.ts` → node), RTL + `@testing-library/user-event`, the `__tests__/` colocation convention, the single `COVERAGE_FLOOR` constant, the four-audit obligation, the naming conventions, the no-backdoor rule, and the `sonarjs` warn→error-per-carve-out policy. The sibling carve-outs `test-items-browser-chrome` (4.5), `test-item-store-links` (4.4), and `test-items-library-shell` (4.18) have archived, floored every adjacent file, and explicitly deferred `Item.tsx` and the `itemform/*` tree to this carve-out.

Carve-out boundary (verified against `vitest.config.ts` thresholds and the live tree — none of these is enumerated today):

**IN (24 executable files), by surface:**

- **Choose-items (3):** `app/(main)/lists/[id]/choose-items/page.tsx`, `ChooseItemsBody.tsx` (async RSC), `ChooseItemsForm.tsx` (client, 370 LOC).
- **Item form (12):** `app/(main)/items/[id]/page.tsx`, `ItemFormBody.tsx` (async RSC); `itemform/ItemFormContainer.tsx`, `ItemForm.tsx`, `useItemForm.ts`, `ItemNameInput.tsx`, `StoreInput.tsx`, `ListSelection.tsx`, `QuantityLimitField.tsx`, `ImageUrlInput.tsx`, `ImageSearch.tsx` (portal), `ImageResultsViewer.tsx`.
- **Purchase/claim modal (4):** `purchasemodal/Modal.tsx`, `PurchaseFlow.tsx`, `ModalButtons.tsx`, `PurchaseFlowContainer.tsx`.
- **Delete/archive (2):** `DeleteItemButton.tsx`, `Item.tsx` (client, 426 LOC).
- **Reorder (2):** `SortItems.tsx` (`@dnd-kit`), `SortItemsContainer.tsx` (async RSC).
- **Reorder mount gate (1):** `app/(main)/lists/[id]/ListItemsSection.tsx` (async RSC).

**OUT (with rationale):** `Items.tsx` / `ItemsBrowser.tsx` / `ItemsToolbar` / `Pagination` (4.5, module-mocked where mounted), `StoreLinks.tsx` (4.4, rendered through the real primitive inside `Item.tsx`), `ItemsContainer.tsx` (4.18, module-mocked in `ListItemsSection`), the filter popovers (4.16/4.17), the server actions (4.9a, module-mocked), and all governed primitives (rendered real).

Three precedents shape the test design: the **async-RSC + boundary-mock pattern** (`FollowingPage.test.tsx` / `ItemsContainer.test.tsx` — mock `auth()`, mock DAL reads or seed pglite, sentinel `redirect()`, module-mock heavy children, `await` the component then `render`/inspect); the **client-component + `userEvent` pattern** (`FollowControls.test.tsx`, `SegmentedControl.test.tsx` — mock `next/navigation` hooks and `@/app/actions/*`, drive interactions); and the **dialog/overlay pattern** (`FollowDisclosureDialog.test.tsx` — assert overlay DOM state). The one surface with **no precedent** is `@dnd-kit` (Decision 5).

## Goals / Non-Goals

**Goals:**

- One colocated test file per executable source file (24), each meeting the universal `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`).
- Assert the UI side of the `list-item-management` contract: choose-items toolbar + save diff + row primitive, the claim-modal flow branch, the Archive/Delete distinct semantics + dialog matrix, the `returnTo` navigation, and the drag-reorder → `updatePriority` mapping.
- Elevate the source-enforced UI invariants no requirement currently states (Decision 7) onto `list-item-management`.
- Establish a reusable `@dnd-kit` drag-simulation test pattern (Decision 5) for the repo.
- Lock all 24 files at `sonarjs/cognitive-complexity = error`.
- Flip the parent `test-coverage` §4.9 checkbox (4.9a already done) on archive.

**Non-Goals:**

- Re-testing the chrome (`Items`/`ItemsBrowser`/`ItemsToolbar`/`Pagination`), `StoreLinks`, `ItemsContainer`, or the filter popovers — owned by 4.5 / 4.4 / 4.18 / 4.16 / 4.17.
- Re-testing the server actions (`createItem`/`updateItem`/`createPurchase`/`removePurchase`/`setListItems`/`archiveItem`/`deleteItem`/`updatePriority`) — owned by 4.9a; module-mocked here, asserting the UI's call payload.
- Re-testing the governed primitives — rendered for real to exercise integration; no primitive SHALL asserted.
- Re-owning the `/api/image-search` route auth/rate-limit SHALLs — owned by §4.13 / 5.1; the UI's `fetch` is mocked at the boundary, asserting only the UI's error-shape handling.
- Asserting `revalidateTag` invalidation — that is the actions' contract (4.9a); the actions are mocked here.

## Decisions

### Decision 1: One `*.test.tsx` per executable file, under `__tests__/` mirroring source.

24 test files, each colocated in a `__tests__/` directory beside its source (`app/(main)/items/ui/components/itemform/__tests__/`, `.../purchasemodal/__tests__/`, `app/(main)/lists/[id]/choose-items/__tests__/`, etc.). Trivial wrappers (`choose-items/page.tsx`, `items/[id]/page.tsx`, `Modal.tsx`, `PurchaseFlow.tsx`) still get a dedicated file — the per-file floor is enforced per file and `functions:100` admits no skips. This matches every prior carve-out.

**Alternative considered:** one mega-file per surface. Rejected — violates the one-file-per-module colocation convention and makes coverage attribution per source file harder to read.

### Decision 2: Async RSCs via the FollowingPage pattern; client components via RTL + `userEvent`.

The async server components — `ChooseItemsBody`, `ItemFormBody`, `SortItemsContainer`, `ListItemsSection`, and the two route `page.tsx` shells — are NOT RTL-`render`ed directly (an async component returns a promise). Per `FollowingPage.test.tsx` / `ItemsContainer.test.tsx`: mock `@/lib/auth`'s `auth()`, seed pglite (or mock the DAL read — Decision 4), mock `next/navigation`'s `redirect()` to throw a `REDIRECT:<url>` sentinel, module-mock the heavy children to prop-surfacing stubs, then `await` the component as a function and `render`/inspect the resolved tree. Redirect guards are asserted via `await expect(Component(props)).rejects.toThrow('REDIRECT:/lists/...')`.

The client components — `ChooseItemsForm`, `ItemForm`, `Item`, `DeleteItemButton`, `SortItems`, the `itemform/*` fields, `purchasemodal/*` — are rendered with RTL and driven with `userEvent.setup()`, after mocking `next/navigation` hooks (`useRouter`/`useSearchParams`/`usePathname`) and `@/app/actions/*` per test. `useItemForm.ts` is exercised via `renderHook` plus, where the integration matters, through `ItemForm` rendering.

**Alternative considered:** a Suspense-resolving render util for the RSCs. Rejected — element-tree inspection is the established, lint-accepted repo approach and asserts forwarded props precisely.

### Decision 3: Out-of-carve-out children module-mocked; primitives and `StoreLinks` rendered real; server actions module-mocked.

- **Module-mocked to prop-surfacing stubs:** `Items`/`ItemsBrowser` (where `ListItemsSection`'s viewer branch or any list view mounts them), `ItemsContainer` (in `ListItemsSection`), and any 4.5-owned chrome a carve-out file mounts. Stubs surface forwarded props as `data-*` so the mounting file's wiring is assertable without re-owning the child.
- **Rendered real (not mocked):** all governed primitives (`Button`, `TextField`/`CheckboxField`, `Menu`/`MenuItem`, `PopoverTrigger`, `Chip`, `ConfirmDialog`, `Empty`, `LoadingIndicator`, `TooltipWrapper`) and `StoreLinks` (4.4) — asserting *through* them exercises the item-management integration (e.g. the choose-items row really composing `<Item preview />` + `<CheckboxField>`, the delete dialog really rendering `ConfirmDialog`'s three buttons).
- **Server actions module-mocked:** `vi.mock('@/app/actions/items')` / `'@/app/actions/lists')` to `vi.fn()`s. The tests assert the UI calls the right action with the right payload (e.g. `createPurchase` receives `{ item_id, guest_name }` and never a `user_id`; `updatePriority` receives `(item_id, target_id, listId)`; `setListItems` receives the computed add/remove diff). The actions' own behavior + tag invalidation is 4.9a's contract.

**Alternative considered:** rendering the real chrome/actions. Rejected — drags sibling carve-outs' source into these tests, couples cross-capability failures, and (for actions) would hit pglite redundantly for behavior already covered by 4.9a.

### Decision 4: Seed pglite for the RSC shells' real reads; mock `fetch` for image-search; mock actions for mutations.

The async-RSC shells read through real DAL functions (`getListById`, `getItemsByUser`, `getItemById`, `getListsByUser`, list-membership reads). Per the testing-foundation "DAL is not mocked from integration tests" rule, where a shell's contract under test is *the data it loads*, the test seeds pglite via the existing `app/actions/__tests__/test-helpers.ts` builders (`seedList`, `seedItem`, `seedListItem`, `seedPurchase`) and `@/db` is module-mocked to the pglite instance. Where a shell's contract under test is purely *which child it mounts with which flags* (e.g. `ListItemsSection`'s owner-vs-viewer branch), the DAL read MAY be mocked at the `@/lib/dal` boundary per the `FollowingPage.test.tsx` allowance — the disposition is recorded per file in `tasks.md`. The `ImageSearch` modal's `/api/image-search` call is mocked at the `fetch` boundary (the route is 5.1's; the UI's contract is the request it issues and the `rate_limited` / `quota_exceeded` / generic error-shape handling). All mutation server actions are mocked (Decision 3).

### Decision 5: `@dnd-kit` reorder is tested by invoking the drag lifecycle directly with synthetic `active`/`over` payloads.

`SortItems.tsx` is the repo's only `@dnd-kit` consumer and has no test precedent. Pointer/keyboard-sensor drag gestures are notoriously brittle to simulate in jsdom (they depend on layout rects jsdom does not compute). The chosen pattern: render `SortItems`, then exercise its drag lifecycle by capturing the `DndContext` `onDragStart` / `onDragEnd` handlers and invoking them with synthetic events (`{ active: { id }, over: { id } }`) — the same shape `@dnd-kit` passes — to assert: (a) the optimistic `arrayMove` reorders the rendered list immediately, (b) `updatePriority` is called with the resolved `(item_id, target_id, listId)`, (c) a no-op drop (`over.id === active.id` or `over == null`) calls nothing, and (d) the `DragOverlay` renders the active item during drag. To reach the sensor-configuration and `SortableItem` branches for the per-file floor, the `useSortable` surface is exercised through real renders; any genuinely unreachable sensor branch (e.g. a platform-gated `TouchSensor` activation jsdom cannot fire) is disposed with `/* v8 ignore */` + a named reason, never by lowering the floor.

**Alternative considered:** full pointer-event simulation via `@dnd-kit`'s own test utilities or `userEvent` drag. Rejected — jsdom's missing layout geometry makes sensor activation flaky and the assertions would test `@dnd-kit` internals, not `SortItems`'s contract (the target resolution + `updatePriority` payload + optimistic reorder). **Alternative considered:** extracting the drag-end logic into a pure function and unit-testing it in isolation. Held as a fallback if branch coverage of the rendered component proves unreachable — recorded as a possible complexity-audit extraction; the synthetic-handler approach is tried first because it covers the component as shipped.

### Decision 6: Portal modals (`ImageSearch`, the `Item` claim modal) are asserted via their rendered overlay DOM in the jsdom document.

`ImageSearch.tsx` uses `createPortal`; `Item.tsx` mounts the purchase modal (`Modal` + `PurchaseFlowContainer`). RTL renders portals into the jsdom `document.body`, so `screen.getByRole('dialog')` / queries on the portal content work without special handling (the `FollowDisclosureDialog.test.tsx` overlay precedent). Tests assert the open→content→close lifecycle: trigger opens the portal, the expected flow/results render, and the close affordance (`Modal`'s X, or an `onClose`) unmounts it. The image-results selection callback and the claim-flow branch are asserted on the rendered overlay.

### Decision 7: ADD the source-enforced UI invariants to `list-item-management`; MODIFY/REMOVE none.

Three UI invariants pass the three-part elevation test — (a) non-obvious from name/signature/type, (b) survives a reasonable reimplementation, (c) protects a real failure mode — and none is currently a requirement:

- **Purchase-modal flow-branch contract.** `PurchaseFlowContainer` renders distinct flows by viewer state: unauthenticated → guest-name capture + sign-in affordance; authenticated → self-vs-other branch; and the claim dispatch obeys the no-client-`user_id` rule (authed claims use session identity; guest claims supply `guest_name`; guest revoke requires the `purchase_id`). **Failure mode:** the wrong claim UI renders, or a forged identity path opens — a HIGH-stakes claim/spoiler defect. Non-obvious: four branches collapse onto one action whose payload shape is identity-dependent. (The action side is 4.9a's; this locks the *UI* that produces those payloads.)
- **Drag-reorder UI → `updatePriority` mapping.** `SortItems`'s `onDragEnd` resolves the dropped item and its drop-target neighbor and calls `updatePriority(item_id, target_id, listId)` with an optimistic `arrayMove`; a no-op drop dispatches nothing. **Failure mode:** the handler passes the wrong target id and the action (correctly) reorders to the wrong place, silently corrupting a shared list's order. Non-obvious: the UI's target resolution is the half the action cannot validate.
- **Image-search error-shape UI contract.** The `ImageSearch` modal distinguishes `rate_limited` (the per-user 30/min bucket) from `quota_exceeded` (upstream provider) from a generic failure, surfacing distinct user-facing messaging. **Failure mode:** a rate-limit is shown as a permanent quota error (or vice versa), misleading the user. Non-obvious: two distinct error strings from the same endpoint map to different UI states.

The existing 13 `list-item-management` requirements are LOCKED as-is by the new tests (choose-items affordance/page/toolbar/save-diff/row-primitive, archive/delete distinct semantics, delete-dialog matrix, returnTo). **No requirement is MODIFIED or REMOVED** — the source matches them. Non-elevations (presentation incidentals: exact CSS class strings like `.choose-items-select`, the live-preview split-pane layout, exact modal copy) are recorded in `tasks.md` as DOM-presence-locked-by-tests-but-not-SHALLs.

**Alternative considered:** creating a new `item-management-ui` capability. Rejected — `list-item-management` already owns these surfaces substantively (its UI requirements name the choose-items page, the dialog copy, the row primitive); the new invariants belong on it, not a parallel capability.

### Decision 8: §4.13 coordination — page-RSC redirect guards are owned here.

`server-endpoint-authorization` (§4.13) scopes itself to `app/actions/**` + `app/api/**`; page-level RSC shells are out of its scope (the `test-items-library-shell` 4.18 precedent established this). Therefore the owner/auth `redirect()` guards in `ChooseItemsBody` (non-owner → `/lists/[id]`, unauthenticated → `/`), `ItemFormBody`, `SortItemsContainer`, and `ListItemsSection` are owned and asserted **here** (via the sentinel-throw pattern). §4.13 is neither modified nor referenced as owning them. No requirement is duplicated across the two specs.

### Decision 9: `ListItemsSection.tsx` is included as the reorder-surface mount gate.

`ListItemsSection` is an async RSC that gates owner → `SortItemsContainer` vs viewer → `ItemsContainer`. It is unowned (not floored anywhere) and is the integration point for the `@dnd-kit` reorder surface this carve-out owns; the owner-gate decision is item-management behavior. It is therefore included. Its viewer branch mounts `ItemsContainer` (4.18-owned), which is module-mocked here. (Recorded so a future reviewer does not mistake this for a list-hero concern.)

### Decision 10: Audit-driven extractions are in-carve-out, single-file, behavior-preserved.

The complexity hotspots flagged by the live global `warn`s are `ChooseItemsForm`, `Item`, `useItemForm`, `SortItems`, and `PurchaseFlowContainer`. If any function measures ≥ 15 at HEAD, the complexity audit disposes in-place: a single-file extraction (e.g. the choose-items filter/sort derivation into a co-located `utils.ts`; the drag-end target resolution out of `SortItems`; the claim-flow branch selection out of `PurchaseFlowContainer`), with behavior preserved by the new tests, or a named `// eslint-disable-next-line` with a reason — never a ceiling raise. Duplication-audit candidates (the `returnTo` validation if duplicated, any repeated viewer-display derivation, any repeated fixture/`auth()`-mock setup across 3+ test files) are extracted to a co-located `utils.ts` / `__tests__/test-helpers.ts` per the project's helper-home convention. Exact dispositions are decided at apply time and recorded in `tasks.md`.

## Risks / Trade-offs

- **`@dnd-kit` has no test precedent and jsdom lacks layout geometry** → Decision 5's synthetic-handler approach drives the drag lifecycle without real sensor activation; the pure-function extraction is the recorded fallback if rendered-component branch coverage proves unreachable.
- **The carve-out is large (24 files, ~2,500 LOC, three hard surfaces)** → if it cannot land in one reviewable change, the parent's "split mid-flight → open a sibling issue" instruction applies; the fault line is (a) choose-items + form vs (b) claim-modal + delete/archive + reorder. Recorded in the proposal Impact; a split would add a discovered sub-proposal to `test-coverage/tasks.md` §4.
- **Async RSCs cannot be RTL-`render`ed directly** → Decision 2's `await`-then-inspect + redirect-sentinel pattern.
- **Branch coverage of the claim-flow matrix and the validation ladders (name/URL/price/link in `useItemForm`)** → parameterize over the viewer-state × flow matrix and the validation cases to reach `branches ≥ 95`; genuinely unreachable branches get `/* v8 ignore */` + named reason, never a lowered floor.
- **Complexity near the ceiling in the five hotspots** → Decision 10's in-place single-file extraction (behavior-preserved by the new tests); the file is never skipped.
- **Over-elevation** → Decision 7's three ADDs are each justified against the three-part test; presentation incidentals are explicitly recorded as non-elevations, not SHALLs.
- **Mocking the actions risks testing the mock** → the assertions are on the UI's *call payload* (what `createPurchase`/`updatePriority`/`setListItems` receive) and the UI's *response to the mocked result* (toast, navigation, optimistic state), not on round-tripping a mock's return value — the testing-foundation "don't assert on values your mocks returned" bar is respected.

## Migration Plan

Additive: ~24 new test files, two config edits (`vitest.config.ts` thresholds, `eslint.config.mjs` overrides), the `list-item-management` spec delta (the ADDED UI-invariant requirements), and one archive-only `testing-foundation` Tier-2 record. Any audit extraction is a behavior-preserving in-place refactor proven by the new tests. No other runtime source change. Rollback = revert the change; no production path depends on it.

## Open Questions

None blocking. The two judgment calls — including `ListItemsSection` (Decision 9) and the `@dnd-kit` strategy (Decision 5) — are resolved here with recorded fallbacks. The per-file seed-pglite-vs-mock-DAL choice for each RSC shell (Decision 4) and the exact audit dispositions (Decision 10) are decided at apply time per the standing audit workflow, not design unknowns. Whether to exercise the mid-flight-split escape hatch is an apply-time call against the actual diff size, not a design decision.
