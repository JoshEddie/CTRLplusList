## Context

`ItemFormContainer` drives a six-state `Screen` union (`start | fetching | deck | preview | triage | failure`) with two orthogonal overlays checked ahead of it: `focus` (a `FocusEditor`) and `sheet` (Stores / Lists & quantity). Both manual paths currently set `screen = 'preview'`:

- `buildByHand` — `setViewModel(blankItem(pastedUrl))`, seeding the pasted URL into the store's Link field. Used only by `FetchFailure`.
- the URL-entry card's inline `onManual` arrow — `setViewModel(blankItem())`, no seed.

Preview is built to confirm a fetch. With nothing fetched it renders an empty card whose only route to the fields is the "Need to change something?" entry — an invitation to fix, not to fill.

Three facts from the current code shape every decision below:

1. **Focus editors write live.** `onNameChange={actions.setName}` mutates the view-model on keystroke. There is no staging buffer, so `FocusEditor`'s `blocked` prop gates *closing*, not *committing* — despite the comment claiming it stops error values reaching Preview.
2. **Tiers are value-derived, not attendance-derived.** Triage computes photo as `photos.length ? 'good' : 'warn'` and store as `isValidStore(store) ? 'good' : 'warn'`, inline. Neither has a tier function; `titleTier` / `priceTier` exist in `deck/utils.ts` and return a `TierResult { tier, note }`.
3. **The fetched path cannot reach Preview with an error.** `TitleCard` sets `continueDisabled={tier === 'error'}`, `PriceCard` sets `continueDisabled={tier !== 'good'}`, and `neededSteps()` surfaces those cards whenever the field isn't `good`. So Review's realistic non-`good` set is title `warn` (long name, "Keep it anyway"), photo `warn` (zero photos aren't gated), store `warn`. No errors.

## Goals / Non-Goals

**Goals:**

- Manual entry lands somewhere that reads as "fill these in", not "confirm what we found".
- The link card stays reachable from the manual path without closing the modal.
- No screen in the flow can trap the user.
- Preview remains the single save point, reached identically by every path.

**Non-Goals:**

- Whether a linkless store is legal, and whether the entry card keeps its manual affordance — both delegated to [#234](https://github.com/JoshEddie/CTRLplusList/issues/234). This change routes whichever manual paths exist and takes no position.
- Fixing the invisible price on manually-entered items (`isValidStore` requires `name && link && price`; every display surface filters through it). Accepted as shipped-broken until #234.
- Any change to the deck, the fetch path, the failure-screen treatment (#214's landed decision), the save path, or the DB.

## Decisions

### Review and Fill-manually are distinct shells, not one flagged component

They diverge on shell title, heading, sub-copy, back target, advance behavior, and visit tracking. Collapsing them behind an `entryPath` prop means five flags threaded through one component whose two callers no longer share a concept. CLAUDE.md's fragile-coupling rule says split; the `Button` / `LinkButton` trio is the in-repo precedent — separate components, shared styling helper.

The shared unit is the field **row** (label, value, provenance, tier status, activation), extracted from today's `TriageRow`. Both shells compose it; neither re-implements it.

*Rejected:* one `Triage` with an entry-path flag — the flags multiply exactly where the concepts diverge, and every future divergence adds a sixth.

### Preview stays the sole save point; Fill-manually is upstream of it

Fill-manually advances *into* Preview, which then behaves exactly as if the item arrived from a fetch. One save surface, one set of Preview entries, one gate.

*Rejected:* **Triage-as-hub** (manual saves from Triage) — duplicates the save action and its gating rules, and Preview's entries (stores, lists, note) would need re-hosting. *Rejected:* **both screens save** — two save paths to keep in sync.

### Auto-advance fires on: no `error` rows, and every `warn` row visited at least once

Tier-generic — the rule reads tiers, never field names. Consequence worth stating: if #234 later flips a missing store from `warn` to `error`, the rule blocks advance with no change here.

Evaluation happens when a focus editor or sheet **closes**, not on every view-model write. Those overlays render above the screen and are the only way row state changes, so overlay-close is the sole moment the predicate can newly become true. This is what keeps the advance from firing mid-keystroke.

*Rejected:* **advance on all-`good`** — it would never fire. A blank manual item's photo and store rows are `warn` with no value to supply (no image URL, no store link), so "everything good" is unreachable by design. *Rejected:* **a forward button enabled on all-`good`** — same dead end, plus a button. *Rejected:* **forward always pressable, tiers advisory** — lets an error-tier item reach Preview, which the title gate then blocks anyway; the error is better surfaced on the screen that shows all five rows.

### `warn` rows never flip to `good`; a visit gates advance only

A visited photo row still has no photo — marking it `good` would lie, and Preview's card must still show the gap. So visit state gates the advance predicate and touches nothing visual.

*Rejected:* **attendance flips `warn` → `good`** — mixes "has a value" and "you looked at it" into one tier, and the lie propagates to Preview.

### "Needs you" is removed; every non-`good` row states its issue

`TierResult.note` already carries the text ("An item needs a name.", "Add a price so people know the cost."). The row renders the note. Photo and store gain tier functions to match, retiring the inline ternaries — the tier helpers stay the single source, as `deck/utils.ts` already claims to be.

Applied to **both** shells, independent of visits: "No photo" is more truthful than "Needs you" whether or not you've looked, and it keeps the shared row dumb (tier + field → text) with no `visited` prop.

*Rejected:* **visit-dependent text** — needs a `visited` prop on the shared row plus a per-shell text mode, to say something less accurate.

### The Focus editors' `error`-tier Done gate is repealed

`item-decision-deck` §"Focus editors and the Stores and Lists & quantity sheets SHALL edit fields in place" binds Done to block at `error`. This change modifies that requirement rather than working around it.

The gate protects nothing: edits are live, so the error value is already in the view-model before Done is considered. It only prevents closing — which is the trap, since a blank manual item opens with title and price at `error`. The floor survives elsewhere: the advance rule blocks on any `error`, and Preview's Create/Save stays disabled at title-`error` per §"Preview SHALL be the universal create/edit surface". A >100-char name still cannot be saved; the gate moves rather than disappears.

*Rejected:* **keep the gate, add Cancel** — with live edits, Cancel would return to the shell leaving the bad value in place; honest cancel needs snapshot/revert state per field, new machinery for a problem that dissolves when the gate goes.

### The entry card does not seed a typed URL

`buildByHand` keeps seeding the pasted URL from the failure path; the entry-card path keeps calling `blankItem()` with no seed. Owner's call. `blankItem` / `emptyStore` are unchanged.

Note for #234: even the seeded failure path yields `emptyStore` with `name: ''`, and `isValidStore` needs `name && link && price` — so seeding alone never makes a manual item's price visible.

### Shell title is `Add an item`, stable across the manual flow

`shellTitle()` returns `'Review'` for triage today. The manual screen returns `Add an item` — the same title the entry card already shows — so the chrome beside the close X doesn't change under the user mid-flow, while the in-body `<h2>Add the details</h2>` carries the screen-level instruction. Flows through `form-shell-system`'s existing `title` prop; no delta there.

*Rejected:* **`Add the details` in both** — renders the same phrase twice, stacked.

### Exit buttons: primary on Review, secondary on Fill-manually

The two shells' exits mean different things, and the variants express it: Review's "← Back to preview" is the screen's forward action (done reviewing → primary); Fill-manually's "← Use a link instead" is a retreat off the path (secondary). Fill-manually auto-advances, so its exit is the only button on the screen either way — the variant carries the meaning, not the emphasis contest. Ghost was too invisible for either.

*Rejected:* **both primary** — promotes abandoning the manual path to the same rank as completing a review.

### The one optional field states "Optional", not a verdict

An empty note is the only field whose emptiness is fine by design. "Looks good" on absent content is a false verdict (on both shells — fetch never seeds descriptions either). The good tier keeps its confirmation marker; the status text reads "Optional" when the note is empty, "Looks good" when a within-cap note exists. Mechanically: `rowTiers` may attach a note to a `good` tier, and the row renders `note || 'Looks good'` — no new tier, no fourth visual state.

### The Preview triage-entry sub drops "we"

"Fix anything we got wrong" claims system authorship. Preview is reached by three routes — fetch (system-authored), manual (user-typed), edit (user's saved item) — and "we" is accurate for one. New copy: "Fix anything that looks wrong", one string for all routes.

*Rejected:* **path-aware copy** — Preview stays path-agnostic by design; threading entry path in is the coupling this change exists to avoid, for marginal copy gain.

### The draft-discard prompt fires at re-entry, not at exit

"← Use a link instead" does not destroy anything — the view-model survives the hop to the URL entry state; the discard happens when a manual affordance re-seeds `blankItem()`. The guard therefore lives at the discard moment: re-entering manual with an in-progress draft prompts keep-or-start-over via `confirm-dialog-system` ("Start over" maps to the primitive's danger Confirm, "Keep filling" to Cancel — no primitive delta). *Dirty* means user-entered work only — name, description, photos, store name/price; a failure-path seeded link and the `qty: 1` default do not count.

The failure-path prompt never merges: keep = the typed draft unchanged, start over = `blankItem(pastedUrl)`. A **successful** fetch still replaces a dirty draft silently — fetching is an explicit "replace with fetched data" action; revisiting that courtesy belongs to the drafts chain.

This is the in-session twin of #210's resume UX. It guards local state within one modal session only; the `item_drafts` chain owns durability and cross-session resume and may amend or replace this prompt.

*Rejected:* **confirm on the back action** — it would warn about a loss that isn't happening at that moment. *Rejected:* **silently preserving the draft on re-entry** — resurrects stale content with no user signal, and contradicts the abandoned-paste no-carry-over principle without the user choosing.

### Field rows get the card hover treatment

Rows showed only `cursor: pointer`. They adopt the Preview action rows' existing hover (`--card-border-hover-color` / `--card-hover-background-color`) — same tokens, one new CSS rule, no new values.

## Risks / Trade-offs

- **Auto-advance can surprise.** Closing the last `warn` row's editor jumps the user to Preview unbidden. → It only fires once nothing is left to do, and Preview's "Need to change something?" entry routes straight back. Evaluating on overlay-close (not on write) keeps it from firing mid-edit.
- **The minimum manual path is four stops** — type title, type price, visit photo, visit store — before advance fires. A user who wants neither a photo nor a store must still open both rows to prove it. → Accepted: it is the cost of gating on attendance without lying about tiers, and it is bounded (a visit is one tap and a Done).
- **Manually-entered items ship with invisible prices.** `isValidStore` drops linkless stores from every display surface. → Accepted and delegated to #234; this change makes the state reachable by design rather than by accident, which is precisely why the question was pushed there.
- **#234 may reverse the entry-card door.** If it lands link-required, the entry-card manual affordance goes and Fill-manually loses one of its two callers. → Cheap: the failure path still needs the screen, and the advance rule is tier-generic, so a `warn → error` store flip needs no rework.
- **Two shells can drift.** Review and Fill-manually could grow inconsistent row behavior. → The shared row subcomponent owns everything they genuinely share; what differs is what the split exists to express.

## Open Questions

None blocking. The two open items — linkless-store legality and the entry-card affordance — are tracked on #234 and do not gate this change.
