## Why

`StoreFilterPopover.tsx` is the last untested filter popover in the items toolbar. `test-items-browser-chrome` (§9.6) deliberately scoped it out and module-mocked it in both `ItemsToolbar.test.tsx` and `FiltersSheet.test.tsx`, deferring its internals to this carve-out so its store-search/checkbox/empty-state/footer behavior is asserted directly rather than stubbed away. Unlike its sibling `PriceFilterPopover` (governed by the existing `items-price-filter` spec), `StoreFilterPopover` has **no dedicated capability spec** — its only normative trace is one bullet in `items-browser-chrome` describing OR-within/AND-across filter matching, which governs the URL-level filter algebra owned by `ItemsToolbar`, not the popover's own UI. This change closes both gaps: a behavior spec and the tests that pin it.

Inherited constraints (verified by grepping every active `spec.md`):

- **`items-browser-chrome`** owns the toolbar row layout, the filters bottom-sheet that hosts this popover, and the `store` (repeatable) URL-param filter algebra. This change SHALL NOT re-govern any of that — the popover speaks only through its `onToggle(name)` / `onClear()` callback props; the parent owns translating those into `store` search params.
- **`popover-trigger-system`** owns the `PopoverTrigger` button surface (icon, label, `count` badge, `active` state, `aria-haspopup`/`aria-expanded`). The popover composes it; it does not restyle it.
- **`form-field-system`** owns the `SearchField` and `CheckboxField` input chrome. The popover composes them; the store-filter spec governs only how their values drive the option list.
- **`popover-trigger-system`** also owns `usePopoverDismiss` (the outside-click / Escape dismiss hook, tested under §3.5). The popover wires it; this change asserts the wiring (open → outside-click/Escape closes), not the hook's internals.

## What Changes

- **New tests**: `StoreFilterPopover.test.tsx` (jsdom + RTL) covering the popover's full surface to the universal coverage floor (`lines:98 / statements:98 / branches:95 / functions:100`):
  - trigger renders the count badge and `active` state from `selectedStores.length`; clicking toggles `open` and reflects `aria-expanded`;
  - the search field case-insensitively filters `storeOptions` by substring on `query`, trims whitespace, and shows all options when the query is empty;
  - the empty state (`No matching stores`) renders only when the filtered list is empty;
  - each option's `CheckboxField` reflects membership in `selectedStores` and calls `onToggle(name)` on change;
  - the footer Clear button is `disabled` when `count === 0` and calls `onClear` otherwise; Done closes the panel without mutating selection;
  - outside-click and Escape (via `usePopoverDismiss`) close an open panel.
- **New spec**: `store-filter` capability — the behavior contract for the store-filter popover (search-narrowing, checkbox toggle semantics, empty state, Clear/Done footer, dismiss), scoped to exclude what the inherited specs above already own.
- **Governance**: closes `test-coverage` §4.17. Records its `testing-foundation` delta tier (expected **Tier 2 / archive-only** — no new foundation rule, only inheritance) for the §7.6 audit.

No source behavior change is anticipated; if a test surfaces a genuine bug or a cross-file refactor need, it is fixed in place when single-file or deferred as a new sub-proposal per the audit-deferral rule (recorded, never left as a TODO).

## Capabilities

### New Capabilities
- `store-filter`: Behavior of the `StoreFilterPopover` — how the search field narrows the rendered store options, how option checkboxes reflect and mutate the selected set via `onToggle`/`onClear`, when the empty state shows, how the Clear/Done footer behaves, and how the panel opens and dismisses. Composes `popover-trigger-system`, `form-field-system`, and `usePopoverDismiss`; defers the toolbar layout and the `store` URL-param algebra to `items-browser-chrome`.

### Modified Capabilities
<!-- None. items-browser-chrome's store-filter algebra bullet stays binding and unchanged; this capability composes it rather than modifying it. -->

## Impact

- **Code**: adds `app/(main)/items/ui/components/__tests__/StoreFilterPopover.test.tsx`. Source `StoreFilterPopover.tsx` unchanged unless a test surfaces a single-file fix.
- **Specs**: new `openspec/specs/store-filter/spec.md` (created from this change's `specs/store-filter/spec.md` delta at archive time).
- **Coverage / config**: `StoreFilterPopover.tsx` lifts from module-mocked-elsewhere to directly covered at the universal floor. No `vitest.config.ts` `COVERAGE_FLOOR` change (per-file enumeration is unnecessary for a single self-contained component; it sits under the global floor).
- **No server reads**: the popover is a pure client component over props — no DAL read, no cache tag, no `revalidateTag` path.
- **Governance**: `test-coverage/tasks.md` §4.17 checkbox flips on archive.
