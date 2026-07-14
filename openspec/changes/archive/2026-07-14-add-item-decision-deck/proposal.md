## Why

Pasting a product link already auto-fills an item (`product-link-prefill`), but a successful fetch drops the user straight into the full `ItemForm` — a dense, all-fields-at-once surface. Scraped data is uneven: titles arrive bloated with marketing junk, prices are often missing, and there are several image candidates to choose from. Asking the user to audit all of that in one form is the wrong altitude. The **Decision Deck** replaces the post-fetch form with a short, guided card flow that surfaces *only* the fields that need a human, confirms the rest, and lands on a faithful preview of the item exactly as it will appear on a list — then becomes the single create/edit surface for manual entry and editing too.

This also closes real correctness and accessibility gaps the current form papers over: prices silently default to `$0.00`, long titles invite users to cram size/color/variant into the name, descriptions can be truncated in display, and several interactive targets fall below the 44px floor `button-system` mandates.

## What Changes

- **BREAKING (internal UX):** A successful fetch no longer opens the full `ItemForm`. It enters a **Decision Deck** — a stepped card sheet (`intro → photo → [title] → [price] → note`) that only shows a card for a field that needs attention.
- The **Preview** screen ("Here's your item") becomes the universal item create/edit surface, replacing `ItemForm` for the fetch, **manual**, and **edit** paths. From Preview the user reaches **Triage** ("review every field"), per-field **Focus** editors, and **Stores** / **Lists & quantity** sheets.
- A dedicated **Timeout** screen replaces the inline "couldn't fetch" notice for hard fetch failures (retry a different link / build by hand); the rate-limit and manual-entry behaviors are preserved.
- **Title validation tiers:** soft warn at **> 50 chars** ("longer than 50 characters — we suggest trimming; extra detail belongs in a description"); hard error (cannot save) at **> 100 chars** and at empty. A one-tap "suggested trim" chip stays.
- When a title is long, the **note/description editor is surfaced inline on the title card** to absorb the size/color/variant detail users would otherwise stuff into the name — and the standalone note card is then **dropped** (the field is asked for once; it still shows on Preview).
- **Name and description are both capped at 100 chars** and the description is rendered **in full wherever it appears** (no truncation/ellipsis). The two caps share one item-card height budget so the un-clamped description never stretches a card past its ~2-line budget; raising one cap means lowering the other.
- **Photo step shows whenever there is a choice or a problem:** skipped (auto-selected) for a single returned image, shown as a selector for multiple, and shown as an **error state** ("couldn't find any images" + add-by-URL) for zero.
- **Price is required, not skippable:** the "Skip" affordance on the price card is removed; the price card shows a small link back to the pasted product page (so the user can go check the price we couldn't pull). Empty price never silently becomes `$0.00`.
- **Remove the "Skip — straight to preview" link** on the intro card — validated ("green") fields are shown as confirmed on the intro summary, never bypassed via a global skip.
- **Quantity defaults to 1** and is reflected in the Lists & quantity subtext on Preview (e.g. "Not on a list · Qty 1").
- The Preview's edit entry point changes from **"Something's off"** (yellow + flag — reads like an alarm) to **"Need to change something?"** on a light-violet (lavender) surface — an invitation, not a warning.
- **Accessibility:** every control routes through `button-system` / `form-field-system` / `segmented-control-system` primitives or a page-scoped accessible control at the 44px floor; text/background pairs are asserted against WCAG AA via the existing contrast test engine.
- The deck's visual fidelity to the Claude mock is achieved by a **deliberate app-wide visual refresh** of shared primitives and brand tokens (primary-button fill+gradient, centered/borderless modal chrome, darker segmented fill, shifted `global.css` brand tokens) — these ride along intentionally and reach every consumer, not just the deck; see design **D9** and the "Modified app-wide for visual fidelity" capabilities note. The mockup's bespoke spinner and standalone "Ctrl+List" brand mark are still **not** copied.
- **Thorough tests:** vitest unit/component tests for every new component and the validation/tier helpers; a Playwright e2e that drives the whole flow with the Zyte-backed `/api/product-fetch` stubbed to a mock product.

## Capabilities

### New Capabilities
- `item-decision-deck`: The guided post-fetch card deck and the Preview-centered create/edit experience that replaces `ItemForm` — deck step selection, validation tiers (title 50/100, price-required, description max), inline note-on-long-title, the faithful preview card, Triage, Focus editors, Stores and Lists & quantity sheets, the Timeout screen, quantity-default-1, and the accessibility/contrast contract for all of the above.

### Modified Capabilities
- `product-link-prefill`: The "successful fetch SHALL prefill the item form" requirement is rewritten — a success now enters the Decision Deck; a hard failure shows the Timeout screen. The URL-entry and fetching states (and their `FormShell`, abort, and `returnTo` contracts) are retained; the rate-limit-stays-on-URL-entry behavior is unchanged.
- `button-system`: a new optional `width: 'auto' | 'full'` axis is added to `<Button>`/`<LinkButton>`/`buttonClasses` — pinned as an ADDED requirement in this change's `button-system` spec delta. (The `primary`/`ghost` visual restyle is separate, visual-only, and disclosed below — not pinned as a requirement.)

### Modified app-wide for visual fidelity (visual treatment only — no behavioral/contract change, not pinned as requirements)
Reaching fidelity to the Claude deck mock required a deliberate, app-wide restyle of shared primitives and brand tokens (see design **D9**). These reach every consumer, not just the deck; no capability's behavioral contract (structure, a11y, keyboard, token existence/consumption) changes, so they are disclosed here rather than pinned as spec deltas:
- `button-system`: `primary` outlined → filled gradient (white text, `@media (hover:hover)` animation); `ghost` gains a visible border. The fixed variant *set* is unchanged (no new variant).
- `form-shell-system`: the base modal overlay centers vertically (`top: 0`, `align-items: center`) and drops the header divider. Structure, dismissal, footer, and `returnTo` contracts unchanged. Blast radius: every modal.
- `segmented-control-system`: the light-tone active-segment fill darkens to `--primary-color-dark`. Role / keyboard / contrast contracts unchanged.
- `global.css` brand tokens: `--primary-color-dark`, the page-frame gradient stops, and `--heading-text-color` shift toward the mock; `--secondary-color-dark` is added. Token existence/consumption (owned by `app-frame`) is unchanged — only values move.

### Inherited constraints (consumed, not modified)
- `form-field-system`: name/price/url/image-url inputs and the note textarea render through `FormField` + `TextField` (label, `aria-describedby`, `aria-invalid`, field-level error).
- `loading-indicator-system`: the fetching state keeps the shared `<LoadingIndicator>` — the mockup's bespoke spinner is not introduced.
- `item-store-links`: the store all-or-nothing validity rule (name + link + numeric price) and price provenance (`price_fetched_at`, `canonical_url`, `currency`) are unchanged; the deck enforces a non-empty price before leaving the price card.
- `testing-foundation`: new tests follow the substance rules and reuse `test/helpers/contrast.ts` for AA assertions.

## Impact

- **New UI** under `app/(main)/items/ui/components/itemform/` (or a new `deck/` subtree): deck orchestration, deck cards, field editors (photo/title/price/note), `PreviewCard`, Triage, Focus overlay, Stores sheet, Lists & quantity sheet, Timeout screen, plus their CSS using `global.css` tokens.
- **Rework** `ItemFormContainer` into the screen orchestrator (start | fetching | deck | preview | triage | timeout + stores/lists sheets + focus overlay); retire/absorb `ItemForm.tsx` and fold in the existing `ImageCandidateGrid` / `ImageUrlInput` behavior (undersized-image pruning, candidate pool) where the photo editor needs it.
- **Schema/validation:** `lib/data/item.schema.ts` gains a `description` max length; the create/edit actions and DB write path are otherwise unchanged (`createItem`, `updateItemStores`, `replaceItemImages`). Quantity default becomes 1 in form state (DB default is already 1).
- **Display:** any item-description render path must show the full description (remove truncation/ellipsis) consistent with the new max length.
- **No API or data-layer endpoint changes:** `/api/product-fetch`, the Zyte seam, and cache tags (`items`) are untouched; this is a client-flow + validation + presentation change.
- **Tests:** new vitest suites per component + a Playwright spec stubbing `/api/product-fetch`; existing `paste-prefill.auth.spec.ts` and `ItemForm.test.tsx` are updated/replaced to match the new flow.
