## Why

The item-decision-deck's screens cannot scroll at any viewport ([#255](https://github.com/JoshEddie/CTRLplusList/issues/255)): every deck screen renders as a direct child of `.form-shell` (`overflow: hidden` + a `max-height` cap) with no scroller in the chain, so content past the fold — the Preview action rows, a long store list, the description field on a portrait phone — is unreachable. Reproduced on an iPhone-14 viewport: the primary action (`Continue`/submit) sits off-screen with no way to reach it.

Two structural debts make a spot-fix wrong. First, the deck screens carry **six competing structural vocabularies** for the same header/body/footer concept (`deck-card-head/-body/-foot`, `deck-preview-head/-body/-submit`, `deck-triage-head`, `deck-focus-body`, `deck-sheet-body`, `deck-failure-actions`) plus a misnamed root class (`.deck-body` is the screen root, not a body), patched together by 5-way grouped selectors — the exact per-screen structural drift [#246](https://github.com/JoshEddie/CTRLplusList/issues/246) warned about. Adding a seventh scroller vocabulary would deepen it. Second, the settled Edge 3.0 redesign (owner-approved this session) changes the deck's chrome and step model, and the scroll fix is the same diff as the re-slot — doing them separately throws work away.

Inherited constraints (grepped from active specs — binding SHALLs this change modifies):
- **item-decision-deck** currently mandates *hide-satisfied* steps ("surface only fields needing a human", order `intro → photo → title → price → note`), a non-navigable progress indicator, the intro summary card, and that Manual entry render *inside `FormShell`* with title "Add an item". Edge 3.0 reverses the first and reworks the rest.
- **form-shell-system** defines `FormShell` + the internal `useDismiss` hook. The deck stops routing through `FormShell`; `useDismiss`/overlay-dismiss is extracted to a shared primitive both compose. FormShell's rendered contract and dismiss behavior are preserved.
- **button-system**, **form-field-system**, **item-image-candidates**, **product-link-prefill** primitives are reused as-is; no new page-scoped surfaces.

Grilling for this change was completed across the originating conversation; settled decisions and the authoritative pixel spec live in the change's `design.md`.

## What Changes

- **The deck owns its own shell.** New `DeckShell`/`DeckScreen` (overlay + rounded box + floating close + head/well/footer slots) replaces `FormShell` for the item-add flow. `ItemFormContainer` swaps `FormShell` → the deck shell; `shellTitle()` becomes the eyebrow flow-name. **BREAKING** (form-shell-system: deck is no longer a `FormShell` consumer; item-decision-deck: Fill-manually no longer renders in `FormShell`).
- **Three-region scroll structure on every deck screen** — pinned header, `flex:1; min-height:0; overflow-y:auto` well, pinned footer. Fixes #255 at all viewports. One shared `.deck-screen-*` vocabulary replaces the six competing per-screen naming sets.
- **Edge 3.0 chrome:** no titled shell bar; a floating round close mirroring the item-card `...` kebab (`.item-owner-actions-kebab`); eyebrow = flow name ("Add an Item"); per-screen title + subtitle pinned in the header; sunken well surface; CSS scroll-shadows at the well boundaries.
- **All-steps navigational step tracker, in the footer.** The tracker shows **every** applicable step (done ✓ / current / future), reversing the hide-satisfied behavior; the deck opens at the first incomplete step; auto-satisfied steps render as done. Done nodes are clickable to navigate back; the standalone **Back button is removed** (back-nav is the tracker). Forward locks while the current step is gated (over-limit), matching the existing Continue gate. **BREAKING** (reverses "surface only fields needing a human"; removes Back; navigational progress indicator, still not `aria-live`).
- **`neededSteps` returns the full applicable set + per-step status**; a single `stepBlocked(step, item)` helper feeds both the card's `continueDisabled` and the tracker's forward-gate (one source, no drift).
- **Short-viewport (`<500px` height) collapse** to a single root scroller (footer scrolls with content); the floating close stays pinned.
- **Design system is authoritative over the mock:** app tokens/fonts/components win on every conflict with the mock's raw hex/font/inline buttons (Continue = `<Button variant="primary">`, close = kebab treatment, tap-to-use = existing suggested-trim, error banner/counter = existing deck error-tier). At most the sunken-well surface may need one new token.

## Capabilities

### New Capabilities
<!-- none — the deck shell and tracker live inside item-decision-deck -->

### Modified Capabilities
- `item-decision-deck`: reverses hide-satisfied → all-steps model; progress indicator becomes a navigational footer tracker (done/current/future, back-nav, still not `aria-live`); intro/overview card reconciled against the always-visible tracker; deck screens gain the pinned-header / scrolling-well / pinned-footer structure and Edge 3.0 chrome; Manual-entry (Fill-manually) and all deck screens render in the deck-owned shell rather than `FormShell`.
- `form-shell-system`: `useDismiss` + overlay-self-click dismiss extracted to a shared primitive composed by both `FormShell` and the new deck shell; `FormShell`'s rendered structure, variants, and dismiss branches are unchanged (narrow delta acknowledging the shared home).

## Impact

- **New:** `app/(main)/items/ui/components/itemform/deck/DeckShell.tsx` (+ `DeckScreen`), a shared dismiss/overlay primitive, deck step-tracker component, `deck-screen.css` scaffold + tracker CSS.
- **Modified:** `ItemFormContainer.tsx` (shell swap), `Deck.tsx` (all-steps index + `maxReached`), `neededSteps.ts` (full set + status + `stepBlocked`), `ProgressDots.tsx` → tracker, `DeckCard.tsx` + all 7 screens (re-slot into `DeckScreen`), `TitleCard.tsx` (share `stepBlocked`), `deck.css` (restructure, drop the 6 vocabularies), `FormShell.tsx` (compose shared dismiss), `global.css` (≤1 new token if needed).
- **Preserved:** `container-type: inline-size` on Preview (520px two-column query); every interactive surface still routes through its primitive; the `titleTier`/`item.schema.ts` name gate; no DB/data-layer/cache changes (UI-only — no server reads or tags touched).
- **Tests:** unit for `neededSteps` all-steps + `stepBlocked` + tracker states/nav-gate; e2e asserting `Continue`/submit reachable at desktop, portrait-phone, and 430px-landscape viewports, and tracker back-nav.
