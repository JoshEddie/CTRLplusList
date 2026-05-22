## 1. Pre-flight

- [x] 1.1 Confirm `<CheckboxField>` exists at `app/ui/components/field/CheckboxField.tsx` with `label`, `id`, and pass-through input props. If the API has drifted (e.g., `label` renamed), update this change's design.md D2 and the spec deltas before proceeding.
- [x] 1.2 Confirm `<Item />` at `app/(main)/items/ui/components/Item.tsx` accepts the `preview` prop and that the `preview` JSX path composes the `.preview` class onto `.item-container`. Confirm `.preview .item-owner-actions { display: none; }` exists in `app/(main)/items/ui/styles/item.css` (it does — line 267 at time of writing).
- [x] 1.3 Read the current `ChooseItemsForm.tsx` selection state plumbing (`selected: Set<string>`, `toggle`, `initialSet`, `addedCount`, `removedCount`) so the JSX rewrite preserves it. None of this logic changes.
- [x] 1.4 Verify by reading `app/(main)/items/ui/components/itemform/ItemForm.tsx` that `<Item preview />` is already used (it is — `previewCard` at ItemForm.tsx:85). The picker becomes the second caller, not a new pattern.

## 2. CSS — add the new shell rules (no JSX changes yet)

- [x] 2.1 In `app/(main)/items/ui/styles/item.css`, add `.preview .item-owner-actions-mobile { display: none; }` as a sibling of the existing `.preview .item-owner-actions` rule (per design.md D3). Verify it doesn't break the item-form V2 split-pane preview (the preview is owner-of-self, so the kebab would otherwise render there too — this rule corrects that latent gap as a side benefit).
- [x] 2.2 In `app/(main)/lists/ui/styles/list.css`, add the new `.choose-items-select` shell rule: `display: grid; grid-template-columns: auto 1fr; align-items: stretch; column-gap: 12px; padding: 0 14px; cursor: pointer; position: relative;` (outer grid per design.md D1; `position: relative` enables the absolute-positioned badges overlay per D5).
- [x] 2.3 Add the sr-only override for the inner `<CheckboxField>` `<span>`: `.choose-items-select .checkbox_field > span { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }` (per design.md D2 final).
- [x] 2.4 Adjust the inner `<CheckboxField>` `<label>` to render compactly in the picker leading slot: `.choose-items-select .checkbox_field { padding: 0; min-height: unset; display: flex; align-items: center; justify-content: center; }` — this overrides the form-field-system 44×44 floor inside the picker because the _outer_ `<label>` (the `.choose-items-select` wrapper) provides the 44×44 click target via the full row. Add a comment in `list.css` documenting this override and citing the design.md D2 reasoning. If form-field-system spec review rejects this override, fall back to keeping the 44×44 inner box and adjusting the leading column width.
- [x] 2.5 Add `.choose-items-select.is-on { background-color: var(--card-accent-background-color); }` (port from today's `.choose-items-row.is-on`).
- [x] 2.6 Add `.choose-items-select.is-removing { background-color: var(--secondary-background-color); }` (per design.md D6 Option A — reuse, no new token).
- [x] 2.7 Add `.choose-items-select.is-removing .itemName { text-decoration: line-through; color: var(--muted-text-color); }` (replaces today's `.choose-items-name.is-strike` — applied via CSS reaching into `<Item>`'s `.itemName` class per design.md D5; add a comment noting the page-scoped cross-boundary coupling).
- [x] 2.8 Add `.choose-items-badges { position: absolute; top: 8px; right: 12px; display: inline-flex; gap: 6px; pointer-events: none; }` for the IN LIST + archived badges overlay (per design.md D5 Option A). Pointer-events disabled so the badges don't intercept label clicks. Note: at OQ1 resolution time, consider whether badges should sit inline near the name instead.
- [x] 2.9 Add `:focus-visible` ring on the inner checkbox via `.choose-items-select .checkbox_field_box:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }`. If form-field-system already provides this on `.checkbox_field_box:focus-visible` globally, this is a no-op — verify and skip.
- [ ] 2.10 Smoke-check: load `/lists/[ownedId]/choose-items` in dev with `AUTH_BYPASS=true` and seeded data. The old `.choose-items-row` JSX is still in place; the new `.choose-items-select` rules are unused. Page should render identically to before. Confirms additive-only CSS step.

## 3. JSX rewrite in ChooseItemsForm.tsx

- [x] 3.1 Import `<Item />` from `@/app/(main)/items/ui/components/Item` and `<CheckboxField />` from `@/app/ui/components/field/CheckboxField` at the top of `app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx`.
- [x] 3.2 Replace the `<ul className="choose-items-list">` body. New shape per row (inside the existing `filtered.map((item) => {...})`):

  ```tsx
  const checkboxId = `choose-item-${item.id}`;
  return (
    <li key={item.id}>
      <label
        htmlFor={checkboxId}
        className={`choose-items-select${isSelected ? ' is-on' : ''}${removing ? ' is-removing' : ''}`}
      >
        <CheckboxField
          id={checkboxId}
          label={item.name ?? ''}
          checked={isSelected}
          onChange={() => toggle(item.id)}
        />
        <Item item={item} preview />
        {(wasIn && isSelected) || isArchived ? (
          <span className="choose-items-badges">
            {wasIn && isSelected && (
              <span className="choose-items-in-badge">In list</span>
            )}
            {isArchived && (
              <span className="choose-items-archived-badge">archived</span>
            )}
          </span>
        ) : null}
      </label>
    </li>
  );
  ```

  Remove the surrounding `<button>` element, the inner `.choose-items-cb` `<span>` with the conditional `<svg>`, the inline `<img>`/empty-thumb, the `.choose-items-main` / `.choose-items-name` / `.choose-items-description` / `.choose-items-from` / `.choose-items-chips` / `.choose-items-chip*` / `.choose-items-right` / `.choose-items-price*` / `.choose-items-stores-count` markup, and the `e.stopPropagation()` on the chip's `onClick`.

- [x] 3.3 Remove the now-unused `compareItems`, `displayPrice`, `primaryStore`, `price` local references inside the row (some may still be needed for the filter/sort logic — leave the top-level `useMemo` calls intact; just don't reference them inside the per-row JSX since `<Item>` reads them off the item).
- [x] 3.4 Verify `ItemDisplay` (the type of each `item` in `filtered`) is compatible with `<Item>`'s expected `item` prop. Both should resolve to the same `ItemDisplay` from `@/lib/types`. If shapes differ, document the gap; do not silently coerce.
- [ ] 3.5 Smoke-test in dev: load `/lists/[ownedId]/choose-items` at desktop (1400×900). Rows should render with the shared 5-col grid + leading checkbox. Click a row anywhere — selection should toggle. Click a buy-link chip — should open the store in a new tab without toggling selection. Confirm the "IN LIST" and "archived" badges render in the top-right of pre-selected / archived rows.

## 4. CSS — delete the obsolete .choose-items-row family

- [x] 4.1 In `app/(main)/lists/ui/styles/list.css`, delete the entire `.choose-items-row { ... }` rule (the base desktop grid).
- [x] 4.2 Delete `.choose-items-row:hover`, `.choose-items-row.is-on`, `.choose-items-row.is-removing`.
- [x] 4.3 Delete the `@media (max-width: 599px) { .choose-items-list > li { ... } .choose-items-row { ... } .choose-items-row:hover { ... } .choose-items-thumb, .choose-items-thumb-empty { ... } }` block.
- [x] 4.4 Delete `.choose-items-cb`, `.choose-items-cb.is-on`, `.choose-items-cb.is-removing`.
- [x] 4.5 Delete `.choose-items-thumb`, `.choose-items-thumb-empty`.
- [x] 4.6 Delete `.choose-items-main`.
- [x] 4.7 Delete `.choose-items-name`, `.choose-items-name.is-strike`.
- [x] 4.8 Delete `.choose-items-from`.
- [x] 4.9 Delete `.choose-items-description`.
- [x] 4.10 Delete `.choose-items-chips`, `.choose-items-chip`, `.choose-items-chip:hover`, `.choose-items-chip-static`.
- [x] 4.11 Delete `.choose-items-right`, `.choose-items-price`, `.choose-items-price.is-muted`, `.choose-items-stores-count`.
- [x] 4.12 Delete the `@media (max-width: 500px) { .choose-items-row { ... } .choose-items-thumb { ... } .choose-items-from { display: none; } }` block.
- [ ] 4.13 Re-verify in preview: page should look identical to step 3.5 (the CSS deletions affect rules that no JSX is using anymore).

## 5. Verification — identity-of-render against the items library

- [ ] 5.1 In dev preview at 1400×900, load `/items?view=list` and `/lists/[ownedId]/choose-items` side by side (or as separate snapshots). Pick the same item that appears in both. Use `preview_inspect` to compare:
  - The inner `.item-container.preview` element's class list (choose-items adds `.preview`; items library does not — this is the expected single difference).
  - The computed `grid-template-columns` on `.item-container` — both SHALL resolve to `52px 1fr auto auto auto` (or equivalent computed value).
  - The image (`.item-image-container`) computed size — both SHALL be 52×52 with 8px border-radius.
  - The name (`.itemName`) typography — same font, size, color.
  - The buy-link chip layout — both SHALL render the primary as `<LinkButton class="storeLinks-link">` and (when extras present) the `+N` trigger as `<Button class="storeLinks-more">`.
- [ ] 5.2 Repeat at 393×852 (mobile): both surfaces SHALL render the M1 horizontal-card reflow with image upper-left, name+price stacked right, description full-width row 3, store-chip + actions row 4. The choose-items row adds the leading checkbox column; items library does not — this is the expected single difference.
- [ ] 5.3 Repeat at 380×800 (well below 400): confirm the `.preview .item-owner-actions-mobile` rule from §2.1 hides the kebab on the picker row (the picker viewer is the item owner, so without this rule the kebab would render). Confirm the items library list view at 380px shows its kebab as expected (kebab is correct there; the picker doesn't need it).
- [ ] 5.4 Click a buy-link chip on a picker row at desktop and mobile. Should open the store in a new tab. Row's selection state SHALL NOT change.
- [ ] 5.5 Click a `+N` trigger on a picker row with 2+ stores. The `<Menu>` popover SHALL open per the `item-store-links` capability's contract (hover-open with 220ms grace, click-toggle, Escape closes, arrow-key navigation between menu items).
- [ ] 5.6 Tab through the page with keyboard. Each row's checkbox SHALL receive focus with a visible `:focus-visible` ring. Space toggles selection. Enter on the buy-link chip opens the store.
- [ ] 5.7 Snapshot every selection state on a single row: unchecked (fresh), checked (was-in-list), checked (newly-added), unchecked (removing-from-list). Confirm:
  - Fresh: no background tint, no badge.
  - In-list (checked + wasIn): `.is-on` background tint + "In list" badge top-right.
  - Newly-added (checked + !wasIn): `.is-on` background tint, no badge.
  - Removing (unchecked + wasIn): `.is-removing` background tint + strike-through on the rendered item name.

## 6. Verification — page behavior unchanged

- [ ] 6.1 Toolbar URL params: type in search → URL gains `?q=...`; pick a sort → `?sort=...`; toggle Show → `?show=...`; pick stores → repeated `?store=...`; set price → `?price_min`/`?price_max`. Filtered/sorted set updates client-side. All existing behavior preserved (no server-side re-fetch).
- [ ] 6.2 Selection preservation across filter changes: check 3 rows, change `show` filter, change back. The 3 should still be checked.
- [ ] 6.3 Change-tracking footer: add 2 rows, remove 1 currently-on-list row. Count text reads "N items selected · +2 added · −1 removed · Undo". Click Undo → selection resets to initial. Re-toggle 2 rows. Click Save changes → toast, redirect to `/lists/[id]`, list reflects the new membership.
- [ ] 6.4 Empty library: temporarily filter `show=on` against a list with no items to surface the empty-state. Confirm "Create new item" CTA renders and opens the item-form modal.
- [ ] 6.5 No-op save: revert all changes, click Save. Button disabled or action is a no-op (per `list-item-management` "No-op save" scenario). No DB writes.
- [ ] 6.6 Create new item from inside choose-items: click "+ Create new item" → item-form V2 split-pane opens. Create a fresh item. Modal closes. New item appears in the picker, unchecked (additive UX, not auto-selected).
- [ ] 6.7 Back / Skip on `?new=1`: load `/lists/[newId]/choose-items?new=1`. Save copy reads "Add N items to list →" / "Skip" (per `list-item-management` "Post-create redirect" scenario). Behavior unchanged.

## 7. Token sweep + grep verification

- [x] 7.1 Grep the repo for `#fff5f5`, `#fee2e2`, `#f87171`. Confirm zero matches in `app/(main)/lists/ui/styles/list.css` (they only existed on rules deleted in §4). Other unrelated usages (if any) are out of scope.
- [x] 7.2 Grep for `.choose-items-row`, `.choose-items-cb`, `.choose-items-thumb`, `.choose-items-thumb-empty`, `.choose-items-main`, `.choose-items-name`, `.choose-items-from`, `.choose-items-description`, `.choose-items-chips`, `.choose-items-chip`, `.choose-items-chip-static`, `.choose-items-right`, `.choose-items-price`, `.choose-items-stores-count`. Confirm zero matches across `app/**/*.{tsx,css}`.
- [x] 7.3 Grep for `e.stopPropagation()` in `ChooseItemsForm.tsx`. Confirm zero matches (the chip's stopPropagation is gone; native label-input semantics handle the click distribution).
- [x] 7.4 Grep for `aria-pressed` in `ChooseItemsForm.tsx`. Confirm zero matches (the row no longer is a `<button aria-pressed>`).

## 8. Type-check + lint

- [x] 8.1 `npx tsc --noEmit` passes.
- [x] 8.2 `npm run lint` introduces zero new errors/warnings. Pre-existing errors in unrelated files (e.g., `app/api/image-search/route.ts`) are not blockers.

## 9. AT smoke test (OQ2 resolution)

- [ ] 9.1 On macOS Safari with VoiceOver enabled, tab to a picker row. Confirm the announcement reads "checkbox, <item name>, not checked" (or similar). Space toggles. The label-input nesting SHALL NOT cause duplicate name announcement.
- [ ] 9.2 If VoiceOver duplicates the item name (e.g., announces the row label and the checkbox label both), fall back to design.md D2 Revision: change the outer `<label htmlFor>` to a `<div onClick>` (loses native label-input toggle but eliminates nested-label structure). Update tasks.md and re-verify.
- [ ] 9.3 Spot-check with NVDA on Windows Firefox if available; document any divergence.

## 10. Resolve open questions

- [ ] 10.1 OQ1 (badge placement — top-right overlay vs inline near name). Implement both in a local branch, capture screenshots, pick one. Default per design.md D5 Option A is top-right overlay; revisit if the row reads awkwardly.
- [ ] 10.2 OQ2 (nested-label AT announcement). Resolved by §9.
- [ ] 10.3 OQ3 (`--remove-bg` token vs reuse `--secondary-background-color`). Default per design.md D6 Option A is reuse. If visual review at §5.7 finds the removing state insufficiently distinct, introduce `--remove-bg: #fff5f5;` in `app/ui/styles/global.css` and swap the modifier rule.

## 11. Archive prep

- [x] 11.1 Confirm `openspec validate consolidate-row-layouts` passes.
- [x] 11.2 Confirm the active `item-store-links` spec's "Note (deferred)" paragraph naming this change as the resolution is removed in the spec delta (verify the MODIFIED requirement in `specs/item-store-links/spec.md` does not carry the deferred-note paragraph forward — it should not).
- [ ] 11.3 PR description references this change as the resolution of the §13 deferred note in `replace-storelinks-expand-with-popover`. Cross-link the archived change's tasks.md §13 anchor.
- [ ] 11.4 Archive via `/opsx:archive consolidate-row-layouts` once merged.
