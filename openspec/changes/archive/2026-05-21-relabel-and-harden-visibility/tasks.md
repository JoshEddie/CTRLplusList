## 1. Menu-system primitive extension

- [x] 1.1 Add `MenuItemRadio.tsx` at `app/ui/components/menu/MenuItemRadio.tsx` rendering `<button type="button" role="menuitemradio">` with props `icon`, `description`, `checked`, `onSelect`, plus standard `disabled` / `aria-label` passthroughs. Render `aria-checked={checked}` and a trailing `✓` indicator when `checked`.
- [x] 1.2 Add the radio-row CSS to `app/ui/components/menu/menu.css` (or wherever menu rows live today — verify by `ls app/ui/components/menu/`). Consume the existing menu-row tokens for height, padding, icon alignment, hover, focus-visible. Add a `.menu-item-radio__indicator` rule for the trailing `✓` and a `.menu-item-radio__description` rule for the supporting line.
- [x] 1.3 Export `MenuItemRadio` from the menu barrel (`app/ui/components/menu/index.ts` if it exists).
- [x] 1.4 Update `Menu.tsx`'s arrow-key navigation selector if it currently targets only `[role="menuitem"]` — broaden to `[role^="menuitem"]` so `menuitemradio` rows participate. Verify by tabbing through a mixed-row menu in dev.
- [x] 1.5 Add a Storybook-style smoke test or dev page snippet (whatever the project's convention is) showing `<MenuItemRadio>` with `checked` true/false alongside `<MenuItem>` to verify visual parity. If the project has no such convention, skip this and verify in the visibility-picker integration instead.

## 2. VisibilityPicker rewrite

- [x] 2.1 Open `app/(main)/lists/ui/components/VisibilityPicker.tsx`. Replace the body of the popover (currently `<SegmentedControl>` + conditional `<CheckboxField>`) with a `<Menu>` containing three `<MenuItemRadio>` rows.
- [x] 2.2 Define the three row configs (an array of `{ value: Visibility, icon, label, description }`) — labels and descriptions per the spec: Just me / 🔒 / "Only you can see this list"; Private / 🔗 / "Anyone with the link can view"; Shared / 👥 / "Visible to your followers". Map activation → existing `apply(next)` helper. The early-return for `next === current` already exists.
- [x] 2.3 Update the `pillLabel(v)` function to return the single-word label (`"Just me"` / `"Private"` / `"Shared"`) with no `·`-qualifier. The icon comes from `StatusIcon` (already 3-way correct).
- [x] 2.4 Update the trigger's `aria-label` to include the per-row description (e.g. `` `Visibility: ${pillLabel(current)} — ${describe(current)}. Click to change.` ``). Keep the visible label as just the noun.
- [x] 2.5 Update the `describe(v)` toast copy: `'private'` → `"List is now just me"`; `'unlisted'` → `"Anyone with the link can view"` (unchanged); `'public'` → `"Visible to your followers"` (unchanged).
- [x] 2.6 Remove the now-unused `setShared` and `setInFeed` helpers and the imports for `SegmentedControl`, `SegmentedOption`, and `CheckboxField`. Replace `FaShareAlt` import path if needed (still used by `StatusIcon`).
- [x] 2.7 Drop the `.visibility-picker-popover`-scoped CSS that styled the segmented control + checkbox combo from `app/(main)/lists/ui/styles/list.css`. The popover container styles (positioning, shadow, surface) stay; the inner layout rules go.

## 3. ShareButton modal copy

- [x] 3.1 In `app/(main)/lists/ui/components/ShareButton.tsx`, update `Modal`'s `primary_text` from `"This list is private."` to `"This list is just me."`
- [x] 3.2 Update `secondary_text` from the current "make it public" phrasing to: `"No one can view it unless you make it private (link-only). Make private and share?"` (or similar — the goal is to match the new vocabulary; the action behind the button still calls `setListVisibility(list.id, 'unlisted')` so the copy should say "private," not "public").
- [x] 3.3 Update `primary_button_text` from `"Make public & share"` to `"Make private & share"`.
- [x] 3.4 Verify by running through the flow in the dev preview (start a server with `AUTH_BYPASS=true`, navigate to a seeded `'private'` list as its owner, click Share List, confirm the modal copy reads correctly).

## 4. Metadata crawler contract

- [x] 4.1 In `app/(main)/lists/[id]/page.tsx`, rewrite `generateMetadata`:
  - Resolve session via `auth()` and viewer id via `getUserIdByEmail` (mirror what `ListPage` does, but inside the metadata function — Next allows this).
  - Fetch the list with `getList(id)`.
  - If `list` is null or fetch throws: return `{ title: 'List | ctrl+list', robots: { index: false, follow: false } }`.
  - If `list.visibility === 'public'`: return full metadata as today (title, openGraph, twitter blocks). No `robots` override (page is indexable).
  - If `list.visibility !== 'public'` AND viewer is owner: return full metadata as today (title, openGraph, twitter blocks) PLUS `robots: { index: false, follow: false }`.
  - If `list.visibility !== 'public'` AND viewer is NOT owner (including unauthenticated): return `{ title: 'List | ctrl+list', robots: { index: false, follow: false } }` — no `openGraph`, no `twitter`.
- [x] 4.2 Verify by curling the dev server for a seeded private list and grepping the response HTML for the list name and `noindex`. The list name must NOT appear in `<title>` or `og:title`; the `noindex` directive must appear.
- [x] 4.3 Verify the owner-self-view case by hitting the same URL with the `AUTH_BYPASS=true` session as the list's owner — confirm full metadata is returned AND `noindex` is still emitted (this is intentional; owner views also noindex, since the URL is shareable and shouldn't be indexed regardless of viewer).
- [x] 4.4 Verify the public-list case still emits full metadata with no `noindex` directive (regression check).

## 5. Spec deltas (in-flight only; archived at apply-archive time)

- [x] 5.1 Verify both delta specs render the intended diff against the active specs by running `openspec diff --change relabel-and-harden-visibility` (or whatever the project's preview command is). Confirm the `list-visibility` MODIFIED requirement matches the existing header text exactly so the rename / replace is recognized.

## 6. Regression sweep

- [x] 6.1 Grep `app/` for any lingering uses of the words `"Share List"`, `"Show in followers' feed"`, `"Make public & share"`, or `"in feed"` and reconcile them with the new vocabulary. The Share List button label itself stays (only the modal copy changes).
- [x] 6.2 Grep `app/` for `SegmentedControl` to confirm the visibility picker is no longer the only consumer; if it's the last consumer, surface a follow-up about archiving `segmented-control-system` — do NOT delete in this change (out of scope; other surfaces may still want it).
- [x] 6.3 Verify the home digest and the My Lists page still render private/unlisted/public lists' tiles correctly (no metadata-related layout change should affect them, but a sanity check after touching `generateMetadata` is cheap).
- [x] 6.4 Verify the `ListPrivate` interstitial still renders for non-owners hitting a `'private'` list URL — the body-level gating in `page.tsx:69-71` is unchanged but should be re-confirmed since the metadata path changed alongside.

## 7. Apply-archive readiness

- [x] 7.1 Run `tsc --noEmit` (or the project's typecheck script). Zero errors.
- [x] 7.2 Run the project's lint script. Zero new warnings introduced by this change.
- [x] 7.3 Run any visibility-related tests that exist (`grep -rn "visibility" __tests__/ tests/ 2>/dev/null`). All pass.
- [x] 7.4 Confirm `openspec status --change relabel-and-harden-visibility` reports complete and the change is ready for archive.
