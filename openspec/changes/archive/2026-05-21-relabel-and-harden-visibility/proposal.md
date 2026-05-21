## Why

The list-visibility picker is structurally and linguistically misleading, and the privacy contract it advertises is not enforced against crawlers.

**Structural mismatch.** The data model is a 3-state enum (`'private' | 'unlisted' | 'public'`), but the UI is a 2-state segmented toggle (Private / Shared) plus a conditional checkbox ("Show in followers' feed") that vanishes when Private is selected. The current spec ([openspec/specs/list-visibility/spec.md:49](openspec/specs/list-visibility/spec.md:49)) mandates this shape and even hand-codes the "Shared → Private clears the feed bit" behavior — meaning the "two axes" the UI implies are not actually independent. The popover is a 3-state machine pretending to be 2 + 1.

**Linguistic mismatch.** The label **Shared** is spent on `'unlisted'`, forcing the `'public'` state to wear a qualifier ("Shared · in feed"). In a followers-and-friends app (no search-stranger discoverability), the cleaner mental model is concentric circles: just me → people I gave the link to → my followers. Relabel as **Just me / Private / Shared** removes the qualifier and the word "Shared" describes broadcast-to-community, which is what `'public'` actually is.

**Contract gap.** Today there is no `robots.txt`, no `sitemap.ts`, and no `noindex` meta on any list page (verified by repo-wide grep). Combined with `generateMetadata` in [app/(main)/lists/[id]/page.tsx:16-44](app/(main)/lists/[id]/page.tsx:16) emitting a real `<title>` and OG card for **every** list ID regardless of visibility, a private or link-only list whose URL leaks into the crawlable web (link unfurler, referrer, browser sync) can be indexed by Google with its name visible in the page metadata even though the body is gated. The relabel raises the stakes: a state called "Private" must actually be private to crawlers, not just to in-app non-owners.

This change relabels the visibility UI, restructures the picker as a flat three-item radio menu, and adds the crawler-indexing controls that the new labels promise.

## What Changes

### UI relabel + restructure (modifies `list-visibility`)

- Replace the Private/Shared segmented control + conditional feed checkbox with **three flat menu items** in the visibility popover:
  - 🔒 **Just me** — only I can see this list (maps to `'private'`)
  - 🔗 **Private** — anyone with the link can view (maps to `'unlisted'`)
  - 👥 **Shared** — visible to your followers (maps to `'public'`)
- Each item carries icon + label + one-line description; the selected item shows a `✓` at right.
- The trigger pill label becomes the selected item's single word (`Just me` / `Private` / `Shared`) with no `·`-qualifier; the icon disambiguates state.
- Update [ShareButton.tsx:91-95](app/(main)/lists/ui/components/ShareButton.tsx:91) modal copy: "This list is just me. Make private & share?" (today says "make it public" but actually sets `'unlisted'` — current copy is wrong; relabel fixes it).
- The toast copy in [VisibilityPicker.tsx:18-27](app/(main)/lists/ui/components/VisibilityPicker.tsx:18) updates to "List is now just me" / "Anyone with the link can view" / "Visible to your followers".

### Crawler contract (adds to `list-visibility`)

