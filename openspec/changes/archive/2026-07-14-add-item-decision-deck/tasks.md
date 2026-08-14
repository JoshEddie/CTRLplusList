## 1. Validation & schema foundations (pure, no UI)

- [x] 1.1 Add `titleTier(name)`, `priceTier(store)`, `suggestTrim(name)` and `TITLE_MAX=100` / `TITLE_SNAPPY=50` / `DESCRIPTION_MAX=100` constants as pure helpers in a co-located `utils.ts` under the itemform deck directory
- [x] 1.2 Unit-test the tier helpers: empty/≤50/51–100/>100 title boundaries → good/warn/error; empty vs numeric price → blocking/good; `suggestTrim` shortens past the threshold at a clause boundary
- [x] 1.3 Cap `name` at 100 (already present) and add a `description` max-length of 100 to `ItemSchema` in `lib/data/item.schema.ts`, each with a field-level error message
- [x] 1.4 Extend `lib/data/__tests__/item.schema.test.ts` (or create) for the description cap: at-100 accepted, over-100 rejected; confirm legacy over-cap values on edit are not silently truncated (block growth only — per design open question, lock the chosen behavior)

## 2. View-model & submit adapter

- [x] 2.1 Define the deck/preview view-model type (`{ name, photos[], photoIndex, description, stores[], lists[], qty }`) and a `BLANK`/seed-from-item/seed-from-fetch builder
- [x] 2.2 Implement the submit adapter mapping the view-model → existing `ItemDetails` (active image = `photos[photoIndex]`, `image_candidates` = pool, `qty` → `quantity_limit`, store provenance preserved, description passthrough); default `qty` to a limit of 1
- [x] 2.3 Unit-test the adapter against the `createItem`/`updateItem` payload shape, including the quantity-default-1 mapping and provenance preservation/drop on price edit

## 3. Field editors (shared by deck, focus, sheets)

- [x] 3.1 Build the Photo editor (stage + prev/next, thumbnail strip with selected state, add-by-URL), porting the undersized-image pruning and candidate-pool behavior from `ImageUrlInput`/`ImageCandidateGrid`; include the zero-image empty/error state ("couldn't find any images" + add-by-URL); all controls ≥44px
- [x] 3.2 Build the Title editor (textarea via `form-field-system`, tier note, live tier-colored counter, suggested-trim chip, inline note editor when tier ≠ good)
- [x] 3.3 Build the Price editor (numeric field, tier note, `link`-variant "open the product page ↗" affordance, no skip)
- [x] 3.4 Build the Note editor (description textarea, 100-char counter, helper copy)
- [x] 3.5 Unit-test each editor: photo select/add/prune + zero-image error state; title tiers + suggested-trim + inline-note reveal on long title; price required + source link; note counter + optional

## 4. Deck orchestration & cards

- [x] 4.1 Implement `neededSteps(item)`: `intro` always; `photo` when images = 0 (error) or > 1 (selector), skipped at exactly 1; `title` when tier ≠ good; `price` when tier ≠ good; `note` only when title tier is good (else surfaced inline on the title card, no standalone note card). Progress dots reflect step count + position (not in `aria-live`)
- [x] 4.2 Build the Intro card (auto-filled-from-{store} eyebrow, confirmed-summary list, needs-confirmation count line); **remove** the "Skip — straight to preview" affordance — single "Let's go" forward only
- [x] 4.3 Build the Photo / Title / Price / Note cards wrapping the editors, with back/continue footers; continue disabled on `error` tier; price card has no skip; standalone note card (clean-title path only) has a skip-to-preview
- [x] 4.4 Unit-test the deck: step selection across all shapes (clean, warn-title, error-title, missing-price, 0/1/>1 images); single image bypasses photo; inline note on long title ⇒ no standalone note card; no global skip present; green fields confirmed on intro; back/forward navigation; error-tier disables continue

## 5. Preview (universal create/edit surface)

- [x] 5.1 Build `PreviewCard` by reusing the real production `ItemCard` (owner perspective, claim/owner machinery stripped) via a render-only `toItemDisplay(vm)` adapter, so the preview is pixel-identical to the list card; gaps surface off-card (missing price simply absent), never a lookalike annotation
- [x] 5.2 Build the Preview screen (Last look / Editing header, PreviewCard, action rows, Create/Save) with Create/Save disabled on title `error` + inline trim affordance and explanatory line
- [x] 5.3 Implement the "Need to change something?" Triage entry on a lavender surface with an edit icon (replaces "Something's off"/yellow/flag)
- [x] 5.4 Implement the "Lists & quantity" action subtext to include quantity state (e.g. "Not on a list · Qty 1", "Birthday · Unlimited")
- [x] 5.5 Unit-test Preview: real-card states (formatted price + store link, no-price ⇒ price omitted not annotated, +N store menu, full description without clamp), error-tier blocks create, lavender non-alarm entry, quantity subtext rendering

