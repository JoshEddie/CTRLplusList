## Why

The items toolbar's price filter is the only control that requires an explicit Apply button — search, sort, purchases, show, store, and view all commit instantly. There is no DB-call or atomicity reason; the toolbar's `updateParams` simply calls `router.replace(...)` for every control, and Next refetches identically regardless of trigger. The Apply button exists as a UX guard against the "type `19999`, fire 5 intermediate refetches" problem, but a trailing-edge debounce solves that just as cleanly as the search field already proves (`SearchInputControl` in [ItemsToolbar.tsx:72-98](app/(main)/items/ui/components/ItemsToolbar.tsx)). The remaining real concern — inverted bounds (`max < min`) producing empty grids — is better surfaced as an inline field error than papered over with a manual Apply gate.

Inherited constraints from active specs:

- **form-field-system** (`spec.md` requirements on `FieldError` and the "Tooltip-as-error pattern is removed" SHALL): any new error UX MUST flow through the existing `error` prop on `<PriceField>` / `<FieldError>` and MUST NOT introduce a tooltip- or hover-gated error surface.
- **popover-trigger-system** (Requirement: "Filter popovers and list-selection trigger migrate to PopoverTrigger"): the `<PopoverTrigger>` is the governed surface; the popover panel body remains page-scoped, which is where this change lives.
- **items-browser-chrome** explicitly excludes "the filters bottom-sheet UX" from its scope — no existing capability governs price-filter behavior, so this change introduces one.

## What Changes

- Drop the **Apply** button from `PriceFilterPopover`. Replace it with a **Done** button whose only job is to close the popover, symmetric with `StoreFilterPopover` ([StoreFilterPopover.tsx:92](app/(main)/items/ui/components/StoreFilterPopover.tsx)).
- Commit price changes on a **400ms trailing-edge debounce** after the last keystroke, mirroring the existing search-field pattern.
- Validate `max ≥ min` when the debounce fires. If the pair is inverted (`max < min`, equivalently `min > max`), suppress the URL commit and render an inline `<FieldError>` via the existing `<PriceField error="...">` plumbing under **whichever input the user most recently edited to cause the inversion** — Min when they just raised it above Max, Max when they just lowered it below Min — with copy that matches the offending field. Re-evaluate live as the user edits so the error clears (and moves, if appropriate) the moment the pair becomes valid or either field is cleared.
- Preserve the existing popover-dismiss auto-commit safety net at [PriceFilterPopover.tsx:109-115](app/(main)/items/ui/components/PriceFilterPopover.tsx) — but teach it to skip the commit when the current local state is invalid (nothing to revert because invalid state was never pushed to the URL).
- No changes to `ItemsToolbar`'s `applyPrice` / `clearPrice` callbacks, no changes to URL param names (`price_min` / `price_max`), no changes to data fetching.

## Capabilities

### New Capabilities

- `items-price-filter`: governs the behavior of the price-range filter popover in the items toolbar — when edits commit to the URL, how `max < min` is communicated, and how the popover panel's Done/Clear buttons behave. Layout of the toolbar row remains owned by `items-browser-chrome`; the trigger button itself remains owned by `popover-trigger-system`; field chrome and error display remain owned by `form-field-system`.

### Modified Capabilities

_None._ Inherited primitives (`PopoverTrigger`, `PriceField`, `FieldError`) are consumed as-is; no primitive-level requirement changes.

## Impact

**Code:**

- [app/(main)/items/ui/components/PriceFilterPopover.tsx](app/(main)/items/ui/components/PriceFilterPopover.tsx) — replace Apply with Done, add debounce + validation, wire `error` prop on Max `<PriceField>`.
- [app/(main)/items/ui/styles/item.css](app/(main)/items/ui/styles/item.css) — possibly minor layout tweaks for the panel footer (Done-only) and to ensure the inline error renders cleanly inside the popover. No new tokens expected; `--field-error-color` already exists per form-field-system.

**Out of scope:** no changes to `ItemsToolbar`, the items DAL, URL contract, or any other filter control. No changes to caching/`revalidateTag` (this change touches no server-side reads or mutations).

**Risk:** low. Behavior change is contained to one popover; URL contract and the rest of the toolbar are untouched. No data layer or auth surface affected.