- **All** list pages SHALL be served with `<meta name="robots" content="noindex, nofollow">`, regardless of `visibility`. The product has no stranger-discoverability mode: `'public'` (Shared) broadcasts to *followers within the app*, `'unlisted'` (Private) is link-only, and `'private'` (Just me) is owner-only — none of these are intended to be findable via web search.
- `generateMetadata` SHALL return a generic title (e.g. `"List"`) and omit OG image fields for non-public lists viewed by non-owners, so the list name does not leak in head metadata to link unfurlers (which may not honor `noindex`). Owners viewing their own list keep full metadata (so their own social shares still card-up correctly when they paste their own link). `'public'` (Shared) lists serve full metadata to all viewers — the owner has deliberately broadcast it — but the page is still noindex.
- The `lists.id` (nanoid, ~126 bits) remains the unguessability primitive; no robots.txt or sitemap entries are added in this change (lists are not in any sitemap today and won't be added).

### Primitive extension (modifies `menu-system`)

- Add `<MenuItemRadio>` as a sibling to `<MenuItem>` / `<MenuLinkItem>`. Same visual contract (icon + label, row height, hover, focus-visible), but renders `role="menuitemradio"` with `aria-checked` reflecting selection. A `<MenuItemRadio>` selected state SHALL render a trailing `✓` indicator.
- This is required because the current `<MenuItem>` is action-tier (`role="menuitem"`, fires-and-forgets); a visibility picker is "pick one of N" and needs the radio ARIA semantics.

### Not changing

- The underlying `visibility` enum stays `'private' | 'unlisted' | 'public'` — this is a label and UI change, not a data migration.
- `shared_at` semantics ([list-visibility#shared_at](openspec/specs/list-visibility/spec.md:25)) are unchanged.
- The `setListVisibility` action signature and the `lists.shared` dual-write contract are unchanged.
- `setListVisibility` continues to be the only mutation path; cache tag `lists` and `home-rails` (consumed by the home digest) revalidate as they do today via the action's existing `revalidateTag` calls.

## Capabilities

### New Capabilities

- *(none)*

### Modified Capabilities

- `list-visibility`: The UI requirement that prescribes a "two-state toggle plus feed checkbox" ([spec.md:49](openspec/specs/list-visibility/spec.md:49)) is rewritten to mandate the three-item radio-menu shape with the new labels. A new requirement is added covering the crawler-indexing contract (noindex + metadata gating for non-public lists).
- `menu-system`: A new `<MenuItemRadio>` primitive is added as a sibling to `<MenuItem>` and `<MenuLinkItem>` (page-scoped radio rows are not an acceptable workaround per the cross-cutting design-systems rule).

## Impact

### Routes
- [app/(main)/lists/[id]/page.tsx](app/(main)/lists/[id]/page.tsx) — `generateMetadata` becomes visibility-aware (and viewer-aware: owners viewing their own list keep full metadata). Emits `robots: { index: false, follow: false }` for non-public.

### Components
- [app/(main)/lists/ui/components/VisibilityPicker.tsx](app/(main)/lists/ui/components/VisibilityPicker.tsx) — rewritten. Drops `<SegmentedControl>` and `<CheckboxField>` consumption; consumes `<Menu>` + `<MenuItemRadio>` from menu-system. Toast copy updated.
- [app/(main)/lists/ui/components/ShareButton.tsx](app/(main)/lists/ui/components/ShareButton.tsx) — modal `primary_text` / `secondary_text` updated to match new vocabulary; `primary_button_text` becomes "Make private & share".
- *New:* `app/ui/components/menu/MenuItemRadio.tsx` (component) and CSS additions in `app/ui/components/menu/menu.css` for the `✓` indicator and selected state.

### Styles
- [app/(main)/lists/ui/styles/list.css](app/(main)/lists/ui/styles/list.css) — drop the `.visibility-picker-popover`-scoped rules that styled the segmented control + checkbox combo; layout becomes the standard `<Menu>` popover.
- `app/ui/components/menu/menu.css` — add `.menu-item-radio` rules consuming existing menu-row tokens.

### Server actions
- `setListVisibility` in `app/actions/lists.ts` — **no signature change.** The action already accepts all three enum values; the UI just stops gating which transitions are reachable.

### Cache freshness
- Reads affected: `getList` in [lib/dal.ts:87](lib/dal.ts:87) (tag `lists`). Already revalidated by `setListVisibility` via `revalidateTag('lists')` — no new tag wiring needed.
- The new metadata gating in `generateMetadata` consumes the same `getList` call (no new read).

### Spec deltas
- `openspec/specs/list-visibility/spec.md` — rewrite the UI requirement (line 49 block); add a new "Non-public lists SHALL be marked noindex and SHALL NOT leak names in metadata to non-owners" requirement.
- `openspec/specs/menu-system/spec.md` — add a `<MenuItemRadio>` requirement block as a sibling of the existing `MenuItem` / `MenuLinkItem` requirements.

### Migration / data
- *None.* No schema change, no row migration, no backfill.
