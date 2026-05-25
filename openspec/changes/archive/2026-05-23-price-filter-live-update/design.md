## Context

[PriceFilterPopover.tsx](app/(main)/items/ui/components/PriceFilterPopover.tsx) currently uses an Apply-button gate to commit min/max edits to the URL. The component already has two pieces of subtle machinery worth preserving:

1. **External-URL-change handling** via `key={\`${min}|${max}\`}` on the inner panel (line 134): when something outside the popover changes `priceMin`/`priceMax` while the panel is open, the panel remounts with the new values rather than stomping in-progress edits via a sync effect.
2. **Commit-on-close** via `valuesRef` + `handleClose` (lines 107-116): outside-click / Escape / `usePopoverDismiss` triggers commit any divergent local state, so users who close without clicking Apply still get their changes.

The proposal removes the Apply button in favor of trailing-edge-debounced live commits, plus inline `max < min` validation. Both pieces of machinery above need to survive (with minor adjustment) — they solve real problems orthogonal to the commit-trigger choice.

The pattern to mirror lives at [ItemsToolbar.tsx:72-98](app/(main)/items/ui/components/ItemsToolbar.tsx): `SearchInputControl` holds local state, runs a 200ms `setTimeout` after each change, and calls `onCommit` when the timer fires. It's keyed on the external `q` value so external resets blow away local state cleanly.

The Done button shape to mirror lives at [StoreFilterPopover.tsx:92](app/(main)/items/ui/components/StoreFilterPopover.tsx): `<Button variant="primary" size="sm" onClick={() => setOpen(false)}>Done</Button>` — pure close affordance, no commit logic.

## Goals / Non-Goals

**Goals:**

- Make the price filter feel as instant as every other toolbar control, without per-keystroke commit thrash.
- Surface `max < min` as an inline field error (`<FieldError>` via the `error` prop on `<PriceField>`) rather than letting it through to the URL and producing an empty grid.
- Preserve the existing safety net behaviors (external-URL change handling, commit-on-dismiss).
- Match the visual structure of `StoreFilterPopover`'s footer (Clear + Done).

**Non-Goals:**

- No changes to `ItemsToolbar`'s callbacks, the URL contract (`price_min` / `price_max`), or the data fetch path.
- No new tokens or primitives. Reuse `<PriceField error="...">` and the existing `--field-error-color` plumbing per form-field-system.
- No changes to other filter popovers (Store). Their behavior remains as-is.
- No changes to debounce delay for the search field — the price debounce is decided independently here.
- No analytics or telemetry plumbing.

## Decisions

### Decision 1: Debounce delay = 400ms

**Choice:** 400ms trailing-edge debounce, restarted on every keystroke in either Min or Max.

**Rationale:** Long enough that fast typing of a multi-digit number (`19999` in ~600-800ms total) commits exactly once, not 5 times. Short enough that a deliberate edit feels live rather than laggy. The existing search field uses 200ms; price benefits from a longer window because (a) numbers grow quickly via single keystrokes producing meaningfully different intermediate filters (`≤$1` vs `≤$19`), and (b) the user often edits two fields in sequence rather than one.

**Alternatives considered:**

- 200ms (match search): too aggressive for the multi-keystroke "growing number" case — `≤$1` would commit if the user paused briefly while typing `≤$19999`.
- 600ms+: starts to feel sluggish; the "did anything happen?" moment grows uncomfortable.
- No debounce, commit on each keystroke: regressed the very behavior the Apply button was protecting against.

### Decision 2: Validation triggers on debounce fire, error clears live

**Choice:** The `max < min` check produces a *displayed error* only when the debounce timer fires on an inverted pair. The displayed error then clears live the moment the pair becomes valid (or either field becomes empty) — without waiting for another debounce. Re-breaking the pair after a live-clear restarts the gate: the error stays hidden until the next debounce fire on a fresh inversion.

**Implementation shape:** a small piece of state (`errorShown: boolean`) is set true by the debounce effect when it sees an inverted pair, and reset false by a live effect when the pair transitions back to valid. The displayed `<FieldError>` is gated on `errorShown && currentlyInverted` — the second clause keeps the visual in sync with the live state even between the keystroke that fixes the pair and the live effect that flips `errorShown`.

