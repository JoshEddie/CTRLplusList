## Context

The codebase has three parallel row-layout systems for item rows:

1. `.item-list .item-container` — items library list view (`/items?view=list`, `/purchased`).
2. `.sortable-item .item-container` — owner sortable view (`/lists/[id]`).
3. `.choose-items-row` — picker (`/lists/[id]/choose-items`).

(1) and (2) were unified into a shared 5-col grid (`52px 1fr auto auto auto / auto auto`) during the WCAG row-layout reunification work in `replace-storelinks-expand-with-popover` §11–12. (3) was scope-expanded in that change's proposal but pragmatically downscoped at implementation time to "mobile card-feel + descriptions only," with the literal grid-template and JSX unification **deferred to a follow-up named `consolidate-row-layouts`**. The active `item-store-links` spec carries a "Note (deferred)" paragraph naming this change as the resolution.

This change closes that gap. The shared row primitive — `<Item />` rendered with `preview` — already exists and is used by the item-form V2 split-pane. The checkbox primitive — `<CheckboxField>` from `form-field-system` — also already exists. The work is composition + deletion, not new primitive design.

**Current state (`.choose-items-row`):**
- `<button aria-pressed>` wrapping the entire row.
- Inside: hand-rolled `<span>` "checkbox" with conditional `<svg>` checkmark (no real `<input type="checkbox">`).
- Hand-rolled `.choose-items-chip` / `.choose-items-chip-static` markup that bypasses `<StoreLinks>` and the `+N` popover.
- Hand-rolled `.choose-items-thumb` (56px) instead of the shared 52px square.
- Hand-rolled `.choose-items-price` right-stacked column instead of the shared name/price-with-leader-dots two-row layout.
- `e.stopPropagation()` on chip `onClick` to prevent the row's `onClick={toggle}` from firing — the only mechanism keeping the nested-anchor-in-button semantics tractable.
- No `:focus-visible` styling — keyboard users see no indicator.
- Hard-coded color literals on `.is-removing` modifiers (`#fff5f5`, `#fee2e2`, `#f87171`) that dodged the Stage 5.7 token migration.

**Target state:**
- `<label class="choose-items-select">` wraps `<CheckboxField label={item.name}>` + `<Item preview />`.
- All row-shape concerns delegated to `Item` and its shared `.item-list .item-container` CSS.
- Selection state lives on the `<label>` as additive background-color modifiers (`.is-on`, `.is-removing`) layered on top of the shared row's default.
- Strike-through on the removing-state item name applied via page-scoped CSS (`.choose-items-select.is-removing .itemName`).
- `<Item preview />` already triggers `.preview .item-owner-actions { display: none; }` in `item.css` (line 267) — owner edit/archive icons in col 5 are suppressed by construction.
- Buy-link chips render via `<StoreLinks>` inside `<Item>` — picker users get the same primary buy-link pill + `+N` popover that the items library shows.

## Goals / Non-Goals

**Goals:**
- Bring `/lists/[id]/choose-items` row anatomy to literal parity with the items-library list view at every breakpoint covered by the shared row.
- Eliminate the bespoke `.choose-items-row` / `.choose-items-chip*` / `.choose-items-thumb*` / `.choose-items-name` / `.choose-items-price*` CSS rules; the row inherits the shared rules.
- Restore native checkbox a11y via `<CheckboxField>` (already mandated by `form-field-system`).
- Restore `:focus-visible` parity by inheriting the shared row's focus treatment.
- Token-ize the `.is-removing` color literal.
- Resolve the "Note (deferred)" paragraph in the active `item-store-links` spec.

