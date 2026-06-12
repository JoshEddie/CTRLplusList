## 1. Menu primitive flip logic

- [x] 1.1 Add a `menu-popover--up` modifier rule in `app/ui/components/menu/menu.css` that replaces `top: calc(100% + 6px)` with `bottom: calc(100% + 6px)` (and unsets `top`)
- [x] 1.2 In `app/ui/components/menu/Menu.tsx`, add a `useLayoutEffect` keyed on `open` that measures the mounted popover (`getBoundingClientRect` vs `window.innerHeight`) and applies the `menu-popover--up` class when the menu doesn't fit below the trigger but does fit above; default stays downward, decision computed once per open

## 2. Tests

- [x] 2.1 Unit tests in `app/ui/components/menu/__tests__/` for the flip decision: fits-below keeps default placement; overflows-below-fits-above applies `menu-popover--up`; fits-neither keeps default (internal scroll handles it) — with mocked `getBoundingClientRect`/`innerHeight` per TESTING.md
- [x] 2.2 Regression assertions that an upward-placed menu still honors Escape/outside-click dismiss and open-focus with `{ preventScroll: true }`

## 3. Manual verification

- [x] 3.1 Manually verified by the owner in the local dev server: the kebab menu on a bottom-of-viewport item flips upward and renders fully within the viewport

## 4. Pre-merge

- [x] 4.1 `npm run lint` — zero errors; two pre-existing yellow size advisories in untouched files (the tolerated warning class)
- [x] 4.2 `npx tsc --noEmit` — zero errors
- [x] 4.3 `npm run build` — completes successfully
- [x] 4.4 `npm run test:coverage` — 2247/2247 passing, 100% line coverage maintained
- [x] 4.5 `npm run test:e2e` — 33/33 passing
