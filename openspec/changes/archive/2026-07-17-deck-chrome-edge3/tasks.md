# Tasks — deck-chrome-edge3

**Read `design.md` first.** Two rules govern every task: (1) **chrome + step-model only** — reuse and lightly adjust the existing well editors/cards, never rebuild a field body from the mock (design.md D6); (2) **app design system wins over the mock** — use `global.css` tokens, app fonts, and existing components; the value map is design.md D8. Mint a token only per Q4.

## 1. Shared dismiss primitive (DRY guard)

- [x] 1.1 Extract `useDismiss(onClose, closeHref)` + the overlay-self-click dismiss out of `FormShell.tsx` into a shared primitive (co-located util/hook), preserving the exact three-branch resolution (form-shell-system delta). No behavior change.
- [x] 1.2 Make `FormShell.tsx` compose the shared primitive; confirm its rendered structure, variants, and dismiss branches are unchanged (existing form-shell-system tests still pass).

## 2. Deck-owned shell + scroll scaffold (fixes #255)

- [x] 2.1 Create `DeckShell`/`DeckScreen` (`app/(main)/items/ui/components/itemform/deck/`): overlay-wrapped rounded container composing the shared dismiss; overlay-self-click dismisses, descendant clicks do not.
- [x] 2.2 `DeckScreen` renders three regions — `flex:none` pinned header slot, `flex:1; min-height:0; overflow-y:auto` well, `flex:none` pinned footer slot (design.md D2, exact geometry). Head/foot slots optional.
- [x] 2.3 Author `deck-screen.css`: `.deck-screen` / `-hd` / `-well` / `-ft` (mirrors `form-shell-*` suffixes). Shell height capped to the visual viewport via the fixed inset-0 overlay + `max-height: 100%` (the `100dvh`-equivalent D2 called for), `overscroll-behavior: contain`, `scrollbar-gutter: stable` on the well. One shared vocabulary — this replaces the six competing sets.
- [x] 2.4 Token pass (design.md D8): map every needed value to an existing `global.css` token; no new global token — the well aliases `--card-accent-background-color` locally (Q4: owner chose reuse).
- [x] 2.5 `form_field` wrapper background transparent → `var(--light-color)` (form-field.css) so fields keep a solid surface on the sunken deck well; a pixel no-op on white shells (`--light-color` is `#ffffff`), and `form-field-system` leaves the wrapper's background value unpinned.

## 3. Step model: all-steps + shared gate

- [x] 3.1 `neededSteps.ts` → return the **full applicable step set** with per-step status (design.md D4): title/price always apply (good → done, not hidden); photo per 0/`>1`/single rules; note inline-vs-standalone rule preserved. Ordering: completed-first, then first-incomplete onward.
- [x] 3.2 Add `stepBlocked(step, item)` to `neededSteps.ts` (design.md D5) — the single gate source. Refactor `TitleCard.tsx` `continueDisabled` to consume it (no duplicated tier logic).
- [x] 3.3 `Deck.tsx`: open at the first incomplete step; track `maxReached`; derive per-node reachability (done/reached → clickable; future/gated → not). Backward nav always allowed.

## 4. Navigational footer tracker (the one net-new UI unit)

- [x] 4.1 Build the tracker component (replaces `ProgressDots.tsx`): done = solid `var(--success-text)` + white check as a back-nav `<button aria-label="Go back to The {Step}">`; current = white + `2px var(--primary-color)` ring + `aria-current="step"`; future = white + `var(--neutral-border-color)` ring + native `disabled`. Connector color = the node it leads into. (design.md D3, exact geometry.)
- [x] 4.2 a11y: current≠future by ring-weight + label-weight (not hue); per-node accessible labels; group sr-only "Step N of M"; NOT `aria-live`; 44px hit target via padding (visual node ~22px); roving `tabindex` (group = one tab stop).
- [x] 4.3 Wire tracker back-nav to `Deck.tsx` `setIndex`; forward nodes locked while `stepBlocked(current)`; remove the standalone Back button from the deck card footer.

