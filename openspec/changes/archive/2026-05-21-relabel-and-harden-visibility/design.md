## Context

Visibility state in Ctrl+List has three values (`'private' | 'unlisted' | 'public'`), but the picker UI ([VisibilityPicker.tsx](app/(main)/lists/ui/components/VisibilityPicker.tsx)) renders a 2-state segmented control plus a conditional checkbox. The current spec ([list-visibility/spec.md:49](openspec/specs/list-visibility/spec.md:49)) explicitly mandates this shape and codifies its quirks ("Shared → Private clears the feed bit"), which is itself a symptom that the "two axes" are not actually independent.

Separately, the privacy contract advertised by the word "Private" is incomplete: list IDs are nanoid (unguessable, ~126 bits) and the route returns a placeholder body for non-owners of private lists, but the page still emits a real `<title>` and OG card for any list ID via `generateMetadata`, and there is no `noindex` meta or robots policy anywhere in the app (verified by grep). A URL that leaks into the crawlable web is one Google fetch away from indexing.

This change does both at once because the relabel makes the contract gap acute. Calling the link-only state "Private" raises user expectations that the page is not indexable — and right now it is. Doing the relabel without the noindex would be lying. Doing the noindex without the relabel is fine but loses the linguistic clarity that triggered the rethink.

