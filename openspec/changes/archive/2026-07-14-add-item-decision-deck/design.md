## Context

The post-fetch experience today is `ItemFormContainer` → `ItemForm`: a `url → fetching → form` phase machine where both success and failure land on one dense form (`app/(main)/items/ui/components/itemform/`). The Decision Deck reshapes the post-fetch step into a guided card flow and promotes a faithful **Preview** to the single create/edit surface for all three entry paths (fetch, manual, edit) — the answer to the scope question was **universal editor**.

The source mockup (`Add Item — Decision Deck.html`, React-in-Babel prototype) is a standalone "Ctrl+List" artifact with its own indigo palette, brand chrome, raw `<button class="btn">` elements, and several sub-44px targets. Per the bundle README we recreate the **visual intent and flow**, not the prototype's structure or palette. The real build sits on the app's `FormShell`, `Button`/`LinkButton`, `FormField`/`TextField`, `segmented-control-system`, `loading-indicator-system`, and `global.css` tokens.

Binding active specs in this region: `product-link-prefill` (URL entry, fetching, fetch outcomes), `item-store-links` (store validity + provenance), `button-system` (fixed variant set, 44px floor), `form-field-system`, `form-shell-system`, `loading-indicator-system`, `segmented-control-system`, `list-item-management` (quantity_limit semantics on claim), `testing-foundation` (test substance + `test/helpers/contrast.ts`).

## Goals / Non-Goals

**Goals:**
- A stepped deck after a successful fetch that surfaces only fields needing a human, confirms the rest, and never offers a global skip.
- A Preview that renders the item exactly as it appears on a list, and serves as the create/edit hub (Triage, Focus editors, Stores/Lists sheets) for fetch, manual, and edit.
- Bake in the corrections: title tiers (50 warn / 100 error), inline note-on-long-title, description max + always-full display, price required with a source-page link, quantity default 1 surfaced in subtext, "Need to change something?" lavender entry.
- All controls meet the 44px floor and AA contrast, asserted by tests; thorough unit tests + a Zyte-stubbed e2e.

**Non-Goals:**
- No change to `/api/product-fetch`, the Zyte fetch seam, or rate-limiting (`product-link-prefill` API requirements stand — note the tiered waterfall was retired by `item-image-candidates`; fetch is Zyte-only).
- No DB schema migration beyond a `description` length constraint at the validation layer (the column is already `text`; `quantity_limit` already defaults to 1).
- No copying of the mockup's brand mark or bespoke spinner. (The palette is the exception — D9 records a deliberate app-wide shift of the brand tokens and primitive treatments toward the mock.)
- Not redesigning the items library, item card display, or list views beyond making description render in full.

## Decisions

### D1 — Universal Preview-centered editor; retire `ItemForm`
`ItemFormContainer` becomes the screen orchestrator mirroring the mockup's `App`: `screen ∈ {start, fetching, deck, preview, triage, timeout}` plus an overlay layer (`sheet ∈ {stores, lists}`, `focus ∈ field-id`). State is a single `item` view-model (`{ name, photos[], photoIndex, description, stores[], lists[], qty }`) held in the container and mutated via `setItem`. `start`/`fetching` reuse the current URL-entry/fetching behavior (reskinned); `deck` runs only for fetch-success; `preview` is the hub for all paths (manual → blank preview, edit → preview seeded from the item). `ItemForm.tsx` is retired; its still-needed pieces (image-candidate pool, undersized-image pruning from `ImageUrlInput`/`ImageCandidateGrid`) move into the Photo editor.
- *Alternative (rejected): keep `ItemForm` for manual/edit and only insert the deck for fetch.* The user's corrections (qty subtext, "Need to change something?") target the Preview, and the chosen scope is universal — two parallel editors would duplicate stores/lists/quantity/image logic and the tests for it. Rejected for duplication and to honor the scope decision.
- *Alternative (rejected): deck-only, then hand off to `ItemForm`.* Drops the Preview/Triage screens the corrections depend on.

