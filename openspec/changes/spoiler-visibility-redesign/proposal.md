# Spoiler visibility redesign

Source issue: [#197 — Spoilers generalization: per-viewer cascade](https://github.com/JoshEddie/CTRLplusList/issues/197)
Map: [#181 — Dependents and shared list management](https://github.com/JoshEddie/CTRLplusList/issues/181)

## Why

Spoiler protection today is a single binary owned by one person on one axis: the list owner flips `?spoilers=1` and `sanitizePurchases` swings between "every claim erased" and "every claim, with claimer identity". That model had exactly one protected viewer — the owner — and no storage, because a URL parameter was enough to hold one boolean for one session.

Managed profiles broke both halves of that assumption.

**A protected viewer is now a member, not an owner.** A managed profile's list is run by several humans, some of whom are the recipient of the gifts on it and some of whom are shopping. `isOwner` cannot distinguish them: it is a profile-id equality, and every member of a profile is equally "not the owner" or equally "the owner" depending on which profile they are acting as. `claim-attribution`'s "Owner claim entry and master unclaim SHALL be surfaced only in the spoiler-enabled view" and `list-item-management`'s "Owner without spoilers — the read SHALL return an **empty** purchases array" both bind protection to ownership, and ownership no longer tracks who the surprise is for.

**Inherited constraint — the active profile is the authorization context.** ADR `2026-08-25-the-active-profile-is-the-authorization-context` settles that ownership is equality against the profile the request acts as, with no membership containment; `profiles-data-model`'s "Ownership comparisons SHALL be profile-valued on both sides" makes that normative. With [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) shipped, that rule is live and it has opened a hole the issue's Aug-25 comment anticipated: a human acting as profile A who opens a list owned by profile B — a profile they also run — is a *stranger* to that list, so claims render and the human spoils their own household's gifts. Widening authorization to fix this was considered and rejected, because authorization-by-ambient-attachment would make "acting as" gate nothing.

The split this change carries: **authorization keys off the active profile; spoiler protection keys off the human.** A person cannot be un-spoiled after the fact, so any membership on the owning profile confers protection regardless of who the viewer is currently acting as. `sanitizePurchases` already documents half of this split — it names the viewer by their self-profile while taking `isOwner` from the active profile — so the seam exists and this change completes it.

**One binary cannot express what people actually want.** "Hide everything" and "show everything" are the only two states available, so a recipient who wants to know *that* a third of the list is claimed, without learning *which* items or *by whom*, has no setting between them. The redesign replaces the binary with a graded progression and stores the result per member, which the URL parameter cannot do.

**This is not a security boundary, and the distinction governs every rule below.** A viewer always retains the ability to expose claim information to themselves; what the resolved state protects is against being spoiled *by accident*, not against a viewer who chooses to look. So: **passive surfaces respect the resolved state; anything the viewer actively operates may expose.** Card badges, claimer names, the hero's claimed-count progress, and any action-row label that is itself claim information are passive and governed. The purchase modal and the per-list spoiler control the viewer opens are operated deliberately and are not governed — a viewer who reaches for them has chosen to know, and no gate is owed.

The redesign superseding this issue's original three-level cascade was settled in the 2026-08-31 explore session (issue comment; handoff at `.claude/handoffs/2026-08-31-spoiler-cascade-redesign.md`), and the map body already carries supersession markers on the [#182](https://github.com/JoshEddie/CTRLplusList/issues/182) and [#183](https://github.com/JoshEddie/CTRLplusList/issues/183) gists. The 2026-09-01 List Page mockup then settled the surface: the graded axes collapse into one four-stage progression, the control lives in the list hero rather than the items toolbar, and the who's-been-shopping disclosure is dropped.

## What Changes

### Resolution

- **BREAKING** — spoiler state resolves from **membership**, not from a URL parameter and not from the active profile. A viewer holding any membership on the list's owning profile is protected by that membership's tier, whatever profile they are acting as. A viewer holding none is not protected and sees today's non-owner projection, unchanged.
- The resolved state has **one stored level and one transient one**: a **member baseline** tier, concrete for the membership and spanning every list the profile owns, layered under a **per-list adjustment** that lives only in the page's URL state and dies when the viewer leaves.
- The baseline is written concretely when a membership is created — the creator's at profile birth, everyone else's at invite acceptance — pre-filled from a profile-level default read **live at the moment the invite is opened**. That default is a seed, never a live parent: changing it moves nobody who is already a member, and those move one row at a time.
- **BREAKING** — the `?spoilers=1` list parameter and `/items`' `?purchases=reveal|only` parameter cease to be the spoiler mechanism.
- **BREAKING** — the `purchases=only|none` claim-state filter is removed from the items toolbar on both the list page and the library. Claim visibility is governed solely by the resolved tier; the item set is no longer narrowed by claim state, so a claim filter would be a second, redundant claim-reveal channel the tier already owns.

### A graded progression replaces the binary

The resolved state is a **single tier** — a monotonic progression of four stages, each admitting everything the stage below it admits:

- **Surprise** — nothing. An item is indistinguishable from an unclaimed one and the list discloses no claim count. This is the default.
- **Progress** — the list's total claimed count is disclosed (the hero's progress bar), but no individual item reveals whether it is claimed.
- **Claims** — each claimed item carries a badge and its remaining capacity, alongside the count; no identity is shown.
- **Identity** — the claiming parties are named, including a party who recorded a claim on another's behalf where that differs from the purchaser.

- **BREAKING** — `sanitizePurchases`' all-or-nothing behaviour (owner + no spoilers → `[]`) is replaced by a tiered projection keyed on the resolved tier, with `isOwner` leaving its signature entirely. The tiers govern other people's claims; a viewer's own claims render at every tier, since a claim you made is not a surprise to you.
- The list-level claimed count rides the progression — disclosed from **Progress** upward — rather than being an independent toggle. There is **no** separate who-has-been-shopping disclosure: that surface is dropped, both from the list hero and from the model.

### Affordances separate from information

- **BREAKING** — claim interaction affordances (`Add Claim`, `Manage claims`, `View claims`) render regardless of the resolved tier. This removes `claim-attribution`'s spoiler gate on owner claim entry and master unclaim, and the `item-actions` matrix's `Owner, spoilers off` row.
- But an action-row **label** that is itself claim information is governed: `Fully claimed`, `Manage claims`, and the disappearance of `Buy & Claim ↗` each announce that an item is claimed. The matrix therefore becomes tier-keyed — at **Surprise** and **Progress** the action set is claim-state-invariant (Progress discloses only the aggregate, never a per-item fact), and those labels appear from **Claims** upward.
- The purchase modal is the contained reveal zone. Opening it from a tier below **Claims** (Surprise or Progress) first asks the viewer to confirm the reveal, so the claim flow never requires leaving the page to raise a setting first. Confirming exposes **claims-level information for that item only** — whether it is claimed and what capacity remains, which is what the claim act needs and nothing more. The page's payload does not carry it at those tiers, so confirming fetches that one item's claim summary on demand rather than widening what every item ships. A viewer already at **Claims** or **Identity** is not asked, because the modal would disclose nothing they are not already shown. The confirmation is per tap and scoped to the modal; the page behind it does not change state.

### Controls

- **This mockup governs the relayout of the entire list hero**, not merely the addition of a spoiler control. The hero carries: the title/identity group; the owner or viewer action buttons (Share / Edit list / Choose items for an owner, Share / Bookmark for a viewer); a tiles row holding the **Visibility** tile and, beside it, a **Spoilers** tile; and an item-count line that gains a **progress bar** once the resolved tier is **Progress** or above.
- The list page's spoiler control is the **Spoilers tile**, which opens a menu of the four stages. It renders only for a viewer holding a membership on the owning profile — a non-member sees everything and has no tier to set. The tile's face reflects the current stage.
- The control is **transient display state** carried in the page URL — it changes what renders on items, not which items render, exactly as the grid/list view toggle does. It contributes no active-filter chip, does not count toward any filter badge, and is not reset by Clear all.
- **BREAKING** — the spoiler control does **not** live in the items toolbar. The toolbar's filter bar returns to its original state (search, sort, filters) with no Claims control and no `purchases` claim-state filter.
- **BREAKING** — the `Show/Hide spoilers` item leaves `ListActionsMenu` (both the hero kebab and the sticky-strip kebab), and the `SpoilerToggle` button no longer exists.
- On hero collapse, the Spoilers menu hoists into the sticky-strip kebab as a prepended entry for members, mirroring how the Visibility rows already hoist there.
- The **library** (`/items`) has no list hero. Its spoiler control is a compact toggle placed to the **left of the search bar**, offering three stages — **Surprise**, **Claims**, **Identity** — and omitting **Progress**, since a library spans every list the profile owns and carries no single-list claimed count to progress toward.
- Owner preview mode renders claim information at the **owner's own resolved tier**, not the viewer's — a preview honest about claim data would show every claim with names and spoil the person who opened it. It stays honest about layout and affordances.
- Owner view-mode resolution: the drag-to-reorder layout holds only while no filter is active; **raising the tier no longer leaves it**, because the tier changes what each row discloses, not which rows are present or their order. Only a filter, which narrows the set a drag would reorder, forces the viewer layout.

### Ownership of the baseline

- **BREAKING** — the "managers are recipients" binary flag from [#182](https://github.com/JoshEddie/CTRLplusList/issues/182)/[#183](https://github.com/JoshEddie/CTRLplusList/issues/183) never ships.
- The profile space's **Settings** panel carries claim visibility: the profile-level default that seeds new memberships, plus each member's own baseline tier. Claim visibility is a setting, not a permission — Permissions keeps roles and admission, and mixing member preferences into it would only confuse both.
- A viewer edits their own row whatever their role; a `manager` sees their own enabled and every other member's disabled, per `2026-08-30-a-forbidden-affordance-renders-disabled`.
- Invite acceptance carries the new member's spoiler tier, pre-filled from the profile default as it stands when the invite is opened, and adjustable before joining.
- "Surprise" stays the default, so existing users' passive experience is preserved.

### Cross-profile viewing

- A viewer acting as A on a list owned by B, holding membership on B, sees the list spoiler-safe with no owner controls, plus an inline switch offer ("You manage this list as B — Switch to B") rather than a blocking interstitial, which would fire on every such visit while browsing rails. The offer renders for any membership, on every visit, and independent of the resolved tier — it is about authorization, not about spoilers.

## Capabilities

### New Capabilities

- `spoiler-visibility`: the resolution model and its storage — membership-keyed protection, the single four-stage tier and its value domain, the member baseline and the transient per-list adjustment layered over it, the profile-level seed and when it is read, the default, the passive-versus-operated rule, and the projection each tier produces. Owns what every consuming surface reads.

### Modified Capabilities

- `claim-attribution`: the spoiler gate on owner claim entry and master unclaim is removed (affordances are ungoverned); the claim flow gains the reveal confirmation and a claims-level form of the already-claimed modal state, which today can only render identity-bearing claim rows; viewer-relative claim display gains the tier dimension in place of the owner-with-spoilers binary, with the claimer-identifying line riding the **Identity** tier rather than ownership.
- `list-item-management`: the `sanitizePurchases` projection rules — the owner-without-spoilers empty array and the owner-with-spoilers `{ by: 'other', firstName }` pair — are replaced by tier-keyed projection; the sanitizer's inputs change from `(isOwner, showSpoilers)` to a resolved tier; the `purchases` claim-state filter is removed; and the projection moves out of the cached reads into an uncached wrapper around them, still inside the data-layer boundary the requirement names.
- `item-actions`: the state matrix's three spoiler-keyed rows are replaced; claim affordances no longer branch on spoiler state, but action-row labels carrying claim information become tier-keyed (appearing from **Claims** up), and claim information on the card does likewise.
- `items-browser-chrome`: the Claims control and the `purchases` claim-state filter are **removed** from the toolbar, returning the filter bar to search / sort / filters; the owner drag-to-reorder vs viewer-layout resolution keys on active filters alone; and the library toolbar gains a three-stage spoiler toggle to the left of the search bar.
- `items-filters-sheet`: the mobile sheet loses the Claims row and the `purchases` claim-state filter, returning to Stores and Price.
- `items-library-shell`: the `?purchases` parameter is no longer a spoiler signal or a claim-state filter; the library read takes the resolved tier, and the library carries a three-stage spoiler toggle (no **Progress** stage) left of its search bar.
- `list-hero-collapse`: `Show/Hide spoilers` leaves both kebab enumerations; the collapsed sticky-strip kebab gains the prepended Spoilers menu for members.
- `list-hero-header`: the hero is relaid out around the tiles row; owner preview mode no longer references a spoiler toggle inside `ListActionsMenu`; the identity footer line gains a progress bar at tier **Progress** and above, and gains no shopper-names trigger.
- `menu-system`: the `ListActionsMenu` item enumeration loses `Show/Hide spoilers`, and the strip kebab may host the prepended Spoilers menu.
- `item-store-links`: the `showSpoilerInfo`-keyed owner spoiler pill and `.purchased-banner--spoiler` row rules are re-keyed to the resolved tier.
- `button-system`: the `SpoilerToggle` pressed-state example is dropped, the toggle itself no longer existing.
- `profiles-surface`: the profile space's Settings panel gains the profile-level default and the per-member baseline tiers, with a manager's own row enabled beside otherwise-disabled fields.
- `profile-permissions`: invite acceptance carries a spoiler tier, pre-filled from the profile default at open time and written onto the new member's preference on acceptance.
- `profiles-data-model`: `profile_preferences` gains a nullable account key so one preference row can be profile-wide (null account) or per-member (account set); the spoiler tier is stored there, and `profile_members` gains no spoiler column.
- `data-layer-organization`: the `purchase` domain's enumerated contents change as the spoiler projection is reshaped and split across the cache boundary, the claim-state filter is removed, and the baseline read and default read need a declared home over `profile_preferences`.
- `e2e-critical-flows`: flows 7, 8 and 11 and their scenarios are written against the binary toggle and the owner-only gate.
- `e2e-management-flows`: the per-member baseline and the invite-time preference are management flows needing coverage.

## Impact

### Data

- Storage lands on `profile_preferences`, extended with a **nullable account key**. A row keyed `(profile, null)` is the profile-wide value; a row keyed `(profile, account)` is that account's own value. The spoiler tier is one catalog entry, so a profile-level default and a member baseline are the same row shape differing only by whether the account key is set. `profile_members` gains **no** spoiler column, and the per-list adjustment needs no storage at all.
- *Why the preference table over a membership column:* a per-member preference keyed this way keeps this value and any future per-member preference in one uniform place — null account meaning profile-wide, a set account meaning that member — rather than growing `profile_members` a column per preference. `2026-08-19-profile-attributes-column-or-preference` already routes a chosen value with a defined absent-resolution to `profile_preferences`; this extends that table's key rather than opening a new home.
- Resolution stays **seeded, not inherited**: the profile default row is read only at invite-open to seed the concrete member row written at acceptance, and is **never** consulted at resolution time. Resolution reads the `(profile, account)` row; where it is absent — a membership predating this capability, or a non-member — it resolves to the fully protected default without falling through to the profile row. Changing the default therefore moves nobody, and no per-member backfill is needed: pre-existing members simply resolve to the protected default until a row is written for them.
- `list_visits` was the candidate for a per-list key and is disqualified independently: `visit-history` specs that the owner viewing their own list is **not recorded**, so the recipient who most needs the setting has no row, and its bulk-clear **deletes** rows outright, so clearing visit history would silently reset it.
- Forward-only migration, additive only. The nullable account column lands on `profile_preferences` without a rewrite; existing preference rows are profile-wide values and are unaffected. No membership column is added and no member rows are backfilled — absence resolves to the protected default. The accept-time writer passes the profile's seed explicitly.
- The defaults preserve behaviour for a non-member (unchanged) and for an owner acting as the owning profile (sees nothing, as today without `?spoilers=1`). They deliberately do not for a member acting as a different profile, who sees claims today and will see none after — that is the [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) hole closing.

### Caching

- `sanitizePurchases` runs **inside** `'use cache'` reads today (`getItemsByListId`, `getItemsByProfile`, `getItemsByPurchased`), keying correctly only because `showSpoilers` is a pure URL-derived value. Resolving a database-backed tier inside those reads would key the cache on a stale input, so **the projection moves out**: the cached inner read returns raw rows and the exported reads sanitize after it. That applies to the two reads taking a resolved tier; `getItemsByPurchased` projects at a constant `identity` — every row is one the viewer purchased — so its input cannot go stale and it keeps its current cached shape. `list-item-management` requires projection before any row escapes the *data-layer boundary*, which the exported names still satisfy, and `guest-claim-identity` already establishes post-cache processing for a value that must not reach a cached read.
- That placement is what makes the **Progress** tier possible: "12 of 36 claimed" must be computed from rows that still carry claims, which the sanitized set does not have at **Surprise**. The list aggregate is the claimed **count** alone — the who-has-been-shopping computation is dropped with its surface. Moving the projection out also retires the per-viewer cache fragmentation `viewerSelfProfileId` causes today, where every distinct viewer holds a separate entry for the same list.
- The baseline read and every write that changes a baseline or the profile default must close the tag loop `profiles-data-model` requires. Baseline and default writes now touch `profile_preferences` — its cache tags plus `profilesOfUser(userId)` where a member row is keyed to an account. Item reads consuming a resolved tier must revalidate on those same writes, or a member who changes their setting keeps seeing the old projection.

### Code

- `lib/data/purchase.ts` (`sanitizePurchases`, the claimed-count aggregate, the single-item claim summary), `lib/data/item.ts` (the cached/uncached split at both call sites), `lib/data/profile.ts` / `.actions.ts` (the baseline and default reads/writes over `profile_preferences`), a resolution module (`lib/spoilers.ts`) combining the baseline with the request's adjustment, `db/schema.ts` (`profile_preferences` account key), `lib/cacheTags.ts`, `lib/types.ts` (the resolved-tier type replacing `PurchaseView`'s spoiler inputs).
- `app/(main)/lists/[id]/ListHeroSection.tsx`, `ListItemsSection.tsx`; `app/(main)/lists/ui/components/ListActionsMenu.tsx`, `ListDetails.tsx` — the hero relayout, the Spoilers tile + menu, the progress bar, and the strip-kebab prepend.
- `app/(main)/items/ui/components/` — `ItemActions.tsx`, `ItemCard.tsx`, `Item.tsx`, `ItemsContainer.tsx`, `ItemsBrowser.tsx`, `SortItems*.tsx`, `itemsToolbar/` (removing the Claims popover and the `purchases` filter, adding the library's left-of-search toggle), `purchasemodal/`.
- `app/(main)/altvatar/[id]/` — the profile space's Settings panel (note the user-facing surface is Altvatar, not "profile").
- `app/(main)/invite/[token]/InviteCard.tsx` — the accept-time tier.
- `scripts/seed-dev-users.ts` — fixtures for a protected member and an unprotected member.

### Sequencing

[#193](https://github.com/JoshEddie/CTRLplusList/issues/193) has shipped, so the cross-profile spoiler hole is live in production and this change is what closes it. Both were open in 1.3.0; the ordering risk the map flagged has resolved into a live gap rather than a scheduling question.