## 6. Triage, Focus, and sheets

- [x] 6.1 Build Triage (per-field rows with value + provenance + tier status; green = glance, others = needs you; row → Focus editor or Stores sheet; back-to-preview)
- [x] 6.2 Build the Focus overlay reusing the field editors; "Done" disabled on `error` tier
- [x] 6.3 Build the Stores sheet (primary auto-fetched + additional rows, add/remove, name/link/price, store validity preserved)
- [x] 6.4 Build the Lists & quantity sheet (list toggles + `segmented-control-system` Unlimited/Limit + ≥44px stepper), defaulting quantity to a limit of 1
- [x] 6.5 Unit-test Triage (row tiers + routing), Focus (error blocks Done), Stores sheet (validity, add/remove), Lists & quantity sheet (toggle, segmented, stepper bounds, default 1)

## 7. Screen orchestration & retiring ItemForm

- [x] 7.1 Rewire `ItemFormContainer` into the screen orchestrator (`start | fetching | deck | preview | triage | failure` + `sheet ∈ {stores,lists}` + `focus`); preserve `FormShell` chrome, dismissal, and `returnTo` contracts
- [x] 7.2 Route fetch success → deck; manual → blank Preview; edit → Preview seeded from item; keep the URL-entry + fetching states (reskinned) and the shared `<LoadingIndicator>`
- [x] 7.3 Build the failure screen ("Try a different link" → URL entry / "Build it by hand" → blank Preview with URL seeded); keep rate-limit → URL entry behavior — _superseded by 14.2/14.3: the single "That link wouldn't load" screen this task built became the kind-aware `FetchFailure`_
- [x] 7.4 Retire `ItemForm.tsx`; remove now-dead components/CSS (old prefill form bits) and update all imports — _the Google image-search files (`ImageSearch`, `ImageResultsViewer`, `/api/image-search`) are intentionally retained, not removed, for a future re-add (D14)_
- [x] 7.5 Unit-test the orchestrator transitions (success→deck, failure→failure screen, rate-limit→url, manual→preview, edit→preview) and that no orphaned `ItemForm` imports remain

## 8. Description-always-shown display

- [x] 8.1 Remove any truncation / `line-clamp` / ellipsis on the item description wherever it renders on a list/item display, so the capped description always shows in full
- [x] 8.2 Unit-test (or contrast/layout test) that an at-cap description renders without clamp in PreviewCard and the item display

## 9. Styling, tokens & accessibility

- [x] 9.1 Author deck/preview CSS using `global.css` tokens; map mockup variants to existing `<Button>` variants; add new tokens only for values with no existing mapping (tier washes, lavender entry)
- [x] 9.2 Ensure every composite control (action rows, triage rows, list options, thumbnails, photo nav, stepper, icon/close/back buttons) meets the 44px floor (or documented `sm`/`link` exception) with `:focus-visible` rings
- [x] 9.3 Add contrast tests (following `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts` + `test/helpers/contrast.ts`) asserting AA for every new text/background pair (tier notes, lavender entry, primary CTAs, faint subtext, counters)
- [x] 9.4 App-wide visual refresh (disclosed scope expansion, design D9; visual treatment only, no behavioral contract change): restyle the `button-system` `primary` variant (outlined → filled gradient) + `ghost` border, center the `form-shell-system` modal chrome and drop its header divider, darken the `segmented-control-system` active fill, and shift the `global.css` brand tokens (`--primary-color-dark`, page-frame gradient, `--heading-text-color`; add `--secondary-color-dark`) toward the Claude mock
- [x] 9.5 Add the optional `width: 'auto' | 'full'` axis to `<Button>`/`<LinkButton>`/`buttonClasses` and pin it as an ADDED requirement in this change's `specs/button-system/spec.md` delta

## 10. End-to-end (Zyte stubbed)