Constraints inherited from existing specs:
- [list-visibility#shared_at](openspec/specs/list-visibility/spec.md:25) governs `shared_at` semantics — this change does not touch them.
- [list-visibility](openspec/specs/list-visibility/spec.md:114) mandates the `setListVisibility` dual-write to `lists.shared` — preserved.
- [menu-system](openspec/specs/menu-system/spec.md) governs the `<Menu>` primitive; a new menu row variant is a spec modification, not a page-scoped class.
- [popover-trigger-system](openspec/specs/popover-trigger-system/spec.md) governs `<PopoverTrigger>` — kept; the trigger pill in `VisibilityPicker` continues to use it.

## Goals / Non-Goals

**Goals:**
- Replace the segmented-control + conditional-checkbox picker with a flat three-item radio menu whose shape matches the underlying 3-state enum.
- Relabel the three states as **Just me / Private / Shared** with icons 🔒 / 🔗 / 👥. Drop the `· in feed` qualifier from the trigger pill.
- Enforce the "Private" contract: non-public lists are marked `noindex, nofollow` and their names do not appear in metadata to non-owner viewers (including crawlers).
- Extend `menu-system` with `<MenuItemRadio>` so the picker stays on the standard primitive instead of becoming a page-scoped one-off.
- Fix the now-incorrect modal copy on `ShareButton` while we're in there.

**Non-Goals:**
- No data migration. The enum stays `'private' | 'unlisted' | 'public'`.
- No `robots.txt`, no `sitemap.ts`. Lists are not in any sitemap today; we are not adding them.
- No change to `setListVisibility`'s signature, dual-write contract, or `shared_at` behavior.
- No accessibility overhaul of the segmented control or checkbox primitives (we just stop using them in this picker; they remain in service elsewhere).
- No copy treatment for the "what is this?" tooltip / explainer surfaces beyond the per-row description inside the menu. If users need a "learn more" affordance, that is a separate change.

## Decisions

### Decision 1: Three flat menu items, not a 3-segment segmented control

**Choice:** Render visibility as a `<Menu>` of three `<MenuItemRadio>` rows. The trigger pill remains a `<PopoverTrigger>`.

**Alternatives considered:**

- **3-segment segmented control.** Rejected. A horizontal 3-way segmented control with icon + label gets visually cramped on mobile and the labels truncate. It also loses the per-row description that helps users disambiguate the states; the segmented control is a binary-ish affordance that scales badly past 2.
- **Keep segmented + checkbox, but make the checkbox a third segmented state.** Rejected. Still encodes the misleading "two-axis" mental model, still has a layout-shift problem on the boundary, and the enum is already flat — the UI should match.
- **Native `<select>`.** Rejected. Loses the icon + multi-line description; doesn't compose with `PopoverTrigger`; styling is browser-inconsistent.

**Why the menu wins:**

- The data is a flat 3-state enum; the UI is now isomorphic to it.
- Each option carries its own icon + label + one-line description — no toast-after-the-fact required (today the meaning of each state lives only in the toast message).
- One click between any two states (today: private→public is two clicks).
- Popover content has a stable shape — no conditional checkbox vanishing on the Private → Shared boundary.

### Decision 2: Labels are "Just me / Private / Shared", not "Hidden / Private / Shared" or status quo

**Choice:** The three menu rows are labeled **Just me**, **Private**, **Shared**, mapping to `'private'` / `'unlisted'` / `'public'` respectively.

**Alternatives considered:**

- **Status quo: Private / Shared / Shared · in feed.** Rejected. The word "Shared" is overloaded across two states; the `· in feed` qualifier exists only because the primary label is already spent. Also, in a followers-and-friends app, calling `'unlisted'` "Shared" doesn't match how users think about it ("I shared the link with my sister" is private sharing, not broadcast).
- **Hidden / Private / Shared.** Considered and rejected in favor of "Just me." "Hidden" carries a soft-deleted connotation ("hidden comment", "hidden file"); some users might momentarily wonder whether their data is still there. "Just me" is unambiguous, sounds human, and pairs naturally next to "Private" (limited circle) and "Shared" (community).
- **Just me / Link-only / Followers.** Considered. More descriptive but verbose; the icon already disambiguates link-mediated access; everyday English has a perfectly good word ("Private") for the middle state.
- **Private / Unlisted / Public.** Considered. The conventional triad. Rejected because (a) "Unlisted" is jargon from video platforms that doesn't translate to a wishlist app, and (b) "Public" overpromises discoverability that the app does not provide (no search indexing of feed-broadcast lists by design — `'public'` only surfaces to followers, not strangers).

The relabel also fixes the [ShareButton.tsx:91](app/(main)/lists/ui/components/ShareButton.tsx:91) modal which today says "Make public & share" but actually runs `setListVisibility(id, 'unlisted')` — the old vocabulary couldn't say "make link-only" without inventing a word; the new vocabulary says "Make private & share" which is both shorter and accurate.

### Decision 3: Add `<MenuItemRadio>` to `menu-system` as a sibling primitive

**Choice:** Add a new `<MenuItemRadio>` component to `app/ui/components/menu/` with `role="menuitemradio"` and `aria-checked`. Same visual API as `<MenuItem>` (icon, label, hover/focus tokens) plus a trailing `✓` indicator when selected.

**Alternatives considered:**

- **Reuse `<MenuItem>` with `aria-pressed` or a className.** Rejected. `<MenuItem>` is `role="menuitem"` — action-tier, fires-and-forgets. A radio row needs `role="menuitemradio"` for screen readers to announce it as "X of 3, checked/not checked." This is a real ARIA difference, not a visual variant.
- **Page-scope a `.visibility-radio-row` class on VisibilityPicker.** Rejected by the cross-cutting design-systems rule — interactive surfaces are governed by primitives, not page-scoped overrides.
- **Use native `<input type="radio">` inside `<Menu>`.** Rejected. Mixing form inputs into a menu surface is awkward for screen readers (menu pattern expects `menuitem*` roles) and doesn't compose with `<Menu>`'s arrow-key navigation, which targets elements with `role="menuitem*"`.

`<MenuItemRadio>` lives next to `<MenuItem>` and `<MenuLinkItem>` as a peer; `<Menu>`'s existing arrow-key navigation already targets all three because the selector matches `role^="menuitem"`. (If it doesn't, the menu-system spec's arrow-nav requirement is adjusted accordingly — confirmed in the spec delta.)

### Decision 4: Every list page is noindex; metadata gating is independent

**Choice:** Implement the crawler contract entirely inside `generateMetadata` in [app/(main)/lists/[id]/page.tsx](app/(main)/lists/[id]/page.tsx):
- **All list pages emit `robots: { index: false, follow: false }`**, regardless of `visibility`. The product has no stranger-discoverability mode — `'public'` (Shared) broadcasts to *followers within the app*, not to web search; `'unlisted'` (Private) is link-only; `'private'` (Just me) is owner-only. Calling any of them "indexable" would contradict the labels the user just picked.
- For non-public lists viewed by **non-owners**: return a generic `title: 'List'` and omit `openGraph` / `twitter` fields entirely so the list name does not appear in head metadata (mitigates leaks via link unfurlers that don't honor `noindex`).
- For non-public lists viewed by the **owner**: preserve full metadata. The owner pasting their own list URL into iMessage / Slack should still see the OG card. (NextAuth's `auth()` is available inside `generateMetadata` — same session machinery the page already uses.)
- For `'public'` (Shared): full metadata for everyone — the owner has deliberately broadcast it, link unfurlers should card-up correctly — but the page is still noindex.

**Why every state is noindex (the corrected reasoning):**

An earlier draft of this design left `'public'` indexable on the assumption that "public means findable." Under the new label vocabulary that reading is wrong: **Shared** means "with my followers," not "with the world." The app has no public directory, no search across lists, no Pinterest-style discovery — every visibility state is between the owner and a chosen circle. Letting Google surface a "Shared" list to literal strangers would break the contract the label sets. So all three states are noindex; only the per-state metadata gating differs.

**Alternatives considered:**

- **Add `robots.txt` blocking `/lists/*`.** Rejected. `robots.txt` is a hint, not a prohibition; properly-scoped `<meta robots>` per-page is stronger and survives crawlers that ignore robots.txt.
- **Leave `'public'` indexable.** Rejected (this was the earlier draft). Contradicts the "Shared = with followers" label and gives literal strangers a discovery path the product otherwise doesn't have.
- **Add a `sitemap.ts` listing only public lists.** Considered as a follow-up but out of scope for this change. We are not actively trying to *help* crawlers find lists; we are just stopping them from indexing them. If "Shared" ever genuinely means "discoverable on the web" (a product change, not a labeling change), a sitemap can opt those lists in then.
- **Strip metadata for all non-owners regardless of visibility.** Rejected. `'public'` lists are explicitly designed for broadcast within the followers' feed and via direct link-share; the OG card is part of the share affordance.
- **Show the OG card to owners only.** Considered but flawed — a `'public'` list shared by its owner to a friend who then opens the link should still get a rich preview, because OG cards are rendered server-side based on the crawler's request, not the eventual viewer's identity. The "owner-only metadata" carve-out applies only to *non-public* lists.

### Decision 5: No data or schema migration

**Choice:** The enum values `'private'`, `'unlisted'`, `'public'` stay. The relabel is UI-only.

**Alternatives considered:**

- **Rename the enum values to `'just_me' | 'private' | 'shared'`.** Rejected. It's a Drizzle migration, a `setListVisibility` signature change, dual-write coordination with `lists.shared`, and a follow-up archive change — all to fix labels that the UI maps in 9 lines of code today. The enum is an implementation detail; the labels are the user-facing layer. Keep them separate.
- **Add a `visibility_label` column.** Rejected. Pure overhead; labels belong in code, not data.

### Decision 6: Trigger pill drops the `·` qualifier

**Choice:** The trigger pill label is one of the three menu-row labels verbatim: `Just me` / `Private` / `Shared`. The icon (lock / link / users) disambiguates state without needing a qualifier.

The `aria-label` on the trigger keeps the longer description (e.g. `"Visibility: Private — anyone with the link can view. Click to change."`) so screen readers get the full meaning. The visible label is just the noun.

## Risks / Trade-offs

- **["Just me" reads as informal]** → Some users may expect a more "system" word like "Hidden" or "Private only to me." Mitigation: the icon (🔒) and the per-row description ("Only I can see this list") carry the same meaning; we can revisit if real user feedback shows confusion.

- **["Private" now means link-shareable, contradicting prior label]** → Existing users may have learned that "Private" meant "just me" in the old UI. They may briefly toggle to the new "Private" expecting the same scope. Mitigation: the per-row description in the menu makes the new meaning explicit at the point of choice; toast on change reinforces.

- **[`generateMetadata` now does an `auth()` call]** → Adds a session lookup to the metadata pass. Mitigation: `auth()` and `getList(id)` are both cached/fast; this runs once per request, not per render. Risk is small but real for cold cache.

- **[Owner-viewing-own-private-list metadata exposure via shared link to crawler-pinging service]** → If an owner pastes a private list URL into a tool that pings the URL (e.g. a link preview unfurler that fetches with no auth cookies), the crawler is *not* the owner, so the gating kicks in and the unfurler gets the generic metadata. This is the intended outcome — but it means an owner sharing their own private-list URL via Slack will not get a rich preview. That is the correct behavior for `'private'` (= just me) and `'unlisted'` (= link-only, you control who sees it; you don't want a preview unfurler caching it).

- **[Menu primitive's arrow-key navigation may not target `menuitemradio` rows]** → The existing `<Menu>` arrow-nav requirement ([menu-system#arrow-keys](openspec/specs/menu-system/spec.md:50)) speaks of "`<MenuItem>` / `<MenuLinkItem>` rows." Spec delta will broaden this to include `<MenuItemRadio>` rows; implementation may need to update the selector in `Menu.tsx`. Treated as a small implementation chore, not a risk.

- **[Removing the "in feed" qualifier from the trigger pill makes feed-broadcast less explicit]** → A user glancing at their own list's pill sees `Shared` and may forget that this state specifically broadcasts to followers. Mitigation: the 👥 (users) icon, the menu-row description, and the toast on change all reinforce the broadcast nature. The status quo's `Shared · in feed` was a workaround for the overloaded "Shared" label; with "Shared" now unambiguously meaning broadcast, the qualifier is redundant.

## Open Questions

- *(none — all decisions captured above)*
