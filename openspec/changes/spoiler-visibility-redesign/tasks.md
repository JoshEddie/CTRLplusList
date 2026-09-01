> Reset to unchecked: the 2026-09-01 mockup reshaped the model (single four-stage tier; control in the hero, not the toolbar; storage on `profile_preferences`; who's-shopping and the `purchases` claim-state filter dropped). The code was implemented against the prior plan, so `/opsx:apply` carries this delta into it.

## 1. Storage: the tier and its seed

- [x] 1.1 Add a nullable account column to `profile_preferences` in `db/schema.ts`, keyed into its uniqueness alongside (profile, preference): a null-account row is the profile-wide value, an account-set row is that account's value. `profile_members` gains **no** spoiler column.
- [x] 1.2 Add the `spoiler_tier` preferences catalog row (owned by this capability), following the `ACCENT_PREFERENCE_ID` convention — an exported id in `db/schema.ts` so writers and readers agree on the key. Its value is one of the four stage names, stored as text.
- [x] 1.3 Declare the tier vocabulary once — the four stages (`surprise` | `progress` | `claims` | `identity`), their ordering, and the fully protected default (`surprise`) — in `lib/spoilers.ts` (§2.1), and have every consumer read it from there. No second enumeration; the reader validates the stored value against it.
- [x] 1.4 **Delete the already-generated (unrun) migration** that targets the abandoned membership-columns shape, then regenerate per [DATABASE.md](../../../DATABASE.md) against the account-keyed schema. Hand-check the emitted SQL: `IF NOT EXISTS` guards on the account column, the catalog `INSERT … ON CONFLICT DO NOTHING`, and **no** `ALTER` against `profile_members` and **no** backfill. Forward-only, additive; the previous app version must run unchanged (deploy order is migration, then app).

## 2. Resolution

- [x] 2.1 Create `lib/spoilers.ts` beside `lib/listAccess.ts` / `lib/visibility.ts`: the tier vocabulary and ordering, the fully protected default, the baseline-under-request-adjustment composition, and the parse of the single `spoiler` URL param. Not in `lib/data/` — composing a stored value with request parameters is not a data-layer concern (`data-layer-organization`).
- [x] 2.2 Declare the resolved-tier type in `lib/types.ts` (a single ordinal tier), since both the DAL and its callers depend on it.
- [x] 2.3 Add the baseline read to the profile domain (the profile-preferences read module / `lib/data/profile.ts`, watched against the 400-line band): given an account id and the content's **owning profile** id, return that account's `(profile, account)` spoiler-tier row, or the fully protected default where no row exists (including for a signed-out or non-member viewer). Tag it with the `profile_preferences` tags + `profilesOfUser(userId)`.
- [x] 2.4 Resolution reads membership, never the ownership comparison — a viewer acting as A on a list owned by B is protected by their membership on B. Confirm no call site resolves a tier from `isOwner` or from an active-profile equality. The profile default row is never read at resolution time.
- [x] 2.5 Add the member-baseline write (`setMemberTier(profileId, accountId, tier)`) to the profile actions, permitted for the member on their own row whatever their role, and for an `owner` on any row. Refuse anything else in the action — the disabled control is never the enforcement.
- [x] 2.6 Add the profile-default write (the null-account `spoiler_tier` row) under the `owner` floor. Changing the default writes no member row.
- [x] 2.7 Fire the tag loop from both writes: the `profile_preferences` tags plus `profilesOfUser(<affected account>)` for a member write. Item reads consuming a resolved tier must revalidate on these, or a member who changes their setting keeps seeing the old projection.
- [x] 2.8 Add the membership-revocation cleanup: revoking a membership deletes that account's `(profile, account)` preference rows explicitly, since they do not cascade with the `profile_members` row.

## 3. Projection

- [x] 3.1 Rewrite `sanitizePurchases` (`lib/data/purchase.ts`) to take `(raw, viewerSelfProfileId, resolvedTier)` — `isOwner` and `showSpoilers` leave the signature. Keyed on the tier: `surprise` and `progress` return only claims the viewer holds as purchaser or recorder; `claims` reduces every other party's claim to a bare count plus remaining capacity with no `firstName`; `identity` exposes `{ by, firstName }` per claim, `by: 'self'` on a purchaser-profile match. The viewer's own claims survive every tier in full.
- [x] 3.2 Move `claimerFirstName` off the `isOwner` branch onto the `identity` tier, so a non-member sees the recorder named on a proxy-recorded claim. This is the deliberate widening `claim-attribution` records.
- [x] 3.3 Split `getItemsByListId` and `getItemsByProfile` (`lib/data/item.ts`) into an exported **uncached** wrapper over a module-private `'use cache'` raw read. The raw half keeps every `cacheTag` call the current function makes, including `cacheTag(...itemRowTags(result))`, which must stay with the rows it describes. The raw half stays unexported — the data-layer boundary, not the cache boundary, is what the projection precedes.
- [x] 3.4 In each wrapper, apply `sanitizePurchases` and set `hasPurchases` to reflect only what the resolved tier discloses (false for an item carrying only others' claims below `claims`), so no passive surface leaks a concealed claim. There is no claim-state filter left to consume a pre-sanitization truth.
- [x] 3.5 Leave `getItemsByPurchased` (`lib/data/purchase.ts`) cached and sanitizing inside the cached read, projecting at a constant `identity`: every row it returns is one the viewer purchased, so its input cannot go stale and splitting it would buy nothing.
- [x] 3.6 Add the list-scoped claimed-**count** aggregate to `lib/data/purchase.ts`. Viewer-independent, so it stays cached under the same tags as the item read. Callers invoke it only where the resolved tier is `progress` or above. There is no shopper-names aggregate.
- [x] 3.7 Add the single-item claim summary to `lib/data/purchase.ts` — one item's claim count and remaining capacity, no identity — for the reveal confirmation to fetch on demand (§7). Scoped to the item: it re-resolves no tier and changes nothing the page's payload carries.
- [x] 3.8 Confirm `overlayGuestClaims` (`purchase.cookie.ts`) still runs post-cache in the wrapper's caller and still marks a cookie-identified guest's own claim `'self'`.

## 4. Page wiring

- [x] 4.1 `ListItemsSection.tsx` — replace `showSpoilers = isOwner && sp.spoilers === '1'` with the resolved tier from §2, and change the layout condition: the reorder layout holds when the viewer is the acting owner and no filter is active. Raising the tier does **not** leave it (the tier changes disclosure, not the set); only a filter does.
- [x] 4.2 `ListHeroSection.tsx` — resolve the same tier and pass it to `ListDetails`, replacing `showSpoilers`. Preview mode renders claim information at the **owner's own** resolved tier, not a non-member's.
- [x] 4.3 `ItemsContainer.tsx` — take the resolved tier as a forwarded prop and pass it to the list-scoped read; drop `isListOwner`/`showSpoilers` and the preview-mode owner-sanitize routing they served. The unauthenticated list branch resolves to the maximal projection.
- [x] 4.4 `app/(main)/items/page.tsx` — resolve the tier from the account's membership on the profile it acts as and pass it into both `getItemsByProfile` calls. Delete every `purchases` spoiler/filter derivation; `purchases` is no longer read as anything.
- [x] 4.5 `SortItemsContainer.tsx` — render `ItemsToolbar` above `SortItems`, and forward the resolved tier to its read. The toolbar is mounted beside `SortItems`, not inside it, so the dnd component keeps its shape and the params it does not consume stay the browser's concern.
- [x] 4.6 Thread the resolved tier through `ItemsBrowser` → `Items` → `Item` in place of `showSpoilers`, deleting `ItemsBrowser`'s `purchases`-as-spoiler derivation.

## 5. The spoiler control: hero tile and library toggle

- [x] 5.1 Add the hero **Spoilers tile** and its four-stage menu beside the visibility picker in `ListDetails.tsx` (`list-hero-header`), rendered only for a viewer resolving a membership. The tile face shows the current stage; choosing a stage writes the single `spoiler` URL param via the toolbar's/page's param updater, omitting it when it equals the viewer's baseline.
- [x] 5.2 Add the library's compact spoiler toggle to the **left of the search field** in the items toolbar for `mode='items'` (`items-library-shell`), offering three stages (`surprise` / `claims` / `identity`, no `progress`). Not a filter facet and not a sheet row.
- [x] 5.3 Hoist the Spoilers menu into the sticky-strip kebab as `prependedItems` for a member viewer (`list-hero-collapse`), via a shared spoiler-row table mirroring `VISIBILITY_ROWS`, so the hero tile and strip kebab stay in lockstep. A non-member gets no rows.
- [x] 5.4 **Remove the toolbar Claims control**: delete `ClaimsFilterPanel.tsx` / `ClaimsFilterPopover.tsx` and their wiring in `ItemsToolbar` and `FiltersSheet`, returning the filter bar to search / sort / filters and the sheet to Stores / Price.
- [x] 5.5 **Remove the `purchases` claim-state filter** from the toolbar everywhere: drop the `purchases` facet/definition from `ItemsBrowser`'s filter application, from `buildChips`/`countActiveFilters`, from `clearAll` and the filtered-empty `clearFilters` deletions, and from `PURCHASES_LABELS_ITEMS`. `show` (active/archived) stays.

## 6. Item card and the action matrix

- [x] 6.1 Re-key `ItemActions.tsx` on the resolved tier: drop `showOwnerClaimAction` / `showOwnerManageAction` in favour of the tier plus the claim state. At `surprise` or `progress` with no viewer-held claim the action set is claim-state-invariant — `Add Claim` with `View item ↗` below — and neither `Fully claimed` nor `Manage claims` nor the disappearance of `Buy & Claim ↗` may vary with another party's claim.
- [x] 6.2 A claim the viewer holds is never suppressed: `Manage claim` renders at any tier on an item carrying their own claim.
- [x] 6.3 `Item.tsx` — replace `showSpoilerInfo`, `showOwnerClaimAction` and `showOwnerManageAction` with the resolved tier. Extract the tier-keyed claim-information branches into `ClaimBanners.tsx` and a co-located helper in `utils.ts` rather than growing the component; it is at 296 lines.
- [x] 6.4 `ClaimBanners.tsx` — re-key the `.purchased-banner--spoiler` banner on the resolved tier (never below `claims`; count and capacity at `claims`; names at `identity`), replacing the `showSpoilerInfo` prop.
- [x] 6.5 `app/(main)/items/ui/styles/item.css` — re-key the row-view claim pill's render predicate on the resolved tier (never at `surprise`/`progress`, from `claims` up). The surviving rules are unchanged: the pill occupies `grid-column: 3` only, and the `.purchased-banner` family stays `display: none` in row view.

## 7. The reveal confirmation and the modal's claims-level state

- [x] 7.1 In `Item.tsx` / `ItemActions.tsx`, intercept the affordance rather than the modal: at a resolved tier below `claims` (`surprise` or `progress`), activating `Add Claim` / `Manage claim` opens a `ConfirmDialog` naming what will be revealed, and only its confirmation writes `purchaseItem` / `purchaseView` to the URL. A deep link carrying `purchaseItem` still opens the modal directly.
- [x] 7.2 The confirmation is per activation: it presents again on a second item in the same visit, alters nothing behind it, and changes the viewer's resolved tier for no other item. A viewer at `claims` or `identity` is never asked.
- [x] 7.3 `PurchaseFlowContainer.tsx` — after a confirmed reveal, fetch §3.7's single-item claim summary on demand, exactly the way `getClaimPickerForItem` is already fetched, and render the claim count and remaining capacity. No identity, and the page's item payload is untouched.
- [x] 7.4 `ClaimsList.tsx` — below `identity`, render the viewer's own removable rows in full and collapse every other party's claims into a **count** carrying no avatar, name, date, attribution line or removal action. At `identity` the full rows render for every claim, unchanged.
- [x] 7.5 Confirm claim and unclaim **authorization** consults no spoiler value: `createPurchase`, `removePurchase` and `canRemovePurchase` keep deriving from item ownership and the unclaim matrix alone.

## 8. The hero relayout, the progress bar, and the switch offer

- [x] 8.1 Relay out the hero per the 2026-09-01 mockup (`list-hero-header`): the title/identity group, the owner/viewer action buttons, the tiles row (Visibility + Spoilers), and the item-count footer line.
- [x] 8.2 `ListDetails.tsx` — the identity footer line renders a **progress bar** and "N / M claimed" where the resolved tier is `progress` or above, from §3.6's count. At `surprise` the line carries item count and relative time alone, with no placeholder. No shopper-names trigger.
- [x] 8.3 Call the count aggregate only where the tier is `progress` or above, so the fully protected default (`surprise`) — every existing user — costs no query.
- [x] 8.4 Render the inline switch offer in the viewer controls card's action block where the viewer holds a membership on the owning profile but is acting as another, naming the profile and driving `useProfileSwitch`. Inline and non-blocking, on every such visit, for any membership, and independent of the resolved tier.
- [x] 8.5 Strip the spoiler plumbing out of `ListDetails.tsx`: the `showSpoilers` prop, the `spoilerHref` derivation, and the `&spoilers=1` / `?spoilers=1` suffixes on `previewHref` and `exitPreviewHref`.

## 9. Removals and graceful degradation

- [x] 9.1 Delete the `Show/Hide spoilers` row and its `SpoilerToggle` from `ListActionsMenu.tsx`'s base enumeration, along with the `showSpoilers` prop, from both the hero kebab and the sticky-strip kebab base set (the strip's spoiler rows now arrive via `prependedItems`, §5.3).
- [x] 9.2 Delete the `SpoilerToggle` button from the items toolbar and every remaining reference to it (`button-system`'s example already points at Bookmark).
- [x] 9.3 Confirm `?spoilers=1` degrades rather than errors: unread, the page renders at the viewer's own baseline.
- [x] 9.4 Confirm `?purchases=reveal|only|none` degrades: it is read as neither a spoiler signal nor a filter, and produces no chip anywhere.

## 10. The Settings panel's claim visibility

- [x] 10.1 Render the profile-level default in the Settings panel (`app/(main)/altvatar/[id]/AltvatarSpacePage.tsx` + `ProfileSettingsForm.tsx`), under the `owner` floor, as a single tier control. Not in Permissions — a preference is not a permission.
- [x] 10.2 Render each current member's own baseline as a single tier control, sourced from §2.3's read joined onto the roster.
- [x] 10.3 Gate per control, not per panel: a member's own baseline is enabled whatever their role; the profile default and every other member's baseline take the `owner` floor and render **disabled** rather than absent. A `manager` therefore sees the name-and-tagline fields disabled, the submit present and disabled, every other baseline disabled, and their own enabled.
- [x] 10.4 The panel renders each member's stored value, never the default projected onto their row — changing the default moves nobody, and the panel must not suggest otherwise.
- [x] 10.5 Confirm the panel appears on a self-profile's Settings too: their own claim visibility is settable there, and a self-profile still carries no Permissions tab.

## 11. Invite-time tier

- [x] 11.1 `app/(main)/invite/[token]/InvitePage.tsx` — read the profile's claim-visibility default **at page load**, not at mint time, and pass it to the card as the pre-filled tier.
- [x] 11.2 `InviteCard.tsx` — render the single tier control, adjustable before accepting, and submit the adjusted value with the acceptance. Accepting untouched takes the offered value.
- [x] 11.3 `redeemInvite` (profile actions) — consume the invite and insert the membership in one statement; write the accepted tier as a `(profile, account)` `spoiler_tier` preference row seeded from the offered value. The tier write is a separate statement against a different table — a membership with no tier row resolves safely to `surprise`, so it need not share the CTE.
- [x] 11.4 An account already holding a membership is neither re-seeded nor promoted: the `ON CONFLICT DO NOTHING` on the membership stands, and no tier row is written on that path.
- [x] 11.5 Confirm profile birth writes the creator's tier row explicitly (seeded from the default), so a new profile's creator has a concrete baseline.

## 12. Seed fixtures

- [x] 12.1 `scripts/seed-dev-users.ts` — on the existing managed profile, seed one member at the protected default (`surprise`) and one at `identity`, so both projections are reachable in local mode without writing anything.
- [x] 12.2 Seed a claimed-item fixture on that profile's list reaching each tier's distinct rendering: an item claimed by another party, one carrying the viewer's own claim, and one proxy-recorded so the recorder is namable at `identity`.
- [x] 12.3 Update [LOCALDEV.md](../../../LOCALDEV.md) and `e2e/README.md` with the new seats and what each one's tier reaches.
- [x] 12.4 Restart the dev server after reseeding — `'use cache'` DAL results stay stale until then.

## 13. Tests

- [x] 13.1 Unit-test resolution (`lib/spoilers.ts`): a member acting as another profile resolves from their membership on the owning profile; a non-member and a signed-out viewer resolve to the maximal projection; ownership contributes nothing; an absent URL value falls through to the baseline and a present one overrides it; an absent member row resolves to `surprise` without consulting the profile default.
- [x] 13.2 Unit-test the projection at each tier: `surprise` and `progress` return only the viewer's own claims and leave a claimed item indistinguishable from an unclaimed one; `claims` reports count and remaining capacity with no `firstName`; `identity` exposes `{ by, firstName }` with `by: 'self'` on a purchaser-profile match and the recorder named where the asserter differs. Assert no full name, email, account id, profile id or raw guest identity at any tier.
- [x] 13.3 Unit-test the split reads: two viewers whose resolved tiers differ enter the cached raw read once for the list and each get their own projection; `hasPurchases` reflects only what the tier discloses; the raw read is not exported.
- [x] 13.4 Unit-test the count aggregate: it counts claims a `surprise` viewer's projected set no longer carries, and the callers do not invoke it below `progress`.
- [x] 13.5 Unit-test the tier writes: a member writes their own row at any role, an owner writes another's, a manager is refused another's, the later write stands where the two disagree, and revoking a membership deletes that account's tier row.
- [x] 13.6 Unit-test redemption's tier: the offered value is written when untouched, an adjusted tier is written instead of the default, a later default change moves nobody, a membership with no tier row resolves to `surprise`, and a sitting member is neither re-seeded nor promoted.
- [x] 13.7 Unit-test the migration's guarantees against a real database: the `profile_preferences` account column lands nullable, existing rows stay valid as profile-wide values, `profile_members` gains no spoiler column, and the `spoiler_tier` catalog row is present.
- [x] 13.8 Component-test the action matrix at `surprise` and `progress`: an unclaimed item and one fully claimed by others render the identical action set, neither `Fully claimed` nor `Manage claims` renders, and an item carrying the viewer's own claim still reads `Manage claim`. Then the `claims` tier admitting `Manage claims`.
- [x] 13.9 Component-test the reveal confirmation: presented below `claims` (both `surprise` and `progress`) before the modal opens, declining discloses nothing, confirming renders the fetched count and capacity with no party named, it presents again on a second item, and a `claims`/`identity` viewer is never asked.
- [x] 13.10 Component-test `ClaimsList` below `identity`: the viewer's own row in full with its removal action, the others as a count with no name, avatar, date, attribution line or removal action.
- [x] 13.11 Component-test the hero Spoilers tile: renders for a member and not for a non-member, opens the four-stage menu, writes the `spoiler` param, and is hidden in preview mode; and the footer progress bar renders at `progress` and above and not at `surprise`.
- [x] 13.12 Component-test the Settings panel's per-control gating: a `manager` sees their own tier enabled beside a disabled default, disabled sibling baselines, and the disabled name-and-tagline form with its submit present.
- [x] 13.13 Update the existing tests that assert the retired mechanism — `lib/data/__tests__/item.test.ts`, `ItemsBrowser.test.tsx`, `ListActionsMenu.test.tsx`, `FiltersSheet.test.tsx`, `ItemsToolbar.test.tsx` and the item/modal component tests — to the resolved tier and the removed toolbar Claims/`purchases` filter rather than deleting their coverage.

## 14. End-to-end

- [x] 14.1 Rewrite `e2e/owner-spoiler.auth.spec.ts` as the transient-tier flow (critical flow 8): a protected member raises the tier through the hero's Spoilers tile and sees a claim their baseline withheld; navigating away and returning restores the protected view.
- [x] 14.2 Add the fully-protected claim-and-master-unclaim flow (critical flow 11): the affordances render whatever the claim state, the confirmation is presented, and after confirming the member claims one item via `I bought this myself` and master-unclaims a seeded claim on another — each reflected after reload, with no setting changed.
- [x] 14.3 Update `e2e/claim-attribution.auth.spec.ts` and `e2e/signed-in-claim.auth.spec.ts` for flow 7's restated form: the claimer sees their own claim, and a protected member of the owning profile at their default does not.
- [x] 14.4 Add the owner-sets-a-member's-baseline management flow (flow 9): the change reflected on re-navigation **and** on the member's rendered list.
- [x] 14.5 Add the cross-acting-profile flow (flow 10): a context whose selection cookie names profile A opens a list owned by B, finds it at the membership's baseline with no claim disclosed, and sees the inline switch offer. Establish the starting profile by setting the application's own selection cookie — no environment override.
- [x] 14.6 Do not drive invite redemption in a browser: it is single-use against a shared seeded database. The pre-fill and the written tier are covered by §13.6 over the action.

## 15. ADR promotion

- [x] 15.1 Promote `2026-08-31-protection-follows-the-human-not-the-acting-profile` into `openspec/adr/` and add its `DAL` / `DB Queries` rows to `openspec/adr/INDEX.md`.
- [x] 15.2 Promote `2026-08-31-passive-surfaces-protect-operated-surfaces-expose` into `openspec/adr/` and add its row to `openspec/adr/INDEX.md`; record its Decision in `openspec/specs/spoiler-visibility/spec.md`.
- [x] 15.3 Promote `2026-08-31-a-viewer-scoped-projection-lives-outside-the-cache` into `openspec/adr/` and add its `DAL` / `DB Queries` rows to `INDEX.md`.
- [x] 15.4 Promote `2026-08-31-a-per-membership-setting-is-seeded-not-inherited` (reworded: absent value resolves to the protected default, no backfill) into `openspec/adr/` and add its `DB Schema` / `DAL` rows to `INDEX.md`.
- [x] 15.5 Promote `2026-09-01-a-per-member-preference-is-an-account-keyed-preference-row` into `openspec/adr/` and add its `DB Schema` / `DAL` rows to `INDEX.md`.
- [x] 15.6 Promote `2026-08-31-a-member-preference-is-a-setting-not-a-permission` into `openspec/adr/` and add its row to `INDEX.md`; record its Decision in `openspec/specs/profiles-surface/spec.md`.

## 16. Pre-merge

All five gates run locally against the author's real `.env.local` before review is requested. No doc-only exemption applies — this change edits executable source.

- [x] 16.1 `npm run lint` passes with zero errors and zero non-size warnings.
- [x] 16.2 `npx tsc --noEmit` passes with zero errors.
- [x] 16.3 `npm run build` completes successfully.
- [x] 16.4 `npm run test:coverage` passes with zero failing tests.
- [ ] 16.5 `npm run test:e2e` passes with zero failing tests.