- [x] 10.1 Add a Playwright spec that stubs `**/api/product-fetch` with a **per-URL mock**, returning distinct fixtures so each deck shape is driven: (a) long title (>100) + missing price, (b) warning title (51–100) + price, (c) good title + missing price, (d) no issues (good title + price + multiple images), (e) zero images, (f) single image
- [x] 10.2 Assert per fixture: computed step set; single image bypasses the photo card; zero images shows the error state; inline note on long title ⇒ no standalone note card; price required (no skip); quantity subtext; removed global skip; successful create maps correctly
- [x] 10.3 Add the failure arc: stub returns a failure → assert the failure screen and that "Build it by hand" opens a blank Preview with the URL seeded — _the arc covers the timeout kind; the `fetch_failed` kind and the retry cap are covered by unit tests (14.5)_
- [x] 10.4 Update/replace the existing `e2e/paste-prefill.auth.spec.ts` and `ItemForm.test.tsx` to match the new flow (no stale assertions against the retired form)

## 11. Local verification

- [x] 11.1 Run `npm run dev:local` and walk the deck → preview → create flow under the dev auth bypass (fetch path, manual path, edit path), confirming the corrections render as specified — _done: the 14.6 walk covered the deck/preview/create paths; the failure screen was re-walked after 14b/14b.6 changed it, via the #177 mock — `mock.test/timeout` (new sub "The link may still work — a retry often does it", "Try again" primary with "Try a different link" secondary from the first failure), `mock.test/fetch-failed` (uncertainty copy, three actions), the capped state ("That link keeps failing" + "Try a different one, or build it by hand", "Try again" withdrawn, "Try a different link" promoted), and `mock.test/rate-limited` (URL-entry banner, no failure screen). All render as specified. **Out of reach by design:** the post-success retry-cap reset (14b.2) is not walkable — the mock's fixtures are a static `Record<Scenario, ProductResult>` (`lib/product-fetch/mock.ts:37`), so no scenario fails then succeeds for one URL; its coverage is `SameLinkSucceedsAfterFailure_ResetsRetryCount` (unit)_
- [x] 11.2 App-wide visual-regression pass over the OTHER consumers of the refreshed primitives (every modal via `form-shell`, every `primary`/`ghost` button, every segmented control, the gradient nav + headings) — confirm the deliberate refresh (task 9.4) introduced no unintended regression outside the deck — _done: walked the other consumers of the refreshed primitives; no unintended regression found outside the deck_

## 12. Pre-merge gates (each verified clean, locally)

- [x] 12.1 `npm run lint` — zero errors (one pre-existing yellow size advisory on the unrelated `app/api/image-search/route.ts`, not touched by this change)
- [x] 12.2 `npx tsc --noEmit` — zero type errors
- [x] 12.3 `npm run build` — Next production build completes (route types, RSC/client boundaries, bundle)
- [x] 12.4 `npm run test:coverage` — 2515 tests pass, per-file coverage thresholds met
- [x] 12.5 `npm run test:e2e` — _run locally against the Docker Postgres sidecar; green_

## 13. Name-field copy consistency & autofill safety (D15)

