## 1. Tier helpers (foundation — every surface below reads these)

- [x] 1.1 Add pure `photoTier(photos)` to `deck/utils.ts` returning a `TierResult`: empty → `warn` with a note stating the item has no photo; otherwise → `good`.
- [x] 1.2 Add pure `storeTier(store)` to `deck/utils.ts` returning a `TierResult` reproducing today's `isValidStore(store) ? 'good' : 'warn'` classification, with a note stating the store's issue. Do NOT change `isValidStore` itself or its callers — linkless-store validity is #234's question.
- [x] 1.3 Review the notes on `titleTier` and `priceTier` for use as row-facing status text (they are currently written as editor guidance, e.g. "Add a price so people know the cost."); adjust wording only where a note does not read as a row status.
- [x] 1.4 Unit-test all four tier helpers' tier + note for empty, invalid, warn-boundary, and good inputs.

## 2. Shared field row

- [x] 2.1 Extract the row unit from `deck/Triage.tsx` (`TriageRow`) into a subcomponent both shells compose — label, value, provenance, tier status, activation.
- [x] 2.2 Replace the generic "Needs you" status with the field's tier note; keep "Looks good" for `good`. Row takes tier + note, has no `visited` prop and no per-shell mode.
- [x] 2.3 Confirm warn styling is unchanged (same icon, same colour). No fourth visual state.

## 3. Fill-manually shell

- [x] 3.1 Create the Fill-manually shell composing the shared row for photo, item name, note, price, store — reading tiers from the helpers, never inline.
- [x] 3.2 Render heading `Add the details` and supporting line `Tap a field to fill it in.`
- [x] 3.3 Wire row activation to the Focus editors, and the store row to the Stores sheet.
- [x] 3.4 Add the back action returning to the URL entry state (`returnToUrl`). It must not render on the Review shell.
- [x] 3.5 Track visited rows (a row counts as visited once its Focus editor or the Stores sheet has opened and closed). Visit state gates the advance predicate only — it must not reach the row's tier or rendering.
- [x] 3.6 Implement the advance predicate: no row in `error` **and** every `warn` row visited. Express it over tiers only — no field-specific branches. Evaluate it when a Focus editor or sheet closes, not on each view-model write, so it cannot fire mid-edit.

## 4. Review shell

- [x] 4.1 Reduce `deck/Triage.tsx` to the Review shell composing the shared row; keep its `Review` / `Review anything` / `Tap a field to fix it.` copy and its `← Back to preview` exit.
- [x] 4.2 Confirm the Review shell never auto-advances and carries no visit tracking.
- [x] 4.3 Check both shells and the extracted row against the file-size bands (`deck/Triage.tsx` is currently ~115 lines; the split should keep every file green).

## 5. Focus editor gate removal

- [x] 5.1 Remove `blocked` and the `disabled` prop on "Done" in `deck/FocusEditor.tsx`; Done is always enabled.
- [x] 5.2 Remove the comment at the top of `FocusEditor.tsx` claiming the gate stops error-tier values reaching Preview — it describes behavior that never held (edits are live) and is being repealed.
- [x] 5.3 Verify the floor still holds: Preview's Create/Save stays disabled at title-`error`, and the Fill-manually shell will not advance while any row is `error`.

## 6. Container wiring

- [x] 6.1 Add the manual screen to the `Screen` union in `ItemFormContainer.tsx` and render the new shell for it.
- [x] 6.2 Point `buildByHand` at the manual screen, keeping its `blankItem(pastedUrl)` seeding unchanged.
- [x] 6.3 Point the URL-entry card's `onManual` at the manual screen, keeping `blankItem()` (no seed). Extract the inline arrow into a named handler beside `buildByHand`.
- [x] 6.4 Update `shellTitle()` — the manual screen returns `Add an item`; the triage screen keeps `Review`.
- [x] 6.5 Wire the advance from the manual screen to `preview`, and confirm Preview renders identically to the fetched arrival (same entries, same Create action).