**Rationale:** Running the validation *display* only on debounce avoids per-keystroke error flicker during fast typing — `max=2|...` mid-way to `200` while Min=`100` shouldn't briefly show "must be ≥ Min" between keystrokes. But once the error is *visible*, the user is actively fixing it — at that point live evaluation is what they expect, and waiting another 400ms for the error to clear after the fix feels broken. The asymmetry is the whole point.

**Alternatives considered:**

- Validate per-keystroke always (display derived purely from `isInvertedPair`): flicker during normal typing — the very bug this design avoids.
- Validate only on debounce, never clear early: error lingers visually until next 400ms timer, feels stuck after fix.
- Validate on blur of the offending field: doesn't help in the popover where users frequently never blur (they hit Done or click outside).

### Decision 3: Suppress URL commit while invalid; preserve last valid state

**Choice:** When the debounce fires and the values are invalid, do not call `onApply`. The URL keeps whatever valid filter (or no filter) was in place. The active-filter chip below the toolbar reflects that unchanged URL state.

**Rationale:** Committing the inverted pair would double-punish the user — empty grid AND error message. Worse, it would clobber any previously-valid filter (e.g., a `$10–$50` filter the user is mid-editing). Holding the URL stable until the local pair is valid keeps the visible app state coherent.

**Alternatives considered:**

- Commit anyway and let the empty grid be its own feedback: redundant with the explicit error; worse for users who were narrowing an existing filter.
- Auto-swap min/max: surprises users who are mid-edit and have just typed the smaller bound first.

### Decision 4: Done button is purely a close affordance

**Choice:** The Done button replacing Apply has `onClick={() => setOpen(false)}` and nothing else. Commit happens via debounce or via the existing `usePopoverDismiss` path; Done just closes.

**Rationale:** Direct symmetry with `StoreFilterPopover` ([StoreFilterPopover.tsx:92](app/(main)/items/ui/components/StoreFilterPopover.tsx)) — same component shape, same mental model across filter popovers. Avoids the "Done means commit-and-close" ambiguity that would re-introduce the very gate this change removes.

**Alternatives considered:**

- Done flushes any pending debounce timer immediately, then closes: minor optimization for the rare case where a user clicks Done within the 400ms window after their last keystroke. Worth folding in if cheap (see Decision 5) but not architecturally required.
- Remove the footer entirely (just Clear inline at top): breaks visual symmetry with Store filter; users may not realize the popover is dismissable.

### Decision 5: Close-while-invalid discards local state silently

**Choice:** When the popover closes (Done, outside click, Escape) while local state is invalid (`max < min`), do not commit and do not surface any "your changes were discarded" message. The popover unmounts; the URL still reflects the last valid state (which may be empty). Reopening the popover starts fresh from the URL values.

**Rationale:** Since invalid state was never committed to the URL, "discarding" is just letting local state die with the unmounted panel — there is no "revert" because there was no rollback target. Surfacing a discard message would imply something was lost; nothing was. The error message already told the user the bound was invalid; that's the only feedback owed.

**Sub-decision (open question worth flagging — Decision 5b):** if the user clicks Done within 400ms of their last keystroke, should we flush the pending debounce immediately?

- **Pro:** more responsive — they don't see a 400ms grid update lag after closing.
- **Con:** adds a small piece of logic (track pending timer, flush on close), complicates the validation path (a "Done click while invalid" must still suppress).
- **Resolution:** **flush on close.** The current `valuesRef` + `handleClose` machinery already does conceptually the same thing (commit current local state on dismiss); the debounced version is just "commit current local state, validated, on dismiss." Net code: same shape, slightly different gate (validity instead of divergence).

### Decision 6: Error attaches to whichever input the user most recently edited to cause the inversion

**Choice:** The `<FieldError>` renders under exactly one of the two inputs — the one the user most recently edited to break validity — via the `error` prop on that field's `<PriceField>`. Copy flips to match the offending field:

