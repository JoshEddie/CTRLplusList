## Context

`.menu-popover` is absolutely positioned with `top: calc(100% + 6px); right: 0` inside its relatively-positioned trigger wrapper — it always opens downward. When the trigger sits near the bottom of the viewport (the last items on a list page, especially on mobile), the menu renders past the viewport edge and, being a popover, doesn't extend the scrollable area; most of it is unreachable ([issue #131](https://github.com/JoshEddie/CTRLplusList/issues/131)).

The primitive is governed by `openspec/specs/menu-system/spec.md`. Two existing behaviors interact with placement:

- Open-focus uses `{ preventScroll: true }` precisely so an offscreen-opening menu doesn't yank the page — flipping makes that scenario rarer but the focus contract stays untouched.
- `<Menu>` accepts an optional `anchorRef` (the trigger) already, used for outside-click exclusion — the same ref is the natural measurement anchor.

## Goals / Non-Goals

**Goals:**

- The menu is fully reachable regardless of where the trigger sits in the viewport.
- One fix in the primitive; zero changes in consumers.
- No regression to the specced dismiss, focus, and keyboard contracts.

**Non-Goals:**

- Horizontal collision handling (`right: 0` alignment is unchanged; no consumer overflows horizontally).
- A general-purpose positioning engine or floating-UI dependency.
- Live repositioning while scrolling/resizing with the menu open (the menu is short-lived; placement is computed once on open).

## Decisions

### Measure-and-flip in `Menu.tsx`, expressed as a CSS modifier class

On open (layout effect), measure `anchorRef.current.getBoundingClientRect()`; if `window.innerHeight - rect.bottom` is less than the menu's rendered height (plus the 6px gap) **and** the space above the trigger is larger, add a `menu-popover--up` class that swaps `top: calc(100% + 6px)` for `bottom: calc(100% + 6px)`. Default remains downward.

- Why measure the real menu height (`localRef.current.offsetHeight`) rather than a fixed estimate: menu content varies per consumer (2 rows vs. the avatar popover); an estimate would flip too eagerly or too late.
- Why `useLayoutEffect`: the decision needs the mounted menu's height but must apply before paint to avoid a visible one-frame downward flash.
- Why prefer "below unless it doesn't fit and above fits better" over "pick the larger side": below is the established default across the app; flipping only on collision keeps behavior stable for the common case.
- Why a modifier class instead of inline styles: keeps positioning in `menu.css` next to the base rule, consistent with the repo's vanilla-CSS convention.

### Rejected: CSS anchor positioning (`position-try-fallbacks`)

Native and zero-JS, but unsupported in Safari (including iOS Safari, where the bug was reported) as of now — the primary affected platform would see no fix. Revisit when Safari ships it.

### Rejected: floating-ui (or similar) dependency

A full positioning library for one flip axis on one primitive is over-generality; the measurement is ~10 lines.

### Degenerate case stays as-is

`max-height: 80vh; overflow-y: auto` already bounds the menu when neither side fits; the flip logic doesn't need to handle it specially.

### `anchorRef` remains optional

When no `anchorRef` is provided, the menu's own `offsetParent` (the trigger wrapper) supplies the rect via `localRef.current.parentElement` — or more simply, the menu's own rect's top edge approximates the trigger's bottom. Implementation may measure from `localRef.current.getBoundingClientRect()` directly: if the menu's bottom exceeds `window.innerHeight` and flipping up keeps its top ≥ 0, flip. This avoids requiring `anchorRef` and measures the actual collision rather than inferring it.

## Risks / Trade-offs

- [Placement computed once on open] → if the user scrolls with the menu open, the chosen side persists; acceptable because menus dismiss on outside interaction and are short-lived.
- [jsdom returns zero-size rects] → unit tests assert the class-toggling logic via mocked `getBoundingClientRect`/`innerHeight`; real-geometry verification happens via preview tools (e2e optional).
- [One-frame flash if effect ordering is wrong] → use `useLayoutEffect` so the class is applied before paint.