**Non-Goals:**
- Changing `<Item />`'s contract or any of its existing call sites' rendered output (preview-mode behavior is already what we need — extending it is a Decision below, not a goal).
- Changing the `.choose-items-pg-hd*` page header chrome (Stage 5.4 work; visually correct as-is).
- Changing the `.choose-items-sticky-ft*` footer or change-tracking count logic.
- Changing URL-driven toolbar behavior, `setListItems` server action, or any cache tag.
- Changing the items library or sortable-owner row layouts (they're the source of truth and already correct).
- Hiding store-link chips on picker rows — the chips are valuable (a picker user researching whether to add an item will want to follow the link). The fallback (`pointer-events: none` on picker chips) is documented as a risk-mitigation lever, not a goal.
- Adding any new primitive. This change is composition-only.

## Decisions

### D1 — Compose `<label>` + `<CheckboxField>` + `<Item preview />` instead of restructuring `<Item>` to accept a leading checkbox slot

The picker row is logically `[leading: checkbox] + [shared row body]`. Two natural shapes:

**Option A (chosen)**: outer `<label>` wraps both the checkbox and the unmodified `<Item preview />`. The checkbox sits *outside* `<Item>` in the DOM tree but visually inside the row via grid layout on the `<label>`.

**Option B (rejected)**: extend `<Item>` to accept a `leading` slot prop (`leading?: ReactNode`) that renders into a new "col 0" of the grid, analog of how `.sortable-item` adds a drag handle in a wrapping `.sortable-item` element.

A wins because:
- `<Item>` stays exactly as it is — zero risk to existing callers.
- Mirrors how `.sortable-item` handles its drag handle today (the handle lives in a *wrapping* element, not inside `<Item>`). Symmetry, not divergence.
- The wrapping element (`<label>`) is semantically required for the checkbox-toggles-on-click behavior; sliding the checkbox inside `<Item>` would force the label boundary inward and complicate the surrounding `<li>` markup.

Trade-off: the grid that places the checkbox in the leading column lives on `.choose-items-select` (the `<label>`), not on `.item-container`. The 5-col shared grid inside `<Item>` is unchanged; the picker's outer grid is a 2-col grid (`auto 1fr`) where col 1 is the checkbox and col 2 is the entire `<Item />`. Two grids nested. Acceptable because (a) the inner shared grid is the source of truth for the item content layout; (b) the outer grid only positions one extra element.

### D2 — Use `<CheckboxField label={item.name}>` with the label text visually hidden, not a bare `<input type="checkbox">`

`form-field-system` mandates `<CheckboxField>` for every checkbox. The primitive renders `<label><input/><span>label</span></label>`. In the picker, the row already shows the item name (via `<Item>`); we don't want the checkbox's own label text rendered twice.

**Option A (chosen)**: render `<CheckboxField label={item.name}>` and apply page-scoped CSS to visually hide the `<span>` inside `.choose-items-select .checkbox_field` (sr-only pattern: `position: absolute; width: 1px; height: 1px; clip: ...`). The accessible name on the checkbox is correctly the item name; screen readers announce "checkbox, <item name>" — visual users see one item name (from `<Item>`).

**Option B (rejected)**: bare `<input type="checkbox">` inside the row `<label>`. Violates the `form-field-system` requirement that every checkbox migrates to `<CheckboxField>`. Would require either a spec modification (heavyweight) or a documented exception in the form-field-system spec (re-discovery surface). Not worth the friction.

**Option C (rejected)**: extend `<CheckboxField>` with a `hideLabel` or `aria-label`-only prop. This is the "right" long-term answer if more callers need it, but no other caller does today. YAGNI — page-scoped CSS to hide the inner `<span>` is sufficient and keeps the primitive contract intact.

Note: `<CheckboxField>` already wraps in `<label>` internally. So actually we have *nested labels* — the outer row `<label>` and the inner `<CheckboxField>` `<label>`. Browsers permit nested labels but only the innermost has effect for the form control association. This is fine because the inner `<label>` correctly associates the checkbox with the (hidden) `<span>` text; the outer "label" need not be a `<label>` element at all.

**Revision to D1/D2**: the outer wrapper SHOULD be a `<div class="choose-items-select" onClick={toggle}>`, not a `<label>`. The checkbox handles its own labeling via `<CheckboxField>`. Click-anywhere-on-the-row toggles by virtue of the `<div>`'s `onClick`. Tapping the checkbox itself triggers the native input change. Both paths land in the same state.

But that loses the native "click label toggles input" affordance. Better: keep the outer `<label htmlFor={inputId}>` (use `id` on the input, `htmlFor` on the outer label) — the outermost `<label>` with `htmlFor` matching the input's `id` *does* establish a label-input association even when the input is also wrapped by a closer `<label>`. This gives us click-anywhere-to-toggle without needing JS, and the inner `<CheckboxField>` label still owns the accessible name.

**Final**: outer `<label htmlFor={checkboxId}>` + inner `<CheckboxField id={checkboxId} label={item.name}>` (label text sr-only via page CSS) + `<Item preview />`. The outer label provides click affordance; the inner provides the accessible name.

### D3 — Inherit owner-actions suppression via existing `.preview .item-owner-actions { display: none; }` rule

`<Item preview />` already triggers the `.preview` className on `.item-container`. CSS rule `app/(main)/items/ui/styles/item.css:267` already hides `.item-owner-actions` on `.preview` rows. No `<Item>` component change required. Verified by reading the existing rule + Item.tsx's className composition at line 193.

The mobile-only owner-actions-kebab `.item-owner-actions-mobile` also needs to be suppressed on `.preview`. It is not, today. Add a sibling rule in this change: `.preview .item-owner-actions-mobile { display: none; }`. Scoped to `item.css` (where the existing `.preview .item-owner-actions` rule lives) for grep-discoverability.

### D4 — Suppress the claim CTA on picker rows even though `isOwner === true` makes it not render anyway

Picker rows are always rendered for the list owner viewing their own item library. `<Item>`'s claim CTA is gated `{!isOwner && ...}`. So in the picker, claim CTA is naturally absent. No change required.

**But**: the `claim-counter` is gated `{showCounter && !isOwner && !showPurchased && ...}` — also naturally absent for owners.

**And**: `showPurchased` / `purchased-banner` paths gate on `!isOwner` for the consumer-facing variants. The owner-spoiler variant (`showSpoilerInfo`) requires `isOwner && hasAnyClaim && spoilersRevealed` — the spoilers context comes from URL params, which the picker page does not set, so this is also naturally absent.

Net: the picker shows only the image + name + price + storeLinks. Exactly what we want. No `<Item>` changes needed for content suppression beyond the existing `.preview` rule.

### D5 — Selection state via CSS modifiers on the outer `<label>`, not via component props on `<Item>`

Today's `.choose-items-row.is-on` / `.choose-items-row.is-removing` are background-color rules. They move to `.choose-items-select.is-on` / `.choose-items-select.is-removing` — same CSS shape, applied to the outer wrapper. `<Item>` knows nothing about picker selection state, which is correct (selection is a page concern, not an item concern).

The strike-through on the removing-state item name moves from `.choose-items-name.is-strike` (today: applied directly to the JSX-controlled name span) to `.choose-items-select.is-removing .itemName` (CSS-only, no JSX coordination required). Documented as a page-scoped exception in `list.css` adjacent to the `.choose-items-select` rule.

The "IN LIST" badge (`<span class="choose-items-in-badge">In list</span>`) and "archived" badge (`<span class="choose-items-archived-badge">archived</span>`) live *inside* the row. Today they sit alongside the name inside `.choose-items-name`. With `<Item>` rendering the name, they no longer have an in-component injection point.

**Option A (chosen)**: render the badges as siblings of `<Item>` inside the `<label>`, absolute-positioned over the upper-right corner of the row. Adjacent to where the name is, visually grouped with the item identity. Keeps `<Item>` untouched.

**Option B (rejected)**: extend `<Item>` with a `badges` slot prop. Adds primitive surface area for a single caller's need.

**Option C (rejected)**: hide the badges from the row entirely and rely solely on the `.is-on` background tint + `.is-removing` strike-through. Loses the explicit "In list" affordance that today helps users quickly scan which items are already attached.

Trade-off on A: absolute positioning over the row content needs `.choose-items-select { position: relative; }` and a `.choose-items-badges { position: absolute; top: 8px; right: 12px; }` overlay. Small page-scoped CSS addition.

### D6 — Token-ize the `.is-removing` background

Today: `background: #fff5f5;` on `.choose-items-row.is-removing` and a different red palette on the now-deleted `.choose-items-cb.is-removing`.

Three options for the new token:

**Option A (chosen tentatively)**: reuse `--secondary-background-color` (the existing neutral surface tint). The visual signal for "this row is being removed" is then the strike-through on the name plus a subtle background change. Lower visual noise. No new token.

**Option B**: introduce `--remove-bg: #fff5f5;` (literal preserved). Distinct red-tinted background for the removing state, matching today's visual.

**Option C**: introduce `--remove-bg` as a derived value from existing brand tokens (e.g., a desaturated, low-saturation version of an error token if one exists).

Decision is **A (reuse `--secondary-background-color`)** — pending visual review at preview-verification time. If the reduced color cue feels insufficient under user testing, swap to B. The token addition is reversible.

### D7 — Picker rows keep buy-link chips as live anchors (do not suppress with `pointer-events: none`)

The picker shows the owner's own library. A picker user deciding whether to add an item to a list might want to verify where the link goes (e.g., "is this still in stock at Etsy?"). Suppressing the chips' interactivity would force them to leave the picker and return — friction without clear benefit.

**Risk** (also captured below): a user trying to tap-toggle but landing on a chip will open the store in a new tab. The chip is small relative to the row; the surrounding label area is large. If user testing surfaces real misclicks, the fallback is to add `.choose-items-select .storeLinks a { pointer-events: none; }` — page-scoped, reversible. Until then, live chips win on capability.

### D8 — Mobile layout inherits the shared horizontal-card reflow

At `<600px` the shared row CSS reflows from D3 (two-row right-of-image content + tall pill) to M1 (image upper-left, name row 1, price row 2, description row 3, store-chip + actions row 4). The picker inherits this by virtue of consuming the shared row. The outer `<label>` 2-col grid (checkbox + Item) becomes a 2-col grid at mobile too — checkbox in col 1, Item in col 2, both at the same height as the shared row's natural mobile height.

Detail: at very narrow widths (<400px) the shared row's owner-actions-kebab engages. Per D3 we suppress it with the new `.preview .item-owner-actions-mobile { display: none; }` rule. So the picker mobile row at <400px is `[checkbox] + [image+name+price+description+chips]` — no kebab cell, no owner actions, identical anatomy at <400px as at 400–599px.

### D9 — Deletion is aggressive; retention is narrow

The proposal-side accounting names the rules that go and the rules that stay. Restating the principle: any rule that styles row content (the row itself, the checkbox, the thumb, the name, the description, the from-label, the chips, the price, the stores-count) gets DELETED. Any rule that styles page-level chrome (page header, sticky footer, count text, undo button) gets RETAINED unchanged. The boundary is "is this about the row body or the page chrome around the row body."

### D10 — Acceptance check is identity-of-render, not just "looks right"

Verification (tasks §9) reads the rendered DOM of a picker row and asserts the inner row is the same `.item-container.preview` shape as the items-library list-view row. This is stronger than visual review alone — it catches future drift where someone might add a picker-only CSS rule that shadows the shared rule. The check is a quick `preview_inspect` on the picker row's `.item-container` and confirming class list + computed grid template match the items-library row's.

## Risks / Trade-offs

- **[Risk]** Buy-link chips inside picker rows are live anchors; a tap meant to toggle selection might hit a chip and navigate to the store instead. **Mitigation**: D7 documents the `pointer-events: none` fallback. Watch for it in user testing.

- **[Risk]** `<Item preview />` has only ever rendered inside the item-form's V2 split-pane. Picker context is a new render environment — width, surrounding chrome, repeated instances per page. Possible artifacts: hover state interactions with the surrounding `<label>`, focus-ring placement on the checkbox inside a grid-layout label. **Mitigation**: preview-verification at three breakpoints (≥600px, 400–599px, <400px) and at least one item in each of {has-image, no-image, has-extras (storeLinks `+N`), no-stores, archived-on-list, on-list, removing-from-list, fresh-add}.

- **[Risk]** The nested-label pattern (`<label htmlFor=X>` outer + `<label>` from `<CheckboxField>` inner with the input inside) is unusual. Browsers handle it per spec but some screen readers may announce the input twice. **Mitigation**: AT smoke test (VoiceOver on macOS Safari, NVDA on Windows Firefox) on a row before merge. If announcement is duplicated, fall back to: outer `<div onClick={...}>` (not `<label>`) + inner `<CheckboxField>` doing all the labeling. Loses native click-to-toggle on the row body, gained via a JS click handler instead.

- **[Risk]** Existing JSX-controlled "IN LIST" + "archived" badges sit inside `.choose-items-name` today. The new design renders them as an absolutely-positioned overlay (D5 Option A). Absolute positioning can collide with `<Item>`'s own corner elements if those exist (they don't, but a future `<Item>` change could add them). **Mitigation**: document the badges overlay rule with a comment in `list.css` noting that it depends on `<Item>`'s top-right corner area being free.

