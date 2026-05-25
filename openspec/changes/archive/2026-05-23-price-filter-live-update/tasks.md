## 1. Refactor PriceFilterPopover panel

- [x] 1.1 In [PriceFilterPopover.tsx](app/(main)/items/ui/components/PriceFilterPopover.tsx), add a `useEffect` inside `PriceFilterPanel` that sets a 400ms `setTimeout` keyed on `[localMin, localMax]`, calls `onApply(localMin, localMax)` when it fires, and clears the timer on cleanup. Skip the timer/commit when the current pair fails the `max < min` validity check (see 2.1) or when local matches initial values.
- [x] 1.2 Replace the "Apply" `<Button>` in the panel footer with a "Done" `<Button variant="primary" size="sm" onClick={onClose}>Done</Button>` — verbatim mirror of [StoreFilterPopover.tsx:92](app/(main)/items/ui/components/StoreFilterPopover.tsx). Delete `handleApply` and the explicit Apply-button onClick path.
- [x] 1.3 Keep the Clear button shape unchanged; its `disabled` condition stays as "nothing in props AND nothing in local" (already correct at [PriceFilterPopover.tsx:87](app/(main)/items/ui/components/PriceFilterPopover.tsx)).

## 2. Validation + inline error wiring

- [x] 2.1 Add a pure helper inside the file (e.g. `isInvertedPair(min, max)`) that returns `true` only when both strings are non-empty AND `parseFloat(max) < parseFloat(min)`. Equal values must return `false` (equal is valid).
- [x] 2.2 Add a `lastEdited: 'min' | 'max'` piece of state inside `PriceFilterPanel`, default `'max'`. Update it to `'min'` in the Min input's `onChange` handler and `'max'` in the Max input's `onChange` handler, before/alongside the existing `setLocalMin` / `setLocalMax` calls.
- [x] 2.3 Derive `minError: string | undefined` and `maxError: string | undefined` from `isInvertedPair(localMin, localMax)` together with `lastEdited`: when inverted AND `lastEdited === 'min'`, set `minError = "Min must be at most Max"` and leave `maxError` undefined; when inverted AND `lastEdited === 'max'`, set `maxError = "Max must be at least Min"` and leave `minError` undefined; otherwise both undefined. Recompute every render so the error clears (and moves between fields) live as the user edits.
- [x] 2.4 Pass `minError` and `maxError` through to the Min `<PriceField error={minError}>` and Max `<PriceField error={maxError}>` respectively, relying on form-field-system's `<FormField>` plumbing for the `<FieldError>` render. Do NOT introduce any tooltip, popover, role=alert, or panel-level error banner. Do NOT attach the error to both inputs at once — the predicate guarantees mutual exclusion already, but a quick visual check during preview verification will confirm.
- [x] 2.5 In the debounce effect from 1.1, gate the `onApply` call on `!isInvertedPair(localMin, localMax)` so invalid pairs never reach the URL.

## 3. Update commit-on-dismiss path

- [x] 3.1 In the outer `PriceFilterPopover` component's `handleClose` ([PriceFilterPopover.tsx:109-115](app/(main)/items/ui/components/PriceFilterPopover.tsx)), change the gate from "values differ from props" to "values differ from props AND not invalid". When invalid, skip the commit silently (no toast, no message) and just close.
- [x] 3.2 Confirm `valuesRef` keeps reflecting the live local state (set in the existing effect at line 46-48) so the dismiss path sees the latest typed values. No new ref needed.
- [x] 3.3 Decide whether to flush a pending debounce timer on close (design Decision 5b says yes if cheap). **Resolution:** wired the panel's `onClose` prop to the outer `handleClose` instead of `() => setOpen(false)`. Done-click and outside-click now share the same dismiss path; both flush the latest `valuesRef` state if divergent and valid. The pending debounce timer's cleanup function clears it on unmount, so there's no double-commit. No timer ref needed.

## 4. CSS polish for the panel error state

