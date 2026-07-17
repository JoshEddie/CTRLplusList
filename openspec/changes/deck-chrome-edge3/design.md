## Context

The item-decision-deck renders each screen as a direct child of `.form-shell` (`overflow:hidden` + `max-height` cap) with no scroller — [#255](https://github.com/JoshEddie/CTRLplusList/issues/255): content past the fold is unreachable at any viewport. The screens also carry six competing structural vocabularies for one header/body/footer concept, patched by grouped selectors (the [#246](https://github.com/JoshEddie/CTRLplusList/issues/246) drift class). The owner-approved **Edge 3.0** redesign (this session) resolves both by giving the deck its own shell with a real scroll structure and a navigational step tracker.

**This design.md is self-contained and authoritative** — it carries the full structure, value map (D8), exact geometry, tracker spec, and per-screen reuse map (D6). Three committed, in-repo companions (every fresh session can open them; nothing is fetched live from DesignSync):
- [`reference/implementation.md`](reference/implementation.md) — **copy-ready CSS + JSX** for the net-new chrome/tracker in app tokens, at exact mock geometry. Transcribe this; do not re-derive it. (design.md still governs on any conflict.)
- [`reference/target-render.html`](reference/target-render.html) — the token-resolved **fidelity target**: what the code above produces in the app palette. Apply should match this render.
- [`reference/edge3-mock.html`](reference/edge3-mock.html) — the original mock, **non-normative visual reference only** (raw hex/fonts/inline buttons overridden by D8 — never copy values from it).

**Non-negotiable framings** (these are how the last deck redesign lost its design — do not repeat):
1. **Scope = chrome + step-model only.** Everything inside the scrollable well is already built in `app/(main)/items/ui/components/itemform/deck/` (`cards/`, `editors/`, `sheets/`). Reuse and lightly adjust; never rebuild a field body from the mock.
2. **App design system wins over the mock on every conflict.** The mock's raw hex, Roboto fonts, and inline-styled buttons are design-tool artifacts. Use `global.css` tokens, the app font stack, and app components (button-system, form-field-system, existing deck classes). Mint a new token only where the app has no role for it.

## Goals / Non-Goals

**Goals:**
- Every deck screen scrolls at all viewports; the primary action is never off-screen (#255).
- One shared `.deck-screen-*` structural vocabulary replaces the six competing sets.
- Edge 3.0 chrome: deck-owned shell, floating kebab-mirrored close, eyebrow flow-name, pinned per-screen title/subtitle, sunken well, CSS scroll-shadows.
- All-steps navigational footer tracker (done/current/future), opening at the first incomplete step, back-nav by clicking done nodes.
- No design drift: app tokens/fonts/components authoritative; existing editors reused.

**Non-Goals:**
- Rebuilding any field editor / card body (reuse only).
- Any DB, data-layer, cache-tag, or server-read change (UI-only).
- Changing the other six `FormShell` consumers or `FormShell`'s rendered contract.
- Image-search removal (#218), draft persistence / focal crop (#253) — out of this map's scope.
- New button/field/menu primitives — reuse existing primitive families.

## Decisions

### D1 — Deck owns its own shell (`DeckShell`/`DeckScreen`), not `FormShell`
Edge 3.0 deletes the titled shell bar and uses a floating close; `FormShell` always renders `.form-shell-hd` (title + close). Rather than bolt a headerless variant onto `FormShell`, the deck gets its own shell — the two concepts have diverged (classic titled-bar form modal vs headerless stepped deck), and per CLAUDE.md coupling rules divergent callers split rather than accrete flags. **DRY guard:** extract `useDismiss` + overlay-self-click dismiss into a shared primitive both `FormShell` and `DeckShell` compose — no duplication; `FormShell`'s rendered structure/behavior unchanged (narrow form-shell-system delta). *Alternatives:* `chrome="floating"` FormShell variant (rejected — grows a divergent flag onto a shared primitive); restyle the bar with a modifier (rejected — the #246 fight-the-element-with-absolute-positioning pattern).

### D2 — Three flex regions, well is the scroller (Shape B)
`DeckScreen` root `overflow:hidden`, flex-column; header + footer `flex:none` (geometry-pinned by flow); well `flex:1; min-height:0; overflow-y:auto`. *Alternative:* sticky content sliding under chrome (Shape A) — rejected (padding surgery, sticky quirks). Cap the shell to the dynamic viewport — never `100vh` (which overflows under mobile browser toolbars); implemented as `max-height: 100%` inside the fixed inset-0 overlay, which tracks the visual viewport and is the `100dvh` equivalent. `overscroll-behavior: contain` on the well, `scrollbar-gutter: stable`.

### D3 — Navigational step tracker in the footer, A3C palette
Tracker sits in the pinned footer above a full-width `Continue`; the standalone Back button is removed (back-nav = clicking a done node). Three node states, **built from app tokens** (zero new color tokens expected):
- **Done** → solid `var(--success-text)` circle + white check; `<button aria-label="Go back to The {Step}">`; clickable.
- **Current** → white circle, `2px solid var(--primary-color)` ring, number in `--primary-color`; `aria-current="step"`; heavier ring + weight-700 label.
- **Future** → white circle, thin `var(--neutral-border-color)` ring, number in `--muted-text-color`, weight-500 label; native `disabled` (the `:enabled` cursor affordance and roving `tabindex` gate on it; position stays perceivable via the group's sr-only "Step N of M"), not clickable.
- Connector between nodes takes the color of the node it leads into.
- a11y: current≠future by **ring-weight + label-weight**, not hue alone (WCAG 1.4.1); group keeps sr-only "Step N of M"; 44px hit target (visual node ~22px, padding expands tap area); roving `tabindex` so the group is one tab stop.

*Alternatives considered this session:* floating dots + hover labels (rejected — hover is dead on touch, and dots are tiny for navigation); numbered circles + connector labels at top (rejected — worst scaler for the dynamic 2–5 step count, tallest); status-colored nodes (green/amber/red, "A3") (rejected by owner — validation belongs in the field, not the tracker; current-vs-status collides); solid purple current (rejected — clashes with green done); footer vs header placement (footer chosen — keeps the editorial title at top, groups nav with the progression control, same viewport cost either way).

### D4 — All-steps model (reverses hide-satisfied)
`neededSteps(item)` returns the **full applicable step set** with a per-step status (done / needs-attention), not a filtered subset. The deck opens at the first incomplete step; auto-satisfied steps render as done and are back-navigable. Ordering: **completed-first, then the first-incomplete onward** (owner's worked examples: good-price+long-title → Price ✓, Photo ✓, Title current). *Alternative:* keep hide-satisfied (rejected — the navigational tracker's whole value is showing the full journey + what's done).

### D5 — One `stepBlocked(step, item)` gate helper
The forward gate (`titleTier(name).tier === 'error'`, etc.) currently lives inside `TitleCard` as `continueDisabled`. Lift it to a single `stepBlocked(step, item)` in `neededSteps.ts`, consumed by **both** the card's `continueDisabled` and the tracker's forward-lock (standing on a gated step, forward nodes disable — matching what `Continue` already enforces). One source, no drift. Backward nav is always open (data preserved in the viewModel).

### D6 — Reuse existing well components (chrome-only)
Each screen's well body is an existing component, re-slotted into `.deck-screen-well`:
Title→`TitleCard`+`TitleEditor` (name input, counter, `TierNote` error, `TrimChip` = the mock's "tap to use", inline description); Photo→`PhotoCard`+`PhotoEditor`; Price→`PriceCard`+`PriceEditor`; Note→`NoteCard`+`NoteEditor`; Intro→`IntroCard`+`FieldRows`; Preview→`Preview`+`PreviewCard` (**keep `container-type: inline-size`**); Triage/FillManually→`FieldRows`; Focus→`FocusEditor`; Sheets→`sheets/*`; Failure→`FetchFailure`. `DeckCard` stops owning chrome (progress/head/foot) and renders through `DeckScreen`.

### D7 — Boundary scroll-shadows (REVISED during apply)
Original decision: CSS-only (`animation-timeline: scroll()` or the background-gradient-cover trick), degrading to no-shadow where unsupported. Both CSS routes failed in practice: the background-cover trick paints shadows *under* content, so opaque field cards scrolling past hide them (top shadow never visible); scroll-driven animations aren't supported in Firefox — the owner's browser — degrading to nothing. Final implementation is the mock's own approach: a small scroll/resize listener in `DeckScreen` sets `data-shadow-top`/`data-shadow-bottom` on the well, and CSS renders sticky overlay pseudo-elements (above content, `z-index: 1`) whose opacity keys off those attributes. Shadow tint `rgba(30, 17, 72, 0.22)`. Works in all browsers; hidden when the well doesn't scroll.

### D8 — Design-system value map (mock intent → authoritative app value)
| Role | Mock (non-normative) | USE |
|---|---|---|
| Brand purple (eyebrow, current ring, Continue) | `#6d28d9` | `var(--primary-color)` |
| Title/value text | `#1f2937` | `var(--neutral-text-color)` |
| Muted (subtitle, hints, ok-counter) | `#6b7280`/`#9ca3af` | `var(--muted-text-color)` |
| Input border | `#d1d5db` | `var(--neutral-border-color)` |
| White chrome | `#fff` | `var(--light-color)` |
| Done-node green | `#15803d` | `var(--success-text)` |
| Error counter/banner | `#dc2626`/`#fde8e8`/`#b91c1c` | existing deck error-tier + banner (`.deck-counter-error`, `TierNote`) |
| Tap-to-use | `#b8a6f0` dashed | existing `TrimChip` / `.deck-trim-chip` |
| Hairline | `#ece9f6` | `var(--card-border-color)` |
| Future ring / number | `#d9d5e8`/`#9ca3af` | `var(--neutral-border-color)` / `var(--muted-text-color)` |
| Sunken well surface | `#f6f5fb` | reuse deck's current screen bg if any; else ONE new `--deck-well-bg` (owner-confirm) |
| Close border/shadow | `#e5e7eb`/`0 2px 8px …` | mirror `.item-owner-actions-kebab` (item.css:243) |

**Components:** Continue = `<Button variant="primary" width="full">`; inputs/labels = form-field-system; fonts = app stack (no Google Fonts link). The step tracker is the only net-new UI unit.

### Exact geometry (mock px = intent; keep ratios, map spacing to app scale where one exists)
- Header `.deck-screen-hd`: pad ~20/22/18. Eyebrow uppercase 14px w700 `--primary-color` letter-spacing .06em. Close 32×32 round. Title h2 27px/1.1 `--neutral-text-color` w700 mt~11. Subtitle 14px/1.4 `--muted-text-color` mt~8.
- Well `.deck-screen-well`: `--deck-well-bg`, pad ~6/22/22 (tight top; header gives space).
- Footer `.deck-screen-ft`: white, scroll-shadow, pad ~16/22/18 (REVISED during apply: the boundary hairlines sit on the well's own edges — `.deck-screen-well { border-top; border-bottom }` — not on the header/footer). Tracker row (nodes flex:1, 22px circles, 2px connectors, 9px labels, gap 5), then full-width `Continue`.

## Risks / Trade-offs

- **Design drift in apply** (the prior failure) → this design.md carries exact values + the reuse/authoritative rules; tasks reference it per-screen; e2e asserts the observable outcomes.
- **All-steps reverses a shipped spec requirement** → explicit MODIFIED delta + scenarios; unit tests pin the new `neededSteps` output and `stepBlocked`.
- **Removing Back leaves no exit from the first step** when it's current with no done node before it → Open Question Q2; default to the X close handling deck-exit, revisit if it regresses "return to URL entry".
- **Pinned header + footer tracker eat vertical budget** on short/landscape → D2 `<500px` collapse (single scroller, sticky footer, pinned close).
- **Navigational tracker adds interaction + a11y surface** → scoped: back-only jumps to done nodes, forward gated by `stepBlocked`, final Preview submit remains the real backstop.

## Migration Plan

UI-only, no data migration. Land behind the existing add-item flow; verify on the dev deployment (local `USE_PG_DRIVER=1`, seeded) at desktop + portrait-phone + 430px-landscape before sealing. Rollback = revert the change commit (no schema/tag coupling).

## Open Questions — RESOLVED during apply (owner decisions)

- **Q1 — Intro/overview card fate.** Kept, as a pre-step entry screen (not a tracker node): the tracker shows field steps only; the intro keeps its own "Change link" / "Let's go" footer pair with no tracker, and "Let's go" lands on the first incomplete field step.
- **Q2 — Exit from the first step.** The intro's "Change link" back affordance (→ URL entry) is retained; Back removal applies to the field cards only, where back-nav is the tracker.
- **Q3 — Reachability ahead of current.** Moot by construction: the tracker's current ring stays on the *frontier* (the working step — "the next step that isn't done") even while a done card is viewed via back-nav; `viewed` trails `frontier` and never passes it, so no done node ever sits ahead of current. Future nodes are always locked; forward tracker jumps (≤ frontier) lock while the viewed step is gated.
- **Q4 — `--deck-well-bg`.** No new global token: the well locally aliases `--card-accent-background-color` (#f7f3ff).
- **Naming (apply-time owner correction).** The mock's "eyebrow" is implemented as the shell-owned **module title** (`moduleTitle` prop, `.deck-screen-module-title`): it is static per flow ("Add an item" / "Edit item"), rendered once by `DeckShell` above the per-screen header, not per-screen text.
- **Preview accent row (apply-time owner decision).** The former lavender Triage-entry ActionRow blended into the lavender well; restyled as `variant="accent"`: the standard row rests on a `--buy-link-border` seam and lights up to a `--buy-link-bg` fill on hover (the buy-link family, since an action row is a buy affordance — no new color tokens), keeping the dark navy reserved for actions. Well padding normalized to an even 22px (the mock's tight 6px top served no purpose once the well is a distinct surface).
