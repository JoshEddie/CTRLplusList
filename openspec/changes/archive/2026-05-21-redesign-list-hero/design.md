## Context

The list-detail hero at `/lists/[id]` is rendered by [ListDetails.tsx](<app/(main)/lists/ui/components/ListDetails.tsx>) and styled by [app/(main)/lists/ui/styles/list.css](<app/(main)/lists/ui/styles/list.css>). Today's structure is a single column inside one full-bleed purple gradient band:

1. Optional preview banner (owner-in-preview-mode)
2. `.list-hero-row` (flex row containing `.list-hero-info` on the left and the owner-only `.list-hero-side` visibility picker on the right)
3. `.list-hero-actions` (action row below)

Owner views fill the right rail with the visibility picker (segmented + feed-toggle checkbox, ~260px wide). Viewer views leave that rail empty. The viewer empty-right is the most visible composition flaw.

The in-flight `refine-list-hero-readability` change introduced the `list-hero-header` capability and patched contrast / sizing / right-aligned-action-row but kept the underlying single-column shape. This change abandons that shape entirely and replaces the capability's contents.

Binding upstream constraints (verified, see proposal):

- `following`: Follow button stays in a byline sub-row colocated with the linked owner name on viewer views.
- `list-visibility`: Private/Shared binary + "Show in followers' feed" checkbox composition is normative.
- `popover-trigger-system`: `<PopoverTrigger>` is the only correct primitive for the status pill; no variants.
- `redesign-home-and-tokens`: explicitly defers list-hero mobile compression to this change.
- `standardize-form-fields`: the on-dark `<CheckboxField>` override stays page-scoped.

Avatar source priority (locked in pre-proposal discussion): `users.image` (which is what Google OAuth populates — Google fills in a generated initials avatar URL when the user has no real image) → our own initials chip if that field is null. Both fallbacks exist; ours is a defense-in-depth cover for Google ever returning null.

Share behavior (locked): desktop = one-tap copy URL. Mobile = native share sheet via `navigator.share`. Single action, no dialog.

## Goals / Non-Goals

**Goals:**

- The hero composition reads as two distinct cards on desktop: list identity (left) and people-plus-controls (right). The white surface separates them; the gradient is contained inside the cards.
- Equal final card heights at all states. The left card uses `justify-content: space-between` so its interior absorbs height delta from the right card.
- Owner views remove the redundant self-identity block entirely. Right strip is pure controls.
- Viewer views anchor on the owner with a real avatar (36px) and keep Follow next to the name per `following`.
- Visibility picker shrinks to a status pill (`<PopoverTrigger>`) — full segmented + checkbox lives in the popover body, behavior unchanged.
- Eyebrow above title replaces the inline occasion chip — same visual vocabulary, better placement.
- Hero footer line ("_N_ items · updated _X_ ago") gives a free glance-fact at no DAL cost.
- All text in the hero meets WCAG 2.1 AA contrast — as a natural consequence of card layout (gradient under text is more controlled), not a separate floor requirement.
- Mobile (< 800px) stacks the two cards vertically with a hairline divider; action pairs go 50/50 full-width.

**Non-Goals:**

- No new design-system primitives. (Avatar is a co-located component, not a primitive yet.)
- No changes to `following`, `list-visibility`, or any cross-cutting primitive spec. We _use_ them, we don't modify them.
- No new server-side reads, new cache tags, or DAL changes.
- No new Token in `global.css` unless an existing token can't carry the value. Eyebrow color, hairline color, and card gradient all map to existing tokens.
- No copy changes (button labels, status labels) beyond what's mechanically required by repositioning.
- No reskin of the items grid or toolbar below the hero. That's a separate surface.
- No animation. If a future change wants the popover open animation or the avatar hover, that's separate scope.

## Decisions

### Decision 1: Single gradient panel with two-zone composition (no inter-zone divider)

The hero renders as ONE continuous gradient panel containing two semantic zones: identity (left) and controls (right). The two-role affordance is carried by the typographic composition — left zone is typography (eyebrow, title, subtitle, footer), right zone is controls (buttons, status pill). No visible vertical divider separates them. At <800px the row collapses to a column with a single horizontal hairline above the controls zone.