### D2 — View-model ↔ persistence mapping at the submit boundary
The deck/preview operate on the ergonomic view-model; the create/edit actions keep their existing `ItemDetails` shape. A single adapter maps at submit: `photos[photoIndex]` → active image + `photos` → `image_candidates`; `qty` → `quantity_limit` (number|null); `stores[]` → store rows (preserving `price_fetched_at`/`canonical_url`/`currency` provenance per `item-store-links`); `description` passthrough. This keeps `lib/data/item.actions.ts`, `item.associations.ts`, and the `items` cache tag untouched — the change is presentation + validation only.
- *Alternative (rejected): refactor the actions to accept the view-model.* Larger blast radius into the tested data layer for no functional gain.

### D3 — Deck step selection (`neededSteps`) keeps the smart filter; global skip removed
`neededSteps(item)` is computed in this order:
- `intro` — always.
- `photo` — when `photos.length === 0` (empty/error state) **or** `photos.length > 1` (a real choice to make). Skipped when exactly one image was returned (auto-selected — nothing to choose). See **D13**.
- `title` — only when the title tier ≠ good.
- `price` — only when the price tier ≠ good.
- `note` — only when the title tier **is** good. When the title is long, the note editor is surfaced **inline on the title card** (D5), so a separate note card would be a duplicate; it is omitted (the description still always shows on Preview).

Green title/price get **no** card but are listed as confirmed (✓) on the intro summary. The intro's **"Skip — straight to preview"** link is deleted (correction #1): the only forward affordance is "Let's go", so validated fields are surfaced-and-confirmed, never bypassed. `back` from the first card closes; `next` from the last opens Preview. Progress dots reflect `steps.length`.
- *Alternative (rejected): a confirmation card for every field even when green.* More taps, undercuts the "only what needs you" value; the user chose "remove global skip only".
- *Alternative (rejected): always show both the inline note (on long title) and the standalone note card.* Duplicate editor for the same field; the user asked that a surfaced note not reappear later (it still appears on Preview).