## 5. Re-slot every screen into `DeckScreen` (reuse bodies, don't rebuild — D6)

- [x] 5.1 `DeckCard.tsx`: stop owning chrome; render through `DeckScreen` (eyebrow/title/subtitle → head slot, editor body → well, actions + tracker → foot). Cards (`Title/Photo/Price/Note/Intro`) keep their editor content; only their wrapper changes.
- [x] 5.2 `Preview.tsx` + `PreviewCard.tsx` → `DeckScreen`; **keep `container-type: inline-size`** and the 520px two-column query. Error/submit stay in the footer slot.
- [x] 5.3 `Triage.tsx`, `FillManually.tsx` → `DeckScreen` (`FieldRows` reused); Fill-manually keeps `<h2>` "Add the details" + "Tap a field to fill it in." in the deck-owned shell (item-decision-deck MODIFIED).
- [x] 5.4 `FocusEditor.tsx`, `sheets/StoresSheet.tsx`, `sheets/ListsQtySheet.tsx`, `FetchFailure.tsx` → `DeckScreen` (head/foot slots optional per screen).
- [x] 5.5 Delete the six dead structural vocabularies from `deck.css` (`deck-body`, `deck-card-head/-body/-foot`, `deck-preview-head/-body/-submit`, `deck-triage-head`, `deck-focus-body`, `deck-sheet-body`, the 5-way title/sub groups). Keep content-widget classes (photo/stepper/actrow/triage-row/store/list/trim).

## 6. Chrome + scroll polish

- [x] 6.1 Floating close mirroring `.item-owner-actions-kebab` (item.css:243), ~32px, `aria-label="Close"`, AA target.
- [x] 6.2 Scroll-shadows at well boundaries via a small scroll/resize listener in `DeckScreen` toggling `-shadow` classes on the pinned header/footer (design.md D7, REVISED during apply — the no-JS `animation-timeline: scroll()` route failed cross-browser).
- [x] 6.3 `<500px` viewport-height collapse: single root scroller, footer scrolls with content (REVISED during apply — a sticky footer eats most of a very short viewport), close pinned (design.md D2 / short-viewport requirement).

## 7. Container wiring

- [x] 7.1 `ItemFormContainer.tsx`: swap `FormShell` → deck-owned shell; `shellTitle()` → eyebrow flow-name ("Add an item" / edit equiv). Preserve the wide/preview width behavior via the shell.

## 8. Open questions (resolve with owner during apply)

- [x] 8.1 Q1 — IntroCard fate vs the always-visible tracker (keep as step 0 unless it duplicates the tracker).
- [x] 8.2 Q2 — exit-to-URL-entry from the first step with Back removed (default: X close exits; confirm return-to-URL-entry need).
- [x] 8.3 Q3 — reachability of an auto-completed step ahead of a gated current step (default: locked).

## 9. Tests

- [x] 9.1 Unit: `neededSteps` all-steps output (each fetch shape → full set + statuses + order) and `stepBlocked` per tier; name from behavior (`TESTING.md`).
- [x] 9.2 Unit: tracker node states (done/current/future), back-nav to done, forward locked while gated, a11y attributes present.
- [x] 9.3 e2e: `Continue`/submit reachable on a tall screen at desktop, portrait-phone, and 430px-landscape viewports; tracker back-nav jumps to a done step. (`e2e-critical-flows`.)

## 10. Gates

- [x] 10.1 `npm run lint` (zero errors, zero non-size warnings) · `npx tsc --noEmit` · `npm run build`.
- [x] 10.2 `npm run test:coverage` · `npm run test:e2e`.
- [x] 10.3 `openspec validate deck-chrome-edge3 --strict`; confirm no file exceeds the 400-line red band (split by cohesion if so).