```
.list-hero
├── (preview banner, if previewMode)
└── .list-hero-grid (flex row ≥800, flex column <800, gradient on this container)
     ├── .list-hero-card-identity      ← transparent zone
     │    ├── .list-hero-identity-top  ← eyebrow + title + subtitle
     │    └── .list-hero-identity-foot ← "N items · updated 2d ago"
     └── .list-hero-card-controls      ← transparent zone
          ├── (owner) Share + status pill
          ├── (viewer) avatar + name + Follow
          ├── hairline divider (intra-zone, between primary and secondary)
          └── secondary actions
```

**How this decision evolved during implementation:**

1. The first build of this decision used **two adjacent cards with a white-surface gap** between them. Each card carried its own gradient. Rejected on visual review: each card showed its own 0→100% gradient slice, so the lighter edge of the identity card slammed into the darker edge of the controls card across the white gap. The discontinuity read worse than the original full-bleed band.
2. The second build introduced a **single gradient panel + thin vertical divider** between the two zones. Rejected because the divider visually competed with the typography — the affordance "two zones" was already carried by content type alone. The divider added chrome without adding signal.
3. The shipped decision uses a **single gradient panel with no inter-zone divider**. Typography composition alone differentiates the two zones. White-surface separation moved into the page surrounding the hero, not inside it.

**Rationale:** The gradient is a brand identity, not a structural device. Keeping it continuous preserves that identity. The two-role affordance (identity vs. controls) is signaled by what each zone _contains_, not by a chrome separator.

**Alternatives considered and kept rejected:**

- _No gradient at all (concept C from explore)._ Tempting because it eliminates the contrast problem at the source. Rejected because purple is a load-bearing brand element of the surface; removing it makes `/lists/[id]` feel like a different app.
- _Cards on a gradient._ (Outer band keeps gradient; cards are glass on top.) Re-introduces the contrast problem and adds chrome.

### Decision 2: Left card uses `justify-content: space-between`

The left card is a flex column with `justify-content: space-between` — top group anchors to the top edge, footer line anchors to the bottom edge, flex slack absorbs the difference between the left card's content height and whatever the right card's content height requires.

**Rationale:** Right card content varies meaningfully between owner (~120px content) and viewer (~96px content), and may grow in the future (e.g., owner-with-collaborators view). A fixed-height left card would either short the taller right card or leave dead space below the viewer right card. `space-between` is a self-balancing primitive — increase right-card content, the left card's interior grows; both finish at equal height.

**Alternatives considered:**

- _Vertically center left content._ Visually OK but creates a floating-content effect; the footer line ("12 items · updated 2d") reads disconnected from the identity block. Anchoring it to the bottom makes it feel deliberately separate.
- _Match heights via JS measurement._ Imperative, brittle, breaks on viewport changes.
- _Equal padding on both cards, accept asymmetric heights._ Looks broken on the surface — the two cards announce themselves as a pair via their shared geometry, so unequal heights read as a bug, not a deliberate compositional choice.

### Decision 3: Eyebrow above title replaces inline occasion chip

The occasion (e.g. "WEDDING", "BABY SHOWER", "BIRTHDAY") graduates from a small chip wedged into the date row into an eyebrow label _above_ the title. Visual treatment carries forward the current chip's vocabulary — small-caps, 700 weight, letter-spaced, white-on-translucent — so users who know the existing chip recognize the eyebrow as the same affordance.

Eyebrow renders only when `list.occasion` is non-empty.

**Rationale:** Eyebrows are a well-understood typographic pattern for above-title category labels (magazine articles, sections, newspaper subheads). The occasion is a _category_, and putting it above the title matches that mental model. The old chip-in-date-row implicitly read as a tag, which is a weaker signal.

**Alternatives considered:**

- _Display occasion in the prose subtitle line._ Made sense in the explore-mode "sentence as headline" concept (A) but loses out to the keep-current-vocabulary preference the user expressed. Eyebrow keeps the existing chip aesthetic + relocates.
- _Drop the occasion chip entirely._ Free real estate but loses categorical context valuable for navigating multiple shared lists.

### Decision 4: Visibility picker + Share clustered at the top of the identity zone

The owner's visibility picker renders inside `.list-hero-identity-top`, anchored at the top of the identity zone (ABOVE the title) inside a `.list-hero-share-wrapper`. The `<ShareButton>` renders as a sibling of the picker inside that same wrapper, when the list is not private. The wrapper sits above the title; the title and (eyebrow + subtitle) row follow below.

**Placement evolution during implementation:**