### D4 — Validation tiers as pure helpers (single source for deck, focus, triage, preview, submit)
`titleTier(name)` and `priceTier(store)` are pure functions returning `{ tier: 'good'|'warn'|'error', … }`, plus `suggestTrim(name)`:
- Title: empty → error ("An item needs a name"); `> 100` → error ("…over the 100 limit, can't be saved — trim it"); `> 50` → **warn** ("Longer than 50 characters — we suggest trimming; extra detail belongs in a description"); else good. `TITLE_SNAPPY` moves 60 → **50** (correction #2).
- Price: empty → **blocking** for the price card and for Create (correction #4) — see D6. Non-empty numeric → good.
These mirror the DB/schema limits (name 3–100 in `item.schema.ts`). The deck's "Looks good"/"Keep it anyway" CTA and the Create button derive their disabled state from these helpers, so the rules live in exactly one place.

### D5 — Long-title → inline note (shown once) + name/description caps sized to the card height budget
When `titleTier ≠ good`, the title card renders the **note editor inline** beneath the name (correction #3) with copy steering size/color/variant out of the title. When the note is surfaced inline, the standalone `note` card is **omitted** (D3) — the same field is never asked for twice; it still appears on Preview. When the title is good (no title card), the standalone note card is shown instead.

Both fields are capped so the description **always renders in full** — no clamp/ellipsis — in `PreviewCard` and on the real item display, without blowing up card height in the items grid (today the description clamps to ~2 lines). **`name` max = 100, `DESCRIPTION_MAX` = 100** (both enforced in `item.schema.ts`, surfaced as live counters; the title warn tier stays at 50). 100 description chars fit the existing ~2-line budget, so removing the clamp does not stretch a card.

Card-height trade-off (recorded so it isn't re-discovered): item cards in a grid stretch to the tallest neighbour, so a long title + long description next to a short item leaves dead whitespace. The two caps share one height budget — if the description cap is ever raised, the **title cap must drop** to compensate. They are tuned together, not independently.
- *Alternative (rejected): 200-char description.* Too tall for the ~2-line clamp budget; pushes neighbour cards into dead whitespace.
- *Alternative (rejected): pointer line only.* User leaned toward surfacing; inline keeps the long-title user moving detail immediately.

### D6 — Price required; source-page link; no silent `$0.00`
The price card's **"Skip" link is removed**. The card's primary CTA is disabled until `priceTier` is good. A small `link`-variant affordance ("Couldn't pull the price — open the product page ↗") opens the pasted/store URL in a new tab so the user can read the price manually. This aligns with `item-store-links`' all-or-nothing rule (a store with name+link already requires a price), so empty price can no longer slip through to a `$0.00` store row. The price step is only in `neededSteps` when no price was fetched; when present-and-numeric it's confirmed on the intro.
- *Note:* the manual/edit paths reach price via the Stores sheet, which keeps the same numeric-required validity at submit.

### D7 — Quantity default 1, surfaced in subtext
The item view-model initializes `qty = 1` (limit of 1), matching the DB column default. The Lists & quantity sheet uses the `segmented-control-system` for Unlimited/Limit and a ≥44px stepper for the count. The Preview's "Lists & quantity" action-row subtext includes quantity (e.g. "Not on a list · Qty 1", "Birthday · Unlimited") — correction #5.

### D8 — "Need to change something?" replaces "Something's off"
The Preview's triage entry becomes a lavender (`--lav-bg`-equivalent, mapped to an existing token) action row labeled **"Need to change something?"** / "Fix anything we got wrong", with an edit/pencil icon — not the warn-yellow flag (correction #6). Triage itself ("review every field", green = glance, others = needs you) is retained; its per-row tier still drives the status pill.

### D9 — Deck fidelity required an app-wide visual refresh of shared primitives (original assumption corrected)
The original plan assumed the mockup's styling would map cleanly onto existing primitives **without modifying them**: `btn primary → <Button variant="primary">`, `btn ghost → ghost`, `btn soft → secondary`, `btn link → variant="link"`; composite tappable surfaces (`actbtn`, `triage-row`, `list-opt`, `thumb`, `photo-nav`, `stepper`, `store-rm`, `icon-btn`) as page-scoped accessible `<button>`s at the 44px floor with `:focus-visible` rings; and deck-only new tokens for tier washes / lavender.

That assumption did not hold. Reaching visual fidelity to the Claude deck mock required restyling the **existing** primitive treatments themselves — the `primary` button (outlined → filled gradient), the `form-shell` modal chrome (centered, borderless header), the segmented-control active fill, and the `global.css` brand tokens (`--primary-color-dark`, page-frame gradient, `--heading-text-color`). These were applied at the shared layer by **deliberate choice** — one app-wide refresh rather than a deck-local fork — so the new look reaches every consumer. Recorded as an intentional scope expansion; disclosed in the proposal's "Modified app-wide for visual fidelity" section.
- *Still honored:* the fixed variant **set** is unchanged — no `soft`/`warnbtn` variant was added; the restyle changes existing variants' look, not the roster. Tier washes / lavender remain new deck-scoped tokens per "defer to existing CSS vars".
- *Genuine API addition (pinned):* an optional `width: 'auto' | 'full'` axis on `<Button>`/`buttonClasses`, captured as an ADDED requirement in this change's `specs/button-system/spec.md` delta.
- *Risk owned:* the app-wide blast radius (every `primary`/`ghost` button, every modal, every segmented control) is the real exposure — tasks.md adds a visual-regression verification pass over the other consumers.

### D10 — Honest, kind-aware failure screen; rate-limit + manual unchanged
A failed fetch shows a single **FetchFailure** screen whose copy and actions are keyed to the failure *kind*, because the causes differ and collapsing them mislabels the problem (correction: the prior "That link wouldn't load" always blamed the link, even when the fault was a slow or unhealthy product service):
- **Timeout** (`error: 'timeout'`) — the fetch was too slow, and the *same* link may well work on a retry. Copy: "This is taking longer than expected." Primary action: **Try again** (re-fetch the same link); secondary: **Try a different link**, build by hand.
- **Failed** (`error: 'fetch_failed'`) — the fetch returned no usable product. The cause is genuinely ambiguous (the link may not be a product page, the site may block us, or our product service may be having trouble), so the copy admits the uncertainty rather than blaming the link: "We couldn't load that link — it might be the link, or a hiccup on our end." Actions: **Try again** (same link), **Try a different link**, build by hand.

Both kinds offer **Try a different link** from the first failure — they differ in copy and in which action leads, not in the escape paths. A timeout is the slowest failure to observe, so making a user spend the retry cap on a link they already know is wrong would trade two slow waits for nothing; "Try again" leading is what carries the timeout's "this link may well work" message, not the absence of the alternative.

To keep an honest "Try again" from letting a frustrated user grind into the route's per-minute rate limit (each retry is a real call — two, since `fetchProduct` retries internally), the screen is **attempt-aware**: a per-link retry counter (reset when a *different* URL is entered, and when the link fetches successfully — a success ends that link's failure streak, so a later re-fetch starts clean) allows the same-link "Try again" for the first two failures, then **drops it** and hardens the copy to "That link keeps failing — try a different one, or build it by hand," leaving only try-different + build-by-hand. This caps retry-spam before the rate limit and is more honest — a link that has failed three times is unlikely to succeed on a fourth.

429/`rate_limited` is unchanged: it stays on URL entry with the slow-down field message (owned by `product-link-prefill`), never the failure screen. "Build it by hand" routes to the blank Preview with the pasted URL seeded. This revises the prior single-"Timeout screen" treatment (both delta specs) — the screen no longer implies every failure is the link's fault.

### D11 — Accessibility & contrast as tested contracts
Every control meets the 44px floor (or the documented `sm`/`link` exception). Inputs use `FormField` wiring (`aria-invalid`, `aria-describedby`). Tier notes are conveyed by text + icon, not color alone. Progress dots and decorative cycling text stay out of `aria-live`; the loading indicator's own status region announces once (per `product-link-prefill`). New CSS color pairs (tier washes, lavender action row, primary CTAs, faint subtext) are asserted ≥ AA via `test/helpers/contrast.ts`, following `hero-contrast.test.ts`' CSS-extraction pattern.

### D12 — e2e stubs Zyte at the route boundary with a fixture per deck shape
The Playwright spec stubs `/api/product-fetch` via `page.route('**/api/product-fetch', …)` (the existing `paste-prefill.auth.spec.ts` pattern; `ZYTE_API_KEY` is unset in e2e so nothing real is called). Rather than a single mock, the stub returns a **different mock product keyed by the pasted URL** so each deck shape is exercised end to end:
- **Long title + missing price** — title card (error/over-100) + price card.
- **Warning title** — title card (warn, 51–100) with a fetched price.
- **Just missing price** — good title, no price → price card only.
- **No issues** — good title, numeric price, multiple photos → photo card + note card only.
- **Missing photos (0 images)** — photo card in its empty/error state (add-by-URL).
- **Single photo** — photo step bypassed (auto-selected); deck skips straight past photo.

Assertions per fixture cover the computed step set, the removed global skip, required price, the note-dedup (inline note on long title ⇒ no standalone note card), quantity subtext, the photo bypass/error, and successful create. The failure arc (separate URL) drives the Timeout screen and "build by hand" → blank Preview.

### D13 — Photo step always shown except for a single image; zero images is an error state
Choosing a photo is the one decision a fetch can't make for the user, so the `photo` card shows whenever there is a choice or a problem:
- `photos.length > 1` → photo card (the selector).
- `photos.length === 1` → **bypass** the photo card; the lone image is auto-selected (no choice to present). The deck continues through any remaining needed cards to Preview.
- `photos.length === 0` → photo card rendered in an **empty/error state**: a clear "we couldn't find any images" message plus the add-by-URL affordance. The user may add an image or proceed without one (the data model allows a null image), but the error is surfaced rather than silently skipped.

"Bypass" for the single-image case means skipping the *photo step*, not jumping past the rest of the deck — title/price/note cards still run as computed.
- *Intro summary parity:* the `intro` card's pulled-summary SHALL also surface zero images — as a **warning** row ("No photos found — add one"), matching the Triage photo row's `warn` tier and the price-miss warning. Previously the intro simply omitted the photos line when none were found, hiding the gap on the very summary meant to show what was pulled. Warning, not error: a null image is permitted by the model, so it needs attention, not a hard block — the deck's photo *card* keeps its own empty-state treatment above.
- *Alternative (rejected): always show the photo card even for one image.* No decision to make; a pure confirmation tax.
- *Alternative (rejected): silently skip when zero images.* Hides a real gap; the user wanted an explicit error.

### D15 — Field is "Item name" to users + `autoComplete="off"`; internal `title` identifiers kept

The name field wore three different user-facing words across the flow — Triage said "Name", IntroCard said "Title", the editor said "Item name" — and the schema errors still said "Title must be…". Unify on **"Item name"**: it disambiguates the *item's* name from the signed-in person's name, and is the least given-name-like cue. Independently, the input sets `autoComplete="off"` (and emits no `name`/`id` of `"name"`) so browser heuristics never offer the user's own first name — a real risk if the editor's `<textarea>` is ever swapped for a single-line `<input>`. These two levers (visible copy, DOM attributes) are what the browser actually reads; the React prop and schema field named `name` are invisible to autofill.

The internal identifiers (`titleTier`, `TITLE_MAX`, `TitleEditor`, `TitleCard`, the `title` deck step / `FocusField` member) are **left as-is** in this change. They are an implementation detail the spec already references consistently, the user-visible problems (clarity, autofill, inconsistent copy) are fully solved by the copy + attribute fixes above, and a half-rename (step → `name` while the helpers stay `title*`) would introduce a *new* seam. `FOCUS_TITLES` is renamed to `FOCUS_LABELS` (it holds labels, not titles) as a self-contained tidy.
- *Alternative (deferred, not rejected): the full `title → name` internal rename* (step value, `titleTier→nameTier`, `TitleEditor→NameEditor`, `TitleCard→NameCard`, `TITLE_MAX→NAME_MAX`, and the spec's `titleTier`/`title`-step references). This is pure hygiene with broad reach; it earns its own small change with a clean diff rather than churning a 46/49-complete change. The original `focus.ts` seam (`title` key → `Item name` value) persists until then, now documented as legacy-step-id → label.

### D14 — Google image search retired from the flow; its files retained for a future re-add
The old form's Google-image-**search** modal (`ImageSearch` → `ImageResultsViewer` → `/api/image-search`) is **not** wired into the deck: the Photo editor offers candidate selection + add-by-URL only (D13, task 3.1), so image search is dropped from the create/edit experience. Its files are **intentionally kept, not deleted** — the route, rate limiter, components, tests, and CLAUDE.md doc still stand for a future re-add (e.g. a search affordance on the Photo editor). They are dormant (no production importer), so task 7.4's "remove now-dead components" covers only the per-field prefill-form bits, not image search.
- *Alternative (rejected): delete the image-search capability now.* Throws away a working, tested provider-backed feature we expect to bring back; retention costs only the dormant code's carrying weight.
- *Follow-up:* a separate change to re-introduce image search on the Photo editor.

## Risks / Trade-offs

- **Retiring `ItemForm` is a large blast radius** (manual + edit paths, existing tests, `ImageCandidateGrid`/`ImageUrlInput` callers) → Build the new flow behind the same `ItemFormContainer` entry so external callers (`/items` modal, edit route) are unaffected; port image-candidate logic wholesale rather than rewriting; replace `ItemForm.test.tsx` with Preview/deck suites in the same commit.
- **Description max length could truncate users mid-thought / break existing longer descriptions** → Choose a generous cap (≈200) validated against the card layout; on edit, existing descriptions over the cap are shown in full and only blocked from *growing* past it (don't hard-reject saving an unchanged legacy value) — confirm exact behavior in apply.
- **File-size lint (red >400 LOC)** — the orchestrator + many cards risk a bloated file → Split per `feedback_file_size_bands`: deck cards, field editors, preview, triage, sheets, and helpers each in their own module; shared pure helpers in a co-located `utils.ts`.
- **Two quantity defaults diverging** (form view-model vs DB) → both are 1; assert the mapping in a unit test so they can't drift.
- **Contrast regressions from new washes** → contrast tests gate every new text/bg pair; pick token values that pass before wiring CSS.
- **Mobile full-screen sheet vs desktop centered sheet** (mockup `@media max-width:520px`) → reuse `FormShell`'s existing responsive behavior rather than the mockup's bespoke breakpoint.

## Migration Plan

1. Add validation helpers + `description` max to `item.schema.ts` (with unit tests) — pure, no UI dependency.
2. Build the view-model adapter (D2) + tests against `createItem`/`updateItem`.
3. Build field editors (photo/title/price/note), then deck cards, Preview, Triage, Focus, Stores/Lists sheets, Timeout — each with unit tests and CSS using tokens.
4. Rewire `ItemFormContainer` to the screen orchestrator; retire `ItemForm`; port image-candidate logic.
5. Remove description truncation on item display.
6. Add contrast tests for new CSS pairs.
7. Replace `paste-prefill.auth.spec.ts` / add the deck e2e (Zyte stubbed); update/replace `ItemForm.test.tsx`.
8. Verify locally via `npm run dev:local` (dev bypass renders the modal without OAuth).

Rollback: the change is client-flow + validation; reverting the branch restores `ItemForm`. No data migration to undo (description cap is validation-only; no column change).

## Open Questions

Resolved at apply: **Triage copy** — softened to the non-alarming tone ("Review anything" / "Tap a field to fix it."), keeping the per-row structure and tier-driven status pills. This matches the lavender, invitation-not-alarm entry (D8).

Resolved at apply: **Legacy over-cap descriptions** — the `description` `.max(100)` rejects any over-cap value at validation, surfacing a field-level error rather than silently truncating. The "block-growth-only" lean was dropped because (a) the normative `item-decision-deck` scenario says an over-cap description is *rejected at validation*, and (b) block-growth requires the action to compare against the prior DB value, which contradicts the "create/edit actions and DB write path are otherwise unchanged" constraint (D2). The editor shows the legacy value in full with an over-limit counter; the user trims it to save — nothing is auto-truncated.

Resolved: `name` max **100**, `DESCRIPTION_MAX` **100**, title warn at **50**, caps tuned together against one item-card height budget (D5). Photo step visibility / zero-image error decided in D13. Note shown once (inline on long title, else its own card; always on Preview) per D3/D5.

Resolved at apply — **"exactly as it'll appear" must be literal.** The first build of `PreviewCard` was a bespoke lookalike (a compact horizontal card) that diverged from the real list card (vertical layout, store-as-button, 4:3 photo framing) — so the "exactly" copy and the D-goal ("renders the item exactly as it appears on a list") were untrue. `PreviewCard` now renders the **production `ItemCard`** itself (owner perspective), projected from the view-model by a render-only `toItemDisplay(vm)` adapter (sibling to `toItemDetails`), with the claim/purchase/owner-action machinery stripped (none applies to an unsaved item). Gap-surfacing that the bespoke card baked into the card body ("Price not set", a lookalike "+N more") is **removed from the card** — the real card omits a missing price exactly as production does, and the nudges already live off the card (the "Store links" row subtext + Triage). The real `StoreLinks` renders the `+N` store menu natively. A separate component is still legitimate (it owns the view-model→display projection + the single-cell width frame); it just delegates the pixels to the real card.

Resolved at apply — **never auto-populate `$0.00`.** `normalizePrice` (the fetch-seam coercion) now rejects any non-positive value (`<= 0` → `undefined`), so a fetched `0`/`0.00` is treated as *no price* rather than a real one: the price stays empty, the price tier blocks, and the deck's price card forces the user to supply one. `$0.00` remains a valid price a user may **type** themselves (that path doesn't pass through `normalizePrice`); we simply never auto-write it on a fetch miss. (Tightens the `product-link-prefill` seeding contract; the fetch mechanism is otherwise unchanged per the Non-Goals.)
