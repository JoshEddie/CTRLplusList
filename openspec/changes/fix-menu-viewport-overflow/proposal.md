## Why

Opening the item kebab menu (`...`) on the last items of a list renders the menu below the bottom edge of the viewport — only a sliver of the first row is visible and the rest is unreachable, because the popover is `position: absolute` and doesn't extend the scrollable area ([issue #131](https://github.com/JoshEddie/CTRLplusList/issues/131)). The root cause is in the shared menu primitive: `.menu-popover` always opens downward (`top: calc(100% + 6px)`) with no collision detection, so every consumer (item row kebab, list-hero kebab, avatar popover) has the same failure mode whenever the trigger sits near the bottom of the viewport. Observed on mobile (iOS Safari/Chrome) but reproducible at any viewport size.

Inherited constraints: the menu primitive is governed by `openspec/specs/menu-system/spec.md` — notably the open-focus requirement ("focus the first non-disabled item on open with `{ preventScroll: true }`", whose rationale already references hover-opened-upward menus near container edges) and the trigger/anchor contract. The fix must not disturb the outside-click/anchor-ignore behavior, keyboard navigation, or the `menuItemClasses` composition contract.

## What Changes

- Add placement awareness to the `<Menu>` primitive: on open, measure available space below the trigger (anchor `getBoundingClientRect()` vs `window.innerHeight`) and flip the popover to open upward (`bottom: calc(100% + 6px)` instead of `top`) when the menu would not fit below.
- Default placement remains downward; flipping is the collision fallback only. The existing `max-height: 80vh; overflow-y: auto` on `.menu-popover` continues to handle the degenerate case where neither side fits.
- One home: the change lives entirely in the menu primitive (`app/ui/components/menu/`), fixing every `.menu-popover` consumer with no per-consumer changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `menu-system`: the popover SHALL flip to open upward when the space below the trigger is insufficient to fit the menu, instead of always opening downward; default (space-permitting) placement remains below the trigger.

## Impact

- `app/ui/components/menu/Menu.tsx` — measurement + placement state on open.
- `app/ui/components/menu/menu.css` — an upward-placement variant of `.menu-popover`.
- `app/ui/components/menu/__tests__/` — coverage for the flip behavior.
- All `.menu-popover` consumers (item row kebab, list-hero kebab, avatar popover) benefit with no code changes; no DB, data-layer, cache, or API impact.