- [x] 13.1 Standardize the user-facing label to **"Item name"**: `Triage.tsx` row "Name" → "Item name"; `IntroCard.tsx` `'Title'` → "Item name" and its "Title is too long" / "Review title for best results" lines reworded to "name"; `FOCUS_LABELS` value → "Item name". The `TitleEditor` field label already reads "Item name" — leave it
- [x] 13.2 Set `autoComplete="off"` on the name editor's `TextareaField` in `TitleEditor.tsx`; confirm no `name`/`id` of `"name"` reaches the DOM textarea
- [x] 13.3 Update `lib/data/item.schema.ts` name error strings "Title must be at least 3 characters" / "Title must be less than 100 characters" → "Item name …", matching the `name` field and the visible label
- [x] 13.4 Rename `FOCUS_TITLES` → `FOCUS_LABELS` in `deck/focus.ts` (it holds labels, not titles); update the two importers (`ItemFormContainer.tsx`, `FocusEditor.tsx`); refresh the stale "'title' reads as 'Name'" comment
- [x] 13.5 Unit-test: the label reads "Item name" on intro / title card / Triage / Focus; the name input carries `autocomplete="off"`; `item.schema.ts` rejects a 2-char and a 120-char name with an "Item name …" message (also updated `ItemFormContainer.test.tsx` + `item-crud.auth.spec.ts` row selectors to `/Item name/`)
- [x] 13.6 _(split out — tracked as [#180](https://github.com/JoshEddie/CTRLplusList/issues/180), `EXPLORE NEEDED`)_ Full `title → name` internal rename — `titleTier→nameTier`, `TITLE_MAX→NAME_MAX`, `TitleEditor→NameEditor`, `TitleCard→NameCard`, the `title` deck step / `FocusField` member, and the matching `specs/item-decision-deck` references. Pure hygiene, broad reach; deliberately NOT bundled into this change — propose on its own for a clean diff (D15)

## 14. Dev-verification defect fixes (issue #175; D10 revision)

Three defects surfaced verifying on dev (issue #175 comment); the mock from #177 makes each state reproducible. Fix-forward while the change is still active.

- [x] 14.1 **Padding (Defect 2):** the failure screen renders edge-to-edge — `FormShell` renders `{children}` directly (not inside `.form-shell-body`), so each deck screen owns its padding, and the failure screen's rule sets only `align-items`/`text-align`. Give it `padding: 8px 24px 24px` to match `.deck` / the other screens.
- [x] 14.2 **Honest kind-aware failure screen (Defect 3, D10):** generalize `deck/Timeout.tsx` into a `deck/FetchFailure.tsx` that takes a `kind: 'timeout' | 'failed'` and a `canRetrySame: boolean` (from the retry cap), rendering the copy + action set per D10 (timeout → "taking longer than expected" + Try-again-same + build; failed → uncertainty copy + Try-again-same + Try-different + build; capped → drop Try-again, harden copy). Update `deck.css` class(es) accordingly.
- [x] 14.3 **Container routing + retry cap:** in `ItemFormContainer.tsx`, branch on `result.error` (`timeout` vs `fetch_failed`; network-catch → `failed`) instead of collapsing both to one screen; track a per-link same-link retry count (reset when a different URL is entered), wire a "Try again" handler that re-fetches the current `pastedUrl`, and withdraw it once the cap (2) is reached. Rate-limit path unchanged.
- [x] 14.4 **Intro no-image warning (Defect 1):** `IntroCard.tsx` — when `photos.length === 0`, push a **warning** row ("No photos found — add one") instead of omitting the photos line, matching the Triage photo `warn` tier and the price-miss warning.
- [x] 14.5 **Unit tests:** `FetchFailure` renders each kind's copy/actions and the capped state; `ItemFormContainer` routes `timeout`/`fetch_failed`/network-error to the right kind, increments + resets the retry cap, and re-fetches on Try-again; `IntroCard` shows the zero-photo warning row.
- [x] 14.6 **Verify each state via the #177 mock** under `npm run dev:local`: `mock.test/timeout` (timeout copy + retry-same), `mock.test/fetch-failed` (uncertainty copy; retry cap withdraws after 2), `mock.test/rate-limited` (banner, no failure screen), `mock.test/success-no-image` (intro warning row), and re-check the failure-screen padding. Walked and confirmed good; 11.1 still owns the re-walk after 14.7.

## 14b. Review round-1 fixes (`/spec-review`; see `review.md`)

- [x] 14b.1 **Escape path on the timeout kind (S4/C4):** offer "Try a different link" on *both* kinds from the first failure — a timeout is the slowest failure to observe, so a mistyped link must not cost two timeouts to leave. "Try again" stays primary while uncapped. Updates `FetchFailure.tsx`, the `item-decision-deck` timeout bullet + scenario, and the two tests that asserted the exclusion
- [x] 14b.2 **Retry counter survives a success (S1):** reset the per-link counter on the ok-result branch, not only when a different URL is entered — a link that fetched successfully was carrying its pre-success failures into a later re-fetch and hardening the copy one failure early. Adds the matching spec scenario + `SameLinkSucceedsAfterFailure_ResetsRetryCount`
- [x] 14b.3 **Shared `FailureKind` (S3):** export the `'timeout' | 'failed'` union from `FetchFailure.tsx`; drop the three redeclarations (container, `copyFor`, test helper)
- [x] 14b.4 **Cross-spec drift (C1):** add a `product-fetch-mock` MODIFIED delta — the canonical spec still routed both failure fixtures to "the timeout screen", a screen this change removes
- [x] 14b.5 **Convention (V2/V3/V4/V5):** drop the `summarize` comment (restated WHAT + named its caller); split the three-trigger `ClickActions_InvokeMatchingHandlers` into one test per trigger; rename `NetworkError_ShowsFailedKind` to name its rendered copy + logged side-effect; restore parent-before-sibling import order in `IntroCard.tsx`
- [x] 14b.6 **Timeout sub-copy drift (found walking 11.1):** 14b.1 added the third action but left the timeout sub enumerating two ("give it another try, or build the item by hand"). Rather than list all three — which would flatten the hierarchy D10 rests on — the sub now states the cause and lets the buttons carry the actions ("The link may still work — a retry often does it"), matching the failed kind's existing shape. Also reconciles the hardened sub to the spec's quoted wording ("build **it** by hand", matching the button label; was "build the item by hand"). Pins both subs in `FetchFailure.test.tsx` — neither was asserted, which is how the drift landed