- **[Trade-off]** Two nested grids: outer `.choose-items-select` is `auto 1fr` (checkbox + Item); inner `.item-container` is the shared 5-col grid. Slightly more complex DOM than a single flat grid. Accepted because `<Item>` stays untouched.

- **[Trade-off]** The strike-through on the removing-state name is now a page-scoped CSS rule reaching into a primitive's internal class (`.itemName`). This is a minor cross-boundary coupling — page CSS knows about `<Item>`'s internal class name. Documented as a page-scoped exception. Alternative (extending `<Item>` with a `strikeName` prop) was rejected for the same primitive-surface-area reason as D5 Option B.

- **[Trade-off]** Removing the `.choose-items-row` `<button>` removes the `aria-pressed` toggle button semantics. The new `<input type="checkbox">` advertises `checkbox` semantics with `checked` state — a different but more accurate model for selection-in-a-list. Documented for completeness; this is an improvement, not a regression.

## Migration Plan

1. **Add CSS first** (`list.css`): introduce `.choose-items-select` shell rule, `.is-on` / `.is-removing` modifier rules, the absolute-positioned badges overlay rule, the sr-only override for the inner `<CheckboxField>` `<span>`, the strike-through rule for `.is-removing .itemName`, the `.preview .item-owner-actions-mobile { display: none; }` companion in `item.css`. These are additive; nothing visually breaks yet because the JSX still uses the old markup.
2. **Rewrite the JSX in `ChooseItemsForm.tsx`**: replace the `.choose-items-row` `<button>` with the `<label>` + `<CheckboxField>` + `<Item preview />` + badges-overlay markup. Selection state now flows through the input's `checked` and `onChange`.
3. **Verify in preview** at ≥600px, 400–599px, and <400px. Snapshot the row's class list + computed grid to confirm parity with the items-library list-view row.
4. **Delete the obsolete CSS** in `list.css`: the entire `.choose-items-row` family, all the `.choose-items-cb*`, `.choose-items-thumb*`, `.choose-items-main`, `.choose-items-name*`, `.choose-items-from`, `.choose-items-description`, `.choose-items-chips*`, `.choose-items-chip*`, `.choose-items-right`, `.choose-items-price*`, `.choose-items-stores-count` rules and their mobile/<500px overrides. Re-verify in preview.
5. **Token sweep**: confirm `--secondary-background-color` is the chosen `.is-removing` backdrop (or introduce `--remove-bg` if visual review rejects it). Grep for any residual `#fff5f5` / `#fee2e2` / `#f87171` literals in `list.css` and confirm zero matches.
6. **Type-check + lint + preview console clean.**
7. **Archive considerations**: this change is layout-only; no rollback database step. Reverting is `git revert` on the merge commit.

## Open Questions

- **OQ1**: Should the badges overlay sit at the row's top-right corner or inline near the item name? Top-right matches the design's "decorative state indicator" register, but inline matches today's behavior (badge directly after the name). Resolve at implementation time by visually comparing both in preview.
- **OQ2**: Does VoiceOver announce the nested-label structure cleanly, or does it duplicate the row? If duplicated, fall back to the `<div onClick>` approach (D2 revision). Resolve at preview-verification time.
- **OQ3**: Tentative D6 reuses `--secondary-background-color` for the `.is-removing` backdrop. If visual review wants the red-tinted differentiation back, introduce `--remove-bg: #fff5f5;` as a new token in `global.css`. Resolve at preview-verification time.