- User just raised Min above Max → error under **Min**, copy "Min must be at most Max".
- User just lowered Max below Min → error under **Max**, copy "Max must be at least Min".

Implementation: track which input most recently received a change event in a `lastEdited: 'min' | 'max'` piece of state, updated in each input's `onChange` handler. When `isInvertedPair(localMin, localMax)` is true, the error is attached to whichever field `lastEdited` names; the other field's `error` prop stays undefined.

**Rationale:** The user's *intent* is whatever they just typed — pointing the error at the field they're actively editing reflects that intent and tells them what to fix without re-reading both bounds. Always pointing at Max would be wrong in the common "type max first, then min" flow (e.g., the user enters Max=$50, then types Min=$100 — at that moment Min is the field they're working in, and "Max must be at least Min" sends them back to a field they're done with).

The form-field-system pattern (each error sits with its field, no panel-level banners) is preserved — this just decides *which* field gets it for a constraint that spans both. No panel-level banner is introduced; no field gets a misleading error.

**Edge case — initial render with already-inverted props:** can't happen, because the "never commit invalid" rule means the URL can never carry an inverted pair into props in the first place. `lastEdited` defaults to `'max'` for the never-rendered safety case, but the predicate will be false on mount so it doesn't matter.

**Alternatives considered:**

- Always attach to Max (original proposal): wrong half the time — fails the "type max first, then min" flow.
- Always attach to Min: symmetric problem in the other direction.
- Error under both fields with the same copy: visually noisy, ambiguous about which to fix, and "Max must be at least Min" under the Min field reads as a non-sequitur.
- Error at panel top: a new pattern not currently used elsewhere; would conflict with form-field-system's per-field error ownership model.
- Track last-edit via input focus rather than change events: focus is a weaker signal — users can focus a field without editing it, and the keyboard tab flow would shift the error around without any real edit happening.

### Decision 7: Equal min/max is valid; only strict `max < min` is an error

**Choice:** `min === max` (e.g., `$20–$20` meaning "exactly $20") is a valid filter.

**Rationale:** Real users do this to find an item at a specific price point. Treating `===` as invalid would be a usability regression with no compensating benefit. Strict inversion (`max < min`) is the only impossible state.

## Risks / Trade-offs

- **[Risk] Slow typing fires an intermediate commit.** If the user types `1`, then waits >400ms before continuing with `9999`, the URL commits to `≤$1` first, briefly emptying the grid before re-committing to `≤$19999`. → **Mitigation:** accept this as an acceptable cost of going live — same trade-off the search field already makes. The popover doesn't close, so the user sees the error-free path forward immediately. If it proves disruptive in use, lengthening the debounce to 500-600ms is a one-line tweak.

- **[Risk] Inline error increases panel height by ~20px, possibly shifting Done position.** → **Mitigation:** the panel is positioned via CSS and not anchored to anything below it; layout shift is contained to the popover surface itself. Done button stays in the footer; the only thing that moves is the gap between the inputs and the footer.

- **[Risk] User clicks Done immediately after typing, expecting the commit to have already happened.** Without flush-on-close they'd see a 400ms grid-update lag after the popover closes. → **Mitigation:** Decision 5b — flush pending debounce on close (only if local state is valid; otherwise discard per Decision 5).

- **[Trade-off] Going live breaks symmetry with any future filter that genuinely needs an Apply button.** The codebase loses one example of "filter requires explicit commit." → **Mitigation:** acceptable — the price filter was the only such example, and no upcoming filters are known to require explicit commit. If one ever does, the existing `StoreFilterPopover` shape can be the model since it's already live-commit.

- **[Trade-off] The new capability `items-price-filter` is narrow (governs one popover).** It risks "spec sprawl." → **Mitigation:** acceptable for now — the alternative (lumping into `items-browser-chrome`) violates that capability's explicit exclusion of filter-bottom-sheet UX. If `items-store-filter` or `items-purchases-filter` later get spec'd, a parent `items-filter-controls` capability could be considered, but that's a future consolidation, not a blocker now.