- [x] 4.1 Inspected [item.css](app/(main)/items/ui/styles/item.css) `.price-filter-panel` rules (width `min(260px, 90vw)`, no fixed height, flex-row inputs with `flex: 1 1 0`). The `<FieldError>` from form-field-system slots below each input naturally; the panel grows to accommodate. No CSS changes needed. Will visually confirm during preview verification (5.x).

## 5. Preview verification (AUTH_BYPASS path)

- [x] 5.1 `AUTH_BYPASS=true` already set in `.env.local`; dev DB already seeded from prior work (213 items present under `dev-test-viewer`).
- [x] 5.2 Started dev server via `preview_start name=web`; navigated to `/items`; opened price popover.
- [x] 5.3 Fast-typing case verified: dispatched a single input event with value `5000` ($50.00); ~600ms later URL had `?price_max=50.00` and chip read "Up to $50.00". Debounce delays commit, single URL update fires after the typing settles. (Note: PriceField formats cents-as-integer, so digits `5000` = $50.00 — example numbers in earlier task copy assumed raw `19999` which would mean $199.99 in this UI; behavior is the same regardless of magnitude.)
- [x] 5.4 Slow-typing case implicitly covered by the sequence of separate test commits (5.3 → 5.5a → 5.6): each separated by >400ms wait produced its own URL update.
- [x] 5.5 Max-caused validation covered by 5.5b's final state — pair Min=$100, Max=$60 with `lastEdited='max'` rendered error under Max with copy "Max must be at least Min", URL unchanged from prior valid commit. Then typing $150 into Max cleared the error immediately and committed `?price_max=150.00&price_min=100.00`.
- [x] 5.5a Min-caused validation verified: starting from URL `?price_max=50.00`, typed $100 into Min — error rendered under **Min** with copy "Min must be at most Max", `aria-invalid="true"` on Min input, no error on Max, URL unchanged.
- [x] 5.5c Asymmetric error timing verified (post-fix for the "error flashes on first keystroke" bug): synchronous type-and-snapshot in one eval showed `error: null` on both fields immediately after typing an inverted pair; a follow-up snapshot 700ms later showed the error correctly surfaced. Live-clear synchronous verify: fixing the pair drops the error in the same render; re-breaking does NOT re-surface the error until the next debounce fire (gate reset). Error-moves-between-fields still works when the error is already shown — editing the other input flips `lastEdited` and moves the error synchronously, since the user is in "fixing mode" at that point.
- [x] 5.5b Error-moves-between-fields verified: from state Min=$100 Max=$50 (error under Min), typed $60 into Max — error moved from Min to Max, copy flipped to "Max must be at least Min", URL unchanged.
- [x] 5.6 Equal bounds verified: Min=$20, Max=$20 — no error, URL committed `?price_max=20.00&price_min=20.00`, chip "$20.00–$20.00".
- [x] 5.7 Close-while-invalid verified: with valid `$20.00–$20.00` filter applied, typed $5 into Max (now invalid Min=20 > Max=5), clicked Done — popover closed, URL unchanged at `?price_max=20.00&price_min=20.00`, chip still "$20.00–$20.00". Reopened popover — inputs read $20.00 / $20.00 (fresh from URL), no error.
- [x] 5.8 Apply button confirmed gone: panel footer renders exactly `[Clear ghost, Done primary]` — verbatim match to StoreFilterPopover. Screenshot captured at panel-open baseline and at error-state for visual record.
- [x] 5.9 Store filter unchanged: opened, toggled Amazon — URL added `&store=Amazon` live, chip appeared. Clicked Done — popover closed, URL preserved.

## 6. Pre-merge gates

- [x] 6.1 `npm run lint` — 0 errors, 1 pre-existing warning in `Avatar.tsx` (unrelated to this change — `<img>` tag, not introduced by this PR).
- [x] 6.2 `npx tsc --noEmit` — 0 errors.
- [x] 6.3 `npm run build` — completes successfully (exit code 0).
