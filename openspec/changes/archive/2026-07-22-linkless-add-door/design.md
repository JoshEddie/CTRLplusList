# Design: linkless-add-door

## Context

The add flow is link-first: `ItemFormContainer` opens at `screen='start'` (`UrlEntryStep`), a fetch seeds the view model, and the deck opens on its intro card. Manual entry exists only off the fetch-failure screen (`FillManually`, link-seeded, FULL-only). #256 landed the tier groundwork: `storeTier` treats an all-empty store as `good` ("Optional") and `pricePairTier` treats an empty price as `good` when linkless — a linkless item already passes every deck gate; nothing blocks it. What's missing is a way in, and a way to keep linkless items from being offered store/link entry later.

Edit-time surfaces are the Preview hub (Store `ActionRow` → grouped Store focus editor) and Triage (per-row jump list over `RowField`s, which include `store`). The deck proper is only entered on the fetch path today.

## Goals / Non-Goals

**Goals:**

- A quiet secondary affordance on the URL entry step that enters the standard deck with a blank item — no intro card, no store step, nothing pre-marked good.
- Derived edit-time linkless lock: an item with no link never sees a store name/link affordance (deck step, Preview row, Triage row).
- Delete the dead image-search cluster.

**Non-Goals:**

- No category pick, no stock-image seeding (idea #280). No `kind` anywhere.
- No schema change, no `item-image-candidates` contract change.
- No StoreEditor link-field removal for linked items and no re-fetch design (#266).
- Fetch-failure manual path untouched (failure-only, link-seeded, FULL-only).

## Decisions

### Door routing: straight to `screen='deck'` with `blankItem()`

`UrlEntryStep` gains an `onLinkless` callback; the container seeds `blankItem()` (no URL) and sets `screen='deck'`. No new screen state — the door reuses the deck screen the fetch path uses, so tracker, cards, and completion routing are shared by construction. `pastedUrl` stays `''`; `PriceCard`'s source-link affordance must tolerate an empty `productUrl` (render nothing rather than a dead link).

Alternative rejected: a distinct `screen='door'` or a parallel flow — the map forbids a parallel flow, and the deck already supports this entry shape.

Amendment (found at apply): a zero-real-photo strip now pre-selects its first placeholder thumb (`usePlaceholderPreviews`) so the stage never renders an empty frame; this applies to every zero-photo deck, fetch-zero included, not just the door. Card copy (photo/title/price subtitles, the inline note helper) branches on `isLinkless` so fetch-framed language ("no image came through", "scraped names", "no skipping the price") never shows on the door path.

### Intro skip: a `showIntro` prop on `Deck`

`Deck` keeps its internal intro state but takes an initial-visibility prop (fetch path passes true / omits; door passes false). The intro summarizes "what was pulled" — with nothing fetched it has nothing to say. Consequence: the door deck has no back-to-URL-entry affordance mid-deck; neither does the fetch path once past the intro. Modal close is the exit, matching existing deck behavior. The draft-discard prompt is a manual-shell concern (`manualDraftLive`) and does not apply.

### Store-step membership: link-derived in `neededSteps()`

`neededSteps()` includes the `store` step only when `item.store.link` is non-empty at deck entry. Membership stays frozen at entry (existing invariant). The fetch path always has a link → store step included, unchanged; the door never has one → photo/title/price(/note). `stepBlocked`/`isStepValid` are unchanged — tier-only gating holds. One amendment to `isStepComplete` (found at apply): an empty price is never pre-marked done even though the linkless tier reads `good` — otherwise the door deck would order price ahead as complete and the user would never land on the price card, defeating the PRICED exit. The spec's "nothing pre-marked done" scenario requires it; this mirrors the photo/note "always needs a human look" pattern rather than a per-field gate.

Alternative rejected: keeping the store step rendered-as-done ("Optional") — the map settled "no store step/fields at all".

### Edit-time lock: one derived predicate, `store.link === ''`

A single helper (e.g. `isLinkless(vm)`, co-located with the tier helpers in `deck/utils.ts`) gates every store-entry affordance:

- **Preview**: the Store `ActionRow` is not rendered for linkless items (price remains editable via Triage's price row).
- **Triage**: the `store` row is omitted for linkless items.
- **Deck**: covered by membership above.

Derived from state, zero schema: legacy PRICED rows (empty name/link) and door-created items get the same treatment for free. `storeTier`/`manualAdvanceReady` are untouched — an all-empty store is already `good`, so hiding the rows changes no gating math.

Alternative rejected: `linkless` column — persists a derivable fact and violates the map's no-schema-change constraint.

### Dead-cluster deletion is total, with spec deltas

`ImageSearch.tsx`, `ImageResultsViewer.tsx`, `image-search.css`, both test files, `app/api/image-search/route.ts`, `ImageSearchResult` in `lib/types.ts`, the LOCALDEV `/api/image-search` section, the CLAUDE.md pointer text, and the stale image-search comment in `app/api/product-fetch/route.ts`. Zero live importers verified at embark.

Three main specs mandate the cluster, so deletion carries deltas: `list-item-management` explicitly retains `ImageSearch.tsx` "with its tests passing" (REMOVED, plus dropping the `Modal` requirement's pattern reference); `server-endpoint-authorization`'s metered-provider requirements name `app/api/image-search/route.ts` as their current instance (MODIFIED — re-anchored to Zyte via `app/api/product-fetch/route.ts`, whose gating `product-link-prefill` already specs); `testing-foundation` lists it as a known mock boundary (MODIFIED — boundary swapped to the product-fetch upstream). `form-field-system` has one migration-era scenario naming the image-search modal search; it becomes vacuous, not contradicted, and is left alone.

## Risks / Trade-offs

- [Door deck has no in-flow back to URL entry] → Accepted; parity with the fetch path past the intro, and the modal close is always available. Revisit only on real user friction.
- [Linkless PRICED item's price becomes reachable only via Triage on Preview] → Already true for all items (price has no direct Preview row); no regression.
- [`PriceCard` copy assumes a source page exists] → Explicit task: empty-`productUrl` rendering verified in the door path.
- [Deleting `/api/image-search` breaks an out-of-tree caller] → None exist in-repo; route was UI-internal. Accepted.
- [Re-anchoring server-endpoint-authorization scenarios to product-fetch overlaps `product-link-prefill`'s gating requirement] → Accepted: one capability owns the generic metered-provider policy with its current instance, the other the endpoint's own contract; content kept consistent, not duplicated verbatim.

## Open Questions

None — grilling settled linkless-lock derivation, #266 boundary, deletion scope, and the no-seeding shape (MAP #233 amended; idea #280 opened).