1. _Original:_ pill lived inside the controls zone, above a divider, above secondary actions. Created a right-heavy hero (controls had Share + pill + divider + secondary block ≈ 149px stacked) while the identity zone had only short text rows.
2. _Second iteration (mid-implementation, prior to user iteration):_ moved the pill to the identity zone directly BELOW the subtitle. Rebalanced the row counts but pushed an interactive element into the bottom half of the identity zone, away from the visual "this is the list" cluster at the top.
3. _Shipped:_ pill + Share share a wrapper at the TOP of the identity zone, above the title. The picker's status word and the Share affordance both describe what's actively true about the list socially; pairing them above the title makes them read as the list's social-state header rather than ambient controls.

**Why pair Share with the picker (not the controls card):** the Share action is _about_ the list's visibility — sharing requires a non-private state, and pressing Share on a private list promotes it. Clustering Share with the picker makes that coupling explicit and removes the otherwise-redundant primary control from the controls card.

**Picker internals (out of this change's scope):** the picker itself was reworked separately by the `2026-05-21-relabel-and-harden-visibility` change — a three-row radio menu (`Just me` / `Private` / `Shared`) using `<MenuItemRadio>`, not the segmented + checkbox originally specified here. This change only specifies that `<VisibilityPicker>` is consumed at the new placement; its labels, icons, and internals are owned by `list-visibility`.

**Owner action row consequence (Decision 7's shape):** removing Share from the controls card cuts the controls card to two rows: an action row with Edit + kebab, then Choose items below. See Decision 7 for the controls-card composition.

The primitive is extended with a `tone` prop (`'light' | 'on-dark'`, default `'light'`) — see the `popover-trigger-system` spec delta in this change. The `'light'` tone is the existing form-input visual; the `'on-dark'` tone uses translucent white fill + light text + light border, matching the visual language of `<Button variant="on-dark">` and `<SegmentedControl tone="on-dark">`. The status pill uses `tone="on-dark"`.

> **Implementation reveal:** the original spec for `popover-trigger-system` normatively forbade variants. Discovered during implementation that the primitive's form-input default visual treatment is unworkable on the hero's gradient card. Resolved by adding `tone` (not `variant`) as a surface-adaptation prop — same pattern that `segmented-control-system` already uses. Spec modification is in scope for this change rather than a separate sequencing step.

Status pill label resolves from the current `visibility` value:

- `'private'` → label "Private"
- `'unlisted'` → label "Shared"
- `'public'` → label "Shared · in feed"

A small status dot in the pill's left slot color-codes the state (gray = private, white = shared, brand-color = public).

**Rationale:** The full segmented control consumes ~260px of right-rail width permanently for an action owners take rarely (changing visibility is a once-or-twice-a-list decision, not a per-session one). A pill that _summarizes_ the state and _defers_ the controls is the standard discoverability/density trade-off for low-frequency controls. `<PopoverTrigger>` is the primitive built for exactly this pattern; using it costs zero design system work.

**Alternatives considered:**

- _Keep segmented visible, shrink to icons._ Saves some width but loses label legibility; pinned controls for low-frequency actions waste the most valuable rail real estate.
- _Move to a sidebar / settings drawer._ Discoverability hit too large for a setting visible on every load today.

**Trade-off accepted:** Owners click once more to change visibility. Was always-zero-click, now always-one-click. Worth it for the rail space savings.

### Decision 5: Owner identity removed from owner views

Owner views render NO avatar, NO owner name, NO Follow button (there's no one to follow). The right strip on owner views starts directly with the Share action + status pill, hairline, then secondary actions.

**Rationale:** "Alice (you)" on Alice's own list is redundant. The page already says "MY LISTS" in the nav and the list URL is owner-rooted; reinforcing the owner identity inside the list itself adds zero information.

**Alternatives considered:**

- _Keep a small "Owned by you" label._ Affirms ownership but the page surface already does that via the editable affordances; the label would just be visual chrome.
- _Use the owner identity slot for "Owner tools" header._ Section labels for two-button groups are over-structured; the divider does this job.

### Decision 6: Avatar resolution chain

Viewer-view avatar resolves in three tiers:

1. `user.image` from the eager-loaded `user` relation on `getList(id)`. (Google OAuth populates this with either the user's real photo or Google's own initials-avatar URL.)
2. Our own initials chip — first letter of `users.name` on a `--primary-color-light` background, white text. Rendered as a 36px circle, sized to match a real avatar.
3. A generic `<FaUser>` icon on the same circle if `name` is also somehow null (defensive only — `name` is non-null per the auth flow).

A small co-located `<Avatar size={36} src={user.image} name={user.name} />` component owns this. Co-located, not promoted to a design-system primitive yet (per "no new primitives" non-goal).

**Rationale:** Google's auto-generated initials avatar is already a graceful fallback — most users will see a real-ish avatar without us doing any work. Our tier-2 fallback is defense-in-depth: it makes the layout robust to Google returning null or a 404, and it ensures the visual treatment matches when we generate an avatar ourselves (consistent typography and color).

### Decision 7: Share placement differs by role

**Owner view:** Share renders inside the identity zone's `.list-hero-share-wrapper`, paired with the visibility picker (per Decision 4). The controls card carries an Edit + kebab row, then a Choose items button below.

**Viewer view:** Share renders inside `.list-hero-action-row` as a sibling of Bookmark, below the byline group + hairline divider.

**Rationale:** Share's coupling differs by role. For owners, Share's pre-condition is "the list isn't private" — pairing it with the visibility control makes that coupling visible at the source. For viewers, Share is just "spread this URL" — paired with Bookmark as a peer action.

Share's behavior is unchanged: desktop copies URL to clipboard with a toast; mobile invokes `navigator.share`. No dialog, no menu.

### Decision 8: Hero footer line — "N items · updated X ago"

The left card's footer row reads "_N_ items · updated _X_" where:

- _N_ is `items.length` from the items already fetched by the page (no new DAL call).
- _X_ is a relative date string ("2 days ago", "just now", "3 weeks ago") derived from `lists.updated_at`.

Mobile renders this same line as the bottom of the stacked identity card.

**Rationale:** It's a free glance-fact (no new DB query), and it carries useful information for both owners (am I making progress on this list?) and viewers (is this list active or abandoned?). It also serves a structural role: it's the visual anchor for the left card's bottom edge that lets `space-between` work without the card looking content-light.

**Alternatives considered:**

- _Skip the footer line._ `space-between` still works if the top group is the only child — slack just lives below it — but the card reads top-heavy.
- _Owner-only metadata (e.g., "Public · last edited 2d ago")._ Owner views care about visibility, but the status pill already shows that. Item count is genuinely useful to owners (how many items have I added?).

### Decision 9: Gradient lives on the outer `.list-hero-grid`, zones are transparent

The gradient (`var(--hero-gradient)`) is applied to the outer `.list-hero-grid` flex container. Both zone elements (identity card, controls card) are transparent regions inside that single gradient panel.

This is a deliberate change from the earlier "gradient per card" iteration (see Decision 1's evolution). Per-card gradients created a visible color discontinuity at the boundary between the two cards. One gradient instance spanning the full panel reads as continuous brand surface.

**Rationale:** The gradient is a brand identity carrier — it should read as one continuous surface, not as paired panels. Continuity wins over the "two physical objects" framing.

**Trade-off:** Future scaling that puts content under a constrained portion of the gradient (e.g., a third zone) inherits the slice it happens to sit on rather than each zone showing the full spectrum. Acceptable.

### Decision 10: Mobile (<800px) — vertical stack with hairline divider

At < 800px, the two cards stop being side-by-side and stack vertically. The white-surface-gap between them collapses into a hairline divider inside a single combined card. Both halves are still gradient-filled, but they share a unified outer panel (single border-radius, no double-card seam).

```
.list-hero (flex column, <800px) -- single gradient panel
├── .list-hero-identity-top
├── .list-hero-identity-foot
├── (hairline divider — semi-transparent white)
├── (viewer) avatar + name + Follow
├── (owner) Share + status pill
├── secondary actions (full-width 50/50 pairs)
```

**Rationale:** On mobile, the two-card-with-gap visual reads as cramped (each card would shrink dramatically). Merging into one panel with a divider preserves the "two roles" reading without spending pixels on a gap.

Action pairs (Share/Bookmark for viewer; Choose items/Edit for owner) use `flex: 1 1 0` so they split the available width evenly. Kebab drops to its own row at the bottom-right.

**Alternatives considered:**

- _Keep two cards stacked._ Two separate gradient panels stacked feels heavy and dated on a phone screen. The hairline divider keeps the two-roles affordance lighter.
- _Switch to a single-column layout that doesn't visually distinguish the two roles._ Loses the design's main organizing principle.

### Decision 11 (rejected): Promote Avatar to a design-system primitive

Tempting because the nav surface already has a small avatar in the UserMenu trigger. Rejected for this change because:

1. The two usages (nav 24px, hero 36px) have meaningfully different visual treatments — the nav avatar lives next to text, hero avatar is a standalone people-anchor.
2. Promoting to a primitive when we have N=2 callers is premature; the right time is N=3+ with at least two callers needing the same variant.
3. Out of scope per non-goal: "No new design-system primitives."

Decision kept as a flag so a future change that adds a third avatar caller (e.g., feed entries, item-card claim badges) has the prompt to consider primitive extraction.

## Risks / Trade-offs

- **[Risk]** Migrating `VisibilityPicker` into a popover means owners click once more for a common-enough action. → **Mitigation:** the popover-trigger primitive includes keyboard support out of the box (Enter/Space to open, Escape to close, focus return on close); discovery cost minimal.
- **[Risk]** The Avatar component's fallback chain depends on a third-party (Google) URL being live. If Google returns a 404 for the auto-generated initials image, our tier-2 fallback only fires on hard-load fail, not on placeholder degradation. → **Mitigation:** verify with `<img onError>` to swap to tier-2 on load failure; tested by manually invalidating the URL.
- **[Risk]** Two-card layout might feel "boxed" compared to the current full-bleed band. → **Mitigation:** visual review under both states (viewer + owner) at the design-prototype stage before merge; if cards feel disconnected, reduce the gap from ~16px to ~10px.
- **[Risk]** The eyebrow is rendered above the title, so it's the first thing read. For lists without an occasion (rare but possible — `list.occasion` is optional), the title becomes the first line with no eyebrow above it, creating slightly inconsistent vertical positioning between lists. → **Mitigation:** when occasion is empty, the eyebrow slot still reserves ~20px of vertical space so the title's baseline lands at the same position across lists. Or accept the small variation as not-worth-fixing. Decided at implementation.
- **[Trade-off]** Removing the always-visible visibility picker reduces glanceability of "what state is my list in?" — owners now must look at the status pill instead of the highlighted segment. The pill label + status-dot color is designed to remain glanceable, but it's smaller than today's segmented control.
- **[Trade-off]** Item count and updated-date are computed in the page tree and the hero. If list mutations don't bust the right cache tag in the future (or if a future cache-narrowing change misses one), the hero will show stale numbers. Acceptable for now (the current cache invalidation does work via `updateTag('lists')` and `updateTag('items')`), worth flagging as a coupling.

## Migration Plan

Single-PR shipment.

1. Build `<Avatar>` component co-located in `app/(main)/lists/ui/components/Avatar.tsx` (or `app/(main)/users/ui/components/` if the nav usage refactors at the same time).
2. Restructure `ListDetails.tsx` JSX into the two-card layout. Branch on `isOwner` and `previewMode` at the right-card content level.
3. Wrap `VisibilityPicker`'s existing segmented + checkbox in a `<PopoverTrigger>` + popover body. State, server-action, and optimistic-update logic stays in the wrapper — only the outer chrome changes.
4. Rewrite `.list-hero-*` rules in `list.css`. Add `.list-hero-card-identity`, `.list-hero-card-controls`, eyebrow class, footer line class. Strip the old gradient from `.list-hero` outer.
5. Add the hero footer line render (item count + relative-time `updated_at`).
6. Manual walk: dev seed → bypass → render all four states (owner-non-preview, owner-preview, viewer-following, viewer-not-following) at 1440px, 1024px, 800px (just-above + just-below breakpoint), and 390px.
7. Contrast check on all hero text against the actual card gradient pixels.
8. Type check + openspec validate.

Rollback: revert the PR.

## Open Questions

- **Relative-time format granularity.** "2 days ago" vs "2d ago" vs "May 19". Lean toward verbose ("2 days ago") at desktop and short ("2d ago") at mobile — but this is taste. Final call at implementation.
- **Should the status pill show the visibility _icon_ (lock / share-arrow / globe) in addition to the dot?** Adds glanceability. Risks repeating the segmented control's iconography for diminishing returns. Default = dot only; add icon if the visual review shows the pill reading ambiguously.
- **Mobile: where does the kebab live in the owner's action row?** Options: (a) its own row at the bottom-right (current sketch), or (b) inline with Edit (right-justified inside the Edit row). (a) is cleaner at very narrow widths; (b) is denser. Decide at implementation under real phone widths.
- **Eyebrow color treatment.** Stay with white-on-translucent (matches current chip)? Or shift to a brand accent (gold/coral on the gradient)? Default = match current chip, but worth a visual-review look.