## 7. Spec bookkeeping

- [x] 7.1 Update the `item-decision-deck` Purpose (`openspec/specs/item-decision-deck/spec.md`), which still calls Preview "the universal create, edit, and manual-entry surface" — manual entry now enters through the Fill-manually shell. This is a stale Purpose, not a TBD stub, so `/finalize-spec-purposes` will not catch it.

## 8. Tests

- [x] 8.1 `deck/__tests__/Triage.test.tsx` — Review shell: rows state their issue rather than "Needs you"; `good` rows still confirm; no auto-advance.
- [x] 8.2 New tests for the Fill-manually shell: copy renders; back returns to URL entry; an unvisited `warn` row holds the shell; an `error` row holds the shell; a visited `warn` row stays `warn`; advance fires when no row is `error` and every `warn` row is visited.
- [x] 8.3 `__tests__/ItemFormContainer.test.tsx` — both manual paths land on the manual screen (not Preview); failure path seeds the pasted URL; entry-card path seeds nothing; shell title is `Add an item`.
- [x] 8.4 Failure-screen "Fill in details manually →" routing: `deck/__tests__/FetchFailure.test.tsx` asserts the affordance fires `onManual` (presentational contract); `__tests__/ItemFormContainer.test.tsx` (`ManualEntry_OpensFillManuallyWithUrlSeededInStoreLink`) asserts it lands on the manual screen with the pasted URL seeded.
- [x] 8.5 Focus editor: "Done" is enabled with the field in `error` tier and returns to the originating shell.
- [x] 8.6 Check every new test against `TESTING.md` — assert observable behavior, `<StateUnderTest>_<ExpectedBehavior>` naming, no execute-for-coverage, no tautologies.

## 10. Folded polish (from explore, owner-blessed)

- [x] 10.1 Exit variants: Review shell "← Back to preview" → `primary`; Fill-manually "← Use a link instead" → `secondary`.
- [x] 10.2 Empty note row: `rowTiers` attaches "Optional" as the good-tier note for an empty description; the shared row renders a good tier's note when present, else "Looks good". Update row/shell tests.
- [x] 10.3 Preview triage-entry sub: "Fix anything we got wrong" → "Fix anything that looks wrong". Update any test pinning the old string.
- [x] 10.4 `.deck-triage-row:hover` — border/background on `--card-border-hover-color` / `--card-hover-background-color`, mirroring `.deck-actrow:hover`.

## 11. Draft-discard guard (folded from explore, owner-blessed)

- [x] 11.1 Pure `isDirtyDraft(vm)` in `deck/utils.ts` — true when user-entered work exists (name, description, photos, store name/price); seeded link and `qty: 1` default excluded. Unit tests: pristine blank, failure-seeded blank (link only), each dirtying field.
- [x] 11.2 Both manual affordances route through a guard in `ItemFormContainer`: pristine → today's behavior unchanged; dirty → open `ConfirmDialog` (keep = enter manual with values and visit state intact; start over = today's re-seed for that path).
- [x] 11.3 Dialog copy: title/message stating a draft is in progress; "Start over" as danger Confirm, "Keep filling" as Cancel (primitive contract, no variant overrides).
- [x] 11.4 Container tests: no prompt when pristine (both paths); prompt when dirty; keep restores values + visit state; start over blanks (entry path) / seeds URL (failure path); fetch success still replaces silently.
- [x] 11.5 Comment on #210 (owner-approved text) recording the interim guard and #210's right to amend or replace it.

## 9. Pre-merge (re-verify after section 11)

- [x] 9.1 `npm run lint` — zero errors, zero non-size warnings.
- [x] 9.2 `npx tsc --noEmit` — zero errors.
- [x] 9.3 `npm run build` — completes successfully.
- [x] 9.4 `npm run test:coverage` — zero failing tests.
- [x] 9.5 `npm run test:e2e` — zero failing tests.
- [x] 9.6 `openspec validate manual-entry-fill-screen --strict` — passes.
