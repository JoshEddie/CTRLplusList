## Why

Manual entry lands on a blank Preview. Preview is built to answer "here's what we fetched — confirm it", so with nothing fetched it presents an empty card and no cue that the "Need to change something?" entry is the way to fill fields in. Both manual paths reach it: the URL-entry card's "Fill in details manually →" and the failure screen's link (issue #247).

Once there, Triage's only exit is "← Back to preview" — after manual entry there is no route back to the link card without closing the modal. And the Focus editors trap the user: they edit **live** into the view-model (no staging buffer), yet `item-decision-deck` §"Focus editors and the Stores and Lists & quantity sheets SHALL edit fields in place" binds "Done" to block at `error` tier. A blank manual item starts with title and price at `error`, so opening either row offers no way out — Done is dead and there is no cancel. That gate cannot protect Preview from an error value (the value is already committed on keystroke); it only prevents *closing*.

Inherited constraints found by grepping active specs:

- `product-link-prefill` §"The create-item modal SHALL open in a URL-first entry state" binds the entry card's manual affordance and specifies "the empty item form SHALL render immediately and a '← Use a link instead' affordance SHALL return to the URL entry state" — an affordance that **has never existed in code**. This change reconciles that clause rather than reinventing it.
- `product-link-prefill` §"A failed or timed-out fetch SHALL fall through to the kind-aware failure screen" binds manual entry from failure to "open the blank Preview with the pasted URL seeded".
- `item-decision-deck` §"Preview SHALL be the universal create/edit surface" names Preview the entry surface for "the fetch (after the deck), manual, and edit paths".
- `item-decision-deck` §"Triage SHALL let the user review and jump to every field" binds non-`good` rows as "marked as needing the user".
- `form-shell-system` binds `FormShell` to render its `title` prop; the shell-title change flows through that existing prop — no delta.
- `button-system` owns the `link` and `ghost` variants the exits use; both are used as-is within their existing contracts — no delta, no new primitive family (spec home settled by #214).

## What Changes

- Manual entry routes to a new **Fill-manually** screen instead of a blank Preview — both from the URL-entry card and from the failure screen.
- Preview stays the **sole save point**. Fill-manually advances into Preview, which then behaves exactly as if the item had arrived from a fetch.
- **Review** (today's Triage) and **Fill-manually** become distinct shells sharing the field-row subcomponent, rather than one component behind an entry-path flag. They diverge on shell title, heading, back target, advance behavior, and visit tracking — five flags avoided, per CLAUDE.md's fragile-coupling rule and the `Button`/`LinkButton` precedent.
- Fill-manually's back action returns to the **link-fetch card**; Review keeps "← Back to preview". This satisfies `product-link-prefill`'s never-implemented "← Use a link instead" clause.
- Fill-manually **auto-advances** to Preview when no row is `error` tier **and** every `warn` row has been visited at least once. Review never auto-advances. The rule is tier-generic — no field-specific special-casing.
- `warn` rows never flip to `good`; a visit gates advance only, never appearance.
- **BREAKING (spec)** — "Needs you" is removed. Every non-`good` row states its actual issue, on **both** shells, independent of visits, sourced from `TierResult.note`. Photo and store gain tier functions; they have none today (Triage derives their tiers inline).
- **BREAKING (spec)** — the Focus editors' `error`-tier "Done" gate is repealed; Done is always enabled. The floor holds elsewhere: Preview's Create/Save stays disabled at title-`error`, and the advance rule blocks on any `error`.
- Polish folded from post-implementation exploration (all on surfaces this change created or reshaped): shell exits gain weight (Review `primary`, Fill-manually `secondary` — previously ghost); the empty note row reads "Optional" under the good marker instead of a false "Looks good"; the Preview triage-entry sub becomes "Fix anything that looks wrong" (drops "we" — accurate for one of Preview's three routes); field rows get the existing card hover treatment.
- Draft-discard guard: re-entering manual entry with an in-progress draft prompts keep-or-start-over (`confirm-dialog-system`) instead of silently re-blanking — in-session state only; durable drafts remain #210's territory, which may amend this.

Out of scope, delegated to [#234](https://github.com/JoshEddie/CTRLplusList/issues/234) (map [#233](https://github.com/JoshEddie/CTRLplusList/issues/233)): whether a linkless store is legal, and whether the entry card keeps its manual affordance at all. This change takes no position and routes whichever manual paths exist into Fill-manually. Consequence accepted: `isValidStore` requires `name && link && price` and every display surface filters through it, so a manually-entered item's price stays invisible on its card until #234 resolves it.

## Capabilities

### New Capabilities

None. The Fill-manually screen is a new surface within the flow `item-decision-deck` already governs.

### Modified Capabilities

- `item-decision-deck`: adds the Fill-manually shell (copy, back target, tier-generic auto-advance, visit tracking); narrows Preview to the fetch and edit paths; replaces "needs you" row marking with issue-stating text on both shells; repeals the Focus editors' `error`-tier Done gate; updates the Purpose, which still calls Preview the "manual-entry surface".
- `product-link-prefill`: both manual-entry routes target Fill-manually rather than a blank Preview; the failure path keeps seeding the pasted URL; the "← Use a link instead" clause is reconciled to Fill-manually's back action.

## Impact

Code — `app/(main)/items/ui/components/itemform/`:

- `ItemFormContainer.tsx` — `Screen` union gains the manual screen; `shellTitle()` (returns `'Review'` for triage today); `buildByHand`; the inline `onManual` arrow; the triage case.
- `deck/Triage.tsx` — splits into the Review shell plus a shared field-row subcomponent.
- `deck/FocusEditor.tsx` — drop `blocked` and the now-inaccurate comment claiming it stops error values reaching Preview.
- `deck/utils.ts` — new photo and store tier functions alongside `titleTier` / `priceTier`; `TierResult.note` becomes row-facing copy.
- `deck/deck.css` — styles for the new shell; no new visual tier state (warn styling is unchanged).

Untouched: `deck/viewModel.ts` seeding (`blankItem` / `emptyStore` unchanged, per the no-seeding-from-entry-card decision), `FetchFailure.tsx` and `UrlEntryStep.tsx` treatments (owned by #214's landed decision), the save path, the DB, and every server-side read — this change adds no server read and consumes no cache tag.

Tests — `deck/__tests__/Triage.test.tsx`, `__tests__/ItemFormContainer.test.tsx`, `deck/__tests__/FetchFailure.test.tsx`.
