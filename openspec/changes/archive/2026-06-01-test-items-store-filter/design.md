## Context

`StoreFilterPopover.tsx` (`app/(main)/items/ui/components/StoreFilterPopover.tsx`) is a self-contained client component: it takes `storeOptions`, `selectedStores`, `onToggle`, `onClear` props and renders a `PopoverTrigger` plus a `role="dialog"` panel containing a `SearchField`, a list of `CheckboxField` options narrowed by a local query, an empty state, and a Clear/Done footer. It holds two pieces of local state (`open`, `query`) and one `useMemo` (the filtered list), and delegates dismiss to `usePopoverDismiss`.

`test-items-browser-chrome` module-mocked this component in both `ItemsToolbar.test.tsx` and `FiltersSheet.test.tsx` (stubbed to expose `onToggle`/`onClear`), so its internals are currently untested. This carve-out asserts those internals directly and elevates the behavior to a new `store-filter` spec.

The component composes only already-tested primitives and hooks: `PopoverTrigger` (§3.5 `popover-trigger-system`), `SearchField`/`CheckboxField` (§3.3 `form-field-system`), `Button` (§3.1 `button-system`), and `usePopoverDismiss` (§3.5). All inherit their own specs; this change does not re-test them.

## Goals / Non-Goals

**Goals:**

- A single colocated `StoreFilterPopover.test.tsx` (jsdom + RTL) that covers every branch of the component to the universal floor (`lines:98 / statements:98 / branches:95 / functions:100`): trigger count/active/toggle, search narrowing (incl. trim + case-insensitivity + empty query), empty state, checkbox checked-mapping + `onToggle`, footer Clear-gating + `onClear`, Done-closes-without-mutation, and `usePopoverDismiss` outside-click/Escape wiring.
- A new `store-filter` capability spec carrying those as normative requirements, scoped to defer toolbar layout and the `store` URL-param algebra to `items-browser-chrome`.
- Close `test-coverage` §4.17.

**Non-Goals:**

- Re-testing the composed primitives or `usePopoverDismiss` (covered by §3.1/§3.3/§3.5). The dismiss test asserts only that the popover *wires* the hook to close — not the hook's listener internals.
- Re-testing `FiltersSheet`/`ItemsToolbar` wiring (`storeOptions.length > 0` gate, `toggleStore`/`clearStores` → URL `store` params) — owned by `items-browser-chrome`, already tested with the popover mocked.
- Any source behavior change. If a test surfaces a single-file fix it is applied in place; a cross-file refactor is deferred as a new sub-proposal (recorded per the audit-deferral rule), never left as a TODO.
- A `vitest.config.ts` `COVERAGE_FLOOR` enumeration entry — unnecessary for one self-contained component under the global floor.

## Decisions

### D1: Render the real component; do not mock the primitives or `usePopoverDismiss`

The `testing-foundation` rule forbids mocking internal modules whose dependencies are local. `PopoverTrigger`, `SearchField`, `CheckboxField`, `Button`, and `usePopoverDismiss` are all local and render cleanly under jsdom, so the test renders the real `StoreFilterPopover` with all of them live and drives it through the DOM (click trigger, type in search, toggle checkboxes, click footer buttons, click outside / press Escape). `onToggle`/`onClear` are `vi.fn()` spies — they are the component's outward contract, not internal modules.

*Alternative rejected:* mocking the primitives to isolate the popover. That would re-introduce exactly the stub-out this carve-out exists to remove, and would not exercise the real `CheckboxField` checked-state mapping or the real `usePopoverDismiss` listener attach/detach.

### D2: Use Testing Library user interactions over fake timers

Unlike `PriceFilterPopover` (debounce-driven, needs fake timers), `StoreFilterPopover` has no timers — search filtering is synchronous via `useMemo`. So the test uses `userEvent`/`fireEvent` directly with no timer mocking. Outside-click is exercised by dispatching a pointer event on an element outside the popover root; Escape via a `keydown`. This keeps the test deterministic without fake-timer plumbing.

### D3: Assert checked-state mapping against the real `CheckboxField`, and `onToggle` via a controlled re-render

Because the component is controlled (it renders checked state from the `selectedStores` prop and delegates mutation to `onToggle`), the test asserts two things separately: (a) given a `selectedStores` prop, the right boxes render checked; (b) toggling a box calls `onToggle(name)` exactly once with the right name and does *not* self-mutate. Where a test needs to observe the post-toggle checked state, it re-renders with an updated `selectedStores` prop (mirroring how the parent feeds state back), rather than expecting the component to manage selection itself.

### D4: Cover the empty-state and Clear-disabled branches explicitly

The two easily-missed branches for the coverage floor are the `filtered.length === 0` empty state and the `disabled={count === 0}` Clear gating. Each gets a dedicated scenario (no-match query → "No matching stores"; empty `selectedStores` → Clear disabled) plus their positive complements, so both sides of each branch are hit.

### D5: New spec, not a modification of `items-browser-chrome`

`items-browser-chrome` owns the `store` (repeatable) URL-param filter algebra (the OR-within/AND-across bullet). That bullet governs the parent's translation of selection into search params and stays binding and unchanged. The popover's own UI behavior (search narrowing, checkbox semantics, empty state, footer, dismiss) has no current spec, so it becomes a new `store-filter` capability that *composes* the primitive specs and *defers* the algebra — matching how `items-price-filter` sits beside `items-browser-chrome` for `PriceFilterPopover`.

*Alternative rejected:* folding these requirements into `items-browser-chrome`. That would couple the popover's internal UI to the toolbar capability and blur the same boundary `items-price-filter` already established for the sibling popover.

## Risks / Trade-offs

- **[Outside-click dismiss is finicky under jsdom]** → `usePopoverDismiss` is already tested under §3.5, so this suite asserts only the wiring (open → outside pointer/Escape → closed). It dispatches the event `usePopoverDismiss` actually listens for (verified by reading the hook) rather than guessing, and keeps the assertion at the observable level (panel no longer rendered).
- **[Coverage floor on a tiny component is brittle to an uncovered branch]** → the branch inventory is small and fully enumerated in D4; the test maps one-to-one to the spec scenarios, so a missed branch shows up as both a coverage miss and a missing scenario.
- **[Spec-overlap with `items-browser-chrome`]** → mitigated by D5: every `store-filter` requirement names what it defers (toolbar layout, `store` param algebra, primitive chrome) so the boundary is explicit and the algebra bullet is not duplicated.
