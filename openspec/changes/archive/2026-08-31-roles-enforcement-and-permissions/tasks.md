## 1. The gate learns the floor

- [x] 1.1 Add `role` to `writableMembership`'s projection in `lib/data/profile.gate.ts` and to its return type — the row is already fetched, so this adds no round trip.
- [x] 1.2 Define the two-valued floor type (`'member' | 'owner'`) and its role sets in a new `lib/data/profile.roles.ts`, not in `profile.gate.ts`: the gate reaches NextAuth through `user.session`, and a read module that only needs to answer "does this role clear the floor" must not drag an auth runtime into its module graph. `member` admits `self | owner | manager`, `owner` admits `self | owner`. Keep `WRITE_ROLES` as the selectability set the read still filters on. _Superseded by §16: the floor sets and their predicates are replaced by role records carrying their own rights. The module and the reason it is its own module both stand._
- [x] 1.3 Give `authedWriter` a **required** floor parameter with no default, compared against the membership's role after the membership read and before `stampActedAs`; a role below the floor returns `FORBIDDEN_RESPONSE` and writes no row.
- [x] 1.4 Reconcile `ownsProfile` with the new floor vocabulary so the named-profile path and the gate express `owner` once rather than twice.

## 2. Content writes declare their floor

- [x] 2.1 `lib/data/list.actions.ts` — pass `member` at `createList` and `updateList`; pass `owner` at `deleteList` and `setListVisibility` (4 call sites, lines ~43, 92, 199, 245).
- [x] 2.2 `lib/data/item.actions.ts` — pass `member` at `createItem`, `updateItem` and `archiveItem`; pass `owner` at `deleteItem` (4 call sites, lines ~22, 87, 176, 220).
- [x] 2.3 `lib/data/listItems.actions.ts` — pass `member` at all three call sites (`setListItems`, `removeListItem`, `updatePriority`; lines ~45, 163, 224), preserving `setListItems`'s existing collapse of the gate rejection into its own local error code rather than adding a second refusal shape.
- [x] 2.4 `lib/data/item.associations.ts` — pass `member` at `updateItemStores` and `updateItemLists` (lines ~43, 171).
- [x] 2.5 Confirm no `authedWriter` call site remains without an explicit floor, and that `npx tsc --noEmit` would flag one that did.

## 3. Master unclaim takes the owner floor without the gate

- [x] 3.1 In `removePurchase` (`lib/data/purchase.actions.ts`), read the acting account's membership on the acting profile via `writableMembership` on the authenticated path, unconditionally — not behind the self-profile legs, whose condition would duplicate the authorization it skips.
- [x] 3.2 Add a nullable role parameter to `canRemovePurchase` (`lib/data/purchase.ts:175`) and apply the `owner` floor to the item-owner leg alone; the asserter and purchaser legs keep comparing the self-profile with no floor. Keep it a pure function.
- [x] 3.3 Confirm the guest path is unchanged and still refuses on anything but an all-NULL-identity row named by a valid `guest_claims` cookie.

## 4. Membership administration module pair

There is no 4.3. It was dropped during the mid-apply revision §6's lead-in records, and its content cannot be reconstructed from the artifacts; the numbering is left as-is so review.md and §12 keep citing stable positions.

- [x] 4.1 Create `lib/data/profile.members.ts` with the Permissions section's roster read: every membership on the named profile with the member's profile name, avatar inputs, role and `last_active_at`, tagged `profileMembers` + `profilesOfUser`.
- [x] 4.2 Revert any mutual-follow extraction already applied for the retired add pool: `getEligiblePurchasers` (`lib/data/profile.ts:156`) keeps its pair computation inline, and no shared mutual-follow helper survives — admission no longer reads the follow graph.
- [x] 4.4 Create `lib/data/profile.members.actions.ts` with a shared owner-floor check that loads the acting account's membership on the **named** profile (uncached) and refuses below `owner` — never passing `authedWriter` and never comparing the acting profile.
- [x] 4.5 Remove `addMember` and the candidate-pool read if already applied. Admission is §6's invite link and nothing else creates a membership row for another account.
- [x] 4.6 `setMemberRole(profileId, userId, role)` — refuses when the target membership is the actor's own, in either direction. No survivor guard: the actor is necessarily a surviving owner, so one would be the redundant kind.
- [x] 4.7 `removeMember(profileId, userId)` — permits an owner to remove anyone and any member to remove themselves; refuses a manager targeting anyone else.
- [x] 4.8 Fold the ≥1-owner floor into the removal statement itself: `db.delete(profile_members).where(and(eq(user_id), eq(profile_id), exists(<aliased self-join for a surviving self-or-owner member>)))`, with zero rows affected as the refusal. Drizzle `exists` over an alias of the same table; no raw SQL, no read-then-write.
- [x] 4.9 Every action that writes a membership row — role change, removal, and §6's redemption — fires `cacheTags.profilesOfUser(<the affected member's account>)` as well as the coarse `profileMembers`; a removal must invalidate the removed account's tag, not only the acting owner's. Minting fires neither: no cached read lists invites.

## 5. The Permissions section

- [x] 5.1 Render the profile space's panels behind a tab strip below the identity header, Settings first (`app/(main)/altvatar/[id]/AltvatarSpacePage.tsx`). A managed profile's strip additionally carries a Permissions tab ordered after Settings — never for a self-profile.
- [x] 5.2 Build the member roster: one row per membership with profile name, avatar, role, and last-active. Extract the row as its own component rather than nesting it inline.
- [x] 5.3 Render last-active relative and coarse ("3 days ago"); a membership never acted as renders as never and sorts after every membership carrying a value.
- [x] 5.4 Replace the add-member flow with the invite-minting flow over `form-shell-system`: a role choice of `owner | manager` defaulting to `manager`, and the minted link presented for the owner to copy, stating the profile and role it grants. No candidate pool and no empty state — there is nobody to list.
- [x] 5.5 Build the role-change control as a discrete `Change role` control on the row at ≥600px, collapsing into the row's kebab per `menu-system` below 600px — the app's standing breakpoint for this collapse. Absent from the viewer's own row (self-demotion is not offered).
- [x] 5.6 Route removal through `confirm-dialog-system`, on another member's row and on the viewer's own alike; dismissal deletes nothing. The control follows 5.5's responsive shape: a discrete `Remove` / `Leave` control at ≥600px, collapsing into the kebab below it. Where the viewer is the profile's sole owner, their own `Leave` renders disabled with a tooltip naming the remedy rather than opening a dialog that could only be refused — per `2026-08-30-a-forbidden-affordance-renders-disabled`. §4.8's guarded DELETE stays the enforcement.
- [x] 5.7 For a `manager` viewer, render every owner-floor control **disabled** rather than absent (invite minting, role change, removal of another member), and leave their own removal control operable. Guard each `onClick`, since `aria-disabled` on a menu row is advisory.
- [x] 5.8 Render the strip's last tab, Lists: every list the profile owns, whatever its visibility. The space renders this view only for a member, who can already see the same lists by acting as the profile, so the panel discloses nothing their membership does not already carry.

## 6. Admission by single-use invite link

- [x] 6.1 Add `profile_invites` to `db/schema.ts`: `token` text primary key, `profile_id` and `created_by_user_id` FK with `ON DELETE CASCADE`, `role` NOT NULL under a check constraint admitting `'owner' | 'manager'` only, `created_at` and `expires_at` NOT NULL, nullable `redeemed_at`. No index beyond the primary key — every read is by token.
- [x] 6.2 Generate the migration per DATABASE.md's workflow and check the emitted SQL, including the check constraint.
- [x] 6.3 `mintInvite(profileId, role)` in `profile.members.actions.ts` — reuses 4.4's owner-floor check on the named profile, token from `nanoid(32)`, `expires_at` seven days out, role defaulting to `manager` and refusing `self`. Returns the token for the caller to build the link from.
- [x] 6.4 `redeemInvite(token)` — authenticated caller only. Refuse before the write where a block edge stands in either direction between the caller and the invite's `created_by_user_id`; a plain read, deliberately not folded into 6.5's statement, because a block landing mid-redeem is benign.
- [x] 6.5 Write the redemption as **one data-modifying CTE** per `2026-08-18-atomic-writes-in-one-cte`: `db.$with()` over `UPDATE profile_invites SET redeemed_at = now() WHERE token = … AND redeemed_at IS NULL AND expires_at > now() RETURNING profile_id, role`, feeding an insert-select into `profile_members` with `ON CONFLICT DO NOTHING`. Zero rows out of the UPDATE is the refusal. Restate every `profile_members` column in order — Drizzle's insert-select rejects a partial projection.
- [x] 6.6 Return one identical refusal for unknown, expired and already-spent tokens, and confirm no code path or message distinguishes them.
- [x] 6.7 Add the route under `(main)` — thin `page.tsx` forwarding to a co-located `InvitePage.tsx` that awaits `params`, resolves the invite, and renders the profile it admits to plus the role it grants. Under `(main)` so the onboarding short-circuit carries a brand-new account through the gate and back to the untouched URL.
- [x] 6.8 Redemption fires only from a submitted action on that page, never from the page load. Confirm no read path mutates.
- [x] 6.9 Where the viewer already holds a membership, the page states so and renders no redeem control; 6.5's `ON CONFLICT DO NOTHING` stays the backstop, and the standing role is never rewritten.
- [x] 6.10 Give `signInUser` (`lib/data/user.actions.ts:57`) a destination argument threaded to `signIn`'s `redirectTo`, and have the invite page's signed-out state pass its own URL. No cookie, no stashed token.

Added mid-apply (owner, 2026-08-30), reversing this change's own "no invite roster, no revoke" ruling; the proposal, design, ADR and `profile-permissions` spec were reconciled with it rather than the other way round.

- [x] 6.11 Add `profileInvites` + `invitesOfProfile(profileId)` to `lib/cacheTags.ts`, and fire the narrow one from every write that mints, re-roles, revokes or spends an invite.
- [x] 6.12 `getPendingInvites(profileId)` in `profile.members.ts` — unredeemed, unexpired invites with their token, role and expiry, oldest first.
- [x] 6.13 `revokeInvite(profileId, token)` and `setInviteRole(profileId, token, role)` in `profile.members.actions.ts`, both under §4.4's owner-floor check and both guarded on `redeemed_at IS NULL` in the statement itself, so neither reaches back through a redemption.
- [x] 6.14 Render the invite rows after the memberships in `PermissionsSection`, for an owner viewer only — the row carries the token, and a token is the grant itself.
- [x] 6.15 `InviteRow` over `menu-system` + `confirm-dialog-system`: copy the link, change the role, revoke behind a confirmation. Days-left counted by the server, since a client component reading the clock during render is impure.
- [x] 6.16 Strip the minted link out of `InviteFlow` — it chooses the role and nothing else, and the roster is where the link lives.
- [x] 6.17 Re-render the invite surface as a `form-shell-system` overlay wearing the profile's own avatar and accent, with the invitation headline above the name.
- [x] 6.18 Redirect an account that already holds a membership to the profile rather than offering it anything; the resolution is a read and consumes nothing.

## 7. Forbidden affordances render disabled

- [x] 7.1 Invert the Settings form's manager treatment (`ProfileSettingsForm.tsx` / `ProfileFields.tsx`): render every field disabled and the submit control **present and disabled** rather than omitted.
- [x] 7.2 Render the identity header's avatar edit affordance present and disabled for a `manager` (`ProfileSpaceIdentity.tsx` / `ProfileHeaderSection.tsx`).
- [x] 7.3 Render the list visibility pill disabled rather than omitted for a viewer holding `manager` on the owning profile (`VisibilityPicker.tsx`), threading the viewer's role to it.
- [x] 7.4 Confirm no `menu-system` or `button-system` extension is needed — `Button` already accepts `disabled` and `MenuItem` spreads `aria-disabled` through.

## 8. Acceptance markers

- [x] 8.1 Resolve the `*TODO:*` in `Flow: An owner mints an invite link without switching profiles` — the real control text for the Permissions section's invite-minting control.
- [x] 8.2 Resolve the `*TODO:*` in `Flow: An owner mints a link that grants ownership` — the real control text for the Permissions section's invite-minting control.
- [x] 8.3 Resolve the `*TODO:*` in `Flow: A stranger redeems an invite link and joins the profile` — the real control text for the invite page's redeem control.
- [x] 8.4 Resolve the `*TODO:*` in `Flow: Redeeming an ownership link makes the recipient an owner` — the real control text for the invite page's redeem control.
- [x] 8.5 Resolve the `*TODO:*` in `Flow: A promoted member sees their new role` — the real control text for the control that changes a member's role.
- [x] 8.6 Resolve the `*TODO:*` in `Flow: Removal asks before it deletes` — the real control text for the control that removes a member.

## 9. Tests

- [x] 9.1 Unit-test the gate's floor: a `manager` refused an `owner`-floor write with no row written, a `manager` admitted a `member`-floor write, `self` and `owner` passing both, and the ownership comparison still failing ahead of the floor.
- [x] 9.2 Unit-test the membership actions: role change refused on the actor's own row, manager refused every administrative action including minting, and removal permitted for self and by an owner.
- [x] 9.2a Unit-test minting: the token's role defaults to `manager`, honours a chosen `owner`, refuses `self`, and refuses a `manager` actor.
- [x] 9.2b Unit-test redemption: a valid token writes the membership at the token's role; a spent token, an expired token and an unknown token each refuse with the same response and write nothing; a redeemer already holding a membership keeps their role while the token is consumed; a block edge with the minting owner refuses.
- [x] 9.2c Unit-test revocation and invite re-roling: an owner's revoke makes the token refuse, a role change is honoured at redemption, both refuse on a spent token without touching the membership it granted, and a manager is refused either.
- [x] 9.3 Unit-test the ≥1-owner floor: the sole owner's self-removal refused with the row intact, one of two owners removed successfully, and the profile's only manager removed successfully.
- [x] 9.4 Unit-test `canRemovePurchase`'s new role parameter: master unclaim refused for `manager`, admitted for `owner` and `self`, and both self-profile legs still admitting a manager's own claim.
- [x] 9.5 Component-test the Permissions section: the manager view rendering forbidden controls disabled rather than absent, and their own removal control operable.
- [x] 9.5a Component-test the roster's invite row (copy, re-role, revoke, dismissal) and the invite surface (what it states, accept, refusal, the signed-out door).
- [x] 9.6 Add the manager-role Playwright spec (`e2e/`), pinning the context to the seeded `dev-profile-workshop` seat via the application's own selection cookie — a seat reserved for this spec, because it writes lists and items it cannot clean up and `dev-profile-managed` carries two fixtures a single such write destroys (13.4). Assert both halves: the writes a manager may make, and an owner-floor write refused past its disabled control with a reload showing the target unchanged. The seat is new seed work: one `profiles` row and two `profile_members` rows. Ordering is left out — dnd-kit's sensor does not arm under Playwright, no spec in the suite has ever driven a drag, and `updatePriority` takes the same floor as the writes that are covered.
- [x] 9.6a Cover the invite round trip end to end in `e2e/`: an owner mints a link, a second seeded account redeems it and gains the role, and a second redemption of the same link is refused. No new seed rows — the existing accounts suffice.
- [x] 9.7 Assert the owner seat sees the equivalent surface operable, in the same spec.

## 10. ADR promotion

- [x] 10.1 Promote `2026-08-30-owners-run-the-profile-managers-run-its-content` into `openspec/adr/2026-08-30-owners-run-the-profile-managers-run-its-content.md` and add its `DAL` row to `openspec/adr/INDEX.md`.
- [x] 10.2 Promote `2026-08-30-a-cardinality-floor-is-a-guarded-single-statement` into `openspec/adr/2026-08-30-a-cardinality-floor-is-a-guarded-single-statement.md` and add its `DATABASE.md` and `DAL` rows to `openspec/adr/INDEX.md`.
- [x] 10.3 Record that entry's Decision in `DATABASE.md` — a cross-row cardinality floor is a guard folded into the mutating statement, never a read-then-write — citing back to the ADR.
- [x] 10.4 Promote `2026-08-30-a-forbidden-affordance-renders-disabled` into `openspec/adr/2026-08-30-a-forbidden-affordance-renders-disabled.md` and add its `Role-Gated UI` row to `openspec/adr/INDEX.md`.
- [x] 10.4a Promote `2026-08-30-an-invite-link-is-a-single-use-capability-grant` into `openspec/adr/2026-08-30-an-invite-link-is-a-single-use-capability-grant.md` and add its `DB Schema` and `DAL` rows to `openspec/adr/INDEX.md`.
- [x] 10.5 Add `Role-Gated UI` — "rendering a control the viewer's role forbids" — to the term bank in `openspec/adr/INDEX.md`.

## 11. Pre-merge

All five gates run locally against the author's real `.env.local` before review is requested. No doc-only exemption applies — this change edits executable source.

- [x] 11.1 `npm run lint` passes with zero errors and zero non-size warnings.
- [x] 11.2 `npx tsc --noEmit` passes with zero errors.
- [x] 11.3 `npm run build` completes successfully.
- [x] 11.4 `npm run test:coverage` passes with zero failing tests.
- [x] 11.5 `npm run test:e2e` passes with zero failing tests.

## 12. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.

- [x] 12.1 A1 tabbed space + Lists panel documented by no task or requirement — resolved
- [x] 12.2 A2 acceptance rows name a `Change role` control that does not exist — resolved
- [x] 12.3 A3 sole-owner Leave pre-disabled, so the last-owner flow is unwalkable — resolved
- [x] 12.4 A4 acceptance names `/profiles` routes that 404 — resolved
- [x] 12.5 A5 `redeemInvite` returns success for a spent token when the caller already sits — resolved
- [x] 12.6 A6 task 1.2 names `profile.gate.ts`; the code landed in `profile.roles.ts` — resolved
- [x] 12.7 A7 tasks.md numbering holes (§4 missing 4.3, §9 out of order) — resolved
- [x] 12.8 B8 share flow hands out a URL for a list whose visibility write was refused — resolved
- [x] 12.9 B9 collapsed hero's visibility menu operable for a manager — resolved
- [x] 12.10 B10 delete affordances operable for a manager against an owner-floor action — resolved
- [x] 12.11 B11 `--meta-text-color` retuned corpus-wide with no artifact recording it — resolved
- [x] 12.12 B12 third home for the role→label mapping — resolved
- [x] 12.13 B13 `ui/components` module imports out of a route directory — resolved — _no work: dropped at adjudication, superseded by #337; see `review.md` Round 1 Adjudications_
- [x] 12.14 B14 schema comment claims token-only reads contradicted by `profile_id` reads — resolved
- [x] 12.15 B15+C16 cached `getPendingInvites` freezes its `expires_at > now` clock — resolved
- [x] 12.16 B17 dead `.profile-settings-heading` CSS — resolved
- [x] 12.17 C19 `setMemberRole` writes an unvalidated caller-supplied role — resolved
- [x] 12.18 C20 `mintInvite` admits a self-profile, breaking the no-`self`-row invariant — resolved
- [x] 12.19 C21 sign-in redirect guard admits a leading `/\` open redirect — resolved
- [x] 12.20 C22 membership writes fire the coarse `profile_members` tag — resolved
- [x] 12.21 T23 `managed` branch asserted nowhere (stub drops the panel props) — resolved
- [x] 12.22 T24 no manager-actor test against the three owner-floor writes — resolved
- [x] 12.23 T25 e2e specs depend on cross-test and cross-file residue and file ordering — resolved
- [x] 12.24 T26 `signInUser.bind` mock discards the invite destination — resolved
- [x] 12.25 T27 only one of the two block directions exercised on redemption — resolved
- [x] 12.26 T28 `daysUntil` computed by no assertion — resolved
- [x] 12.27 T29 invite round trip pins only the recipient's half — resolved
- [x] 12.28 `npm run lint` — 0 errors, 4 size warnings (`profile.actions.ts` 366, `profile.members.actions.ts` 303, `profile.ts` 364, `purchase.actions.ts` 302), all pre-existing yellow and the only tolerated warning class
- [x] 12.29 `npx tsc --noEmit` — zero errors
- [x] 12.30 `npm run build` — completes successfully
- [x] 12.31 `npm run test:coverage` — 291 files, 3626 tests, zero failures, every per-file coverage floor met
- [x] 12.32 `npm run test:e2e` — 81 passed, zero failures

## 13. Round 1 follow-through

Work the round's reconcile directions created rather than merely repaired. Each
is recorded in `design.md`; the requirements they answer to are in the deltas.

- [x] 13.1 Widen `UserIdentity.activeProfile` to the membership
  `resolveIdentity` already selects. Delete `getActingRole`, `getActor` and the
  `Actor` type, re-pointing every call site at `identity.activeProfile`. — _typed
  as the existing `ProfileMembershipView` rather than a new `ActorProfile &
  { role }`: it is what `resolveIdentity` returns at runtime already, so the
  widening is a narrowing removed, and `selfProfile` and the switcher rows keep
  `ActorProfile` untouched_
- [x] 13.2 Uncache `getPendingInvites`, and delete `profileInvites` /
  `invitesOfProfile` along with every fire of them — no cached read lists
  invites once the roster read is live, so the tags would fire into nothing.
- [x] 13.3 Add `cacheTags.membersOfProfile(profileId)`, carry it on
  `getProfileMembers`, and fire it in place of the coarse `profile_members`
  table tag from every membership write.
- [x] 13.4 Give the manager e2e flow its own seeded seat
  (`dev-profile-workshop`), and rebuild the visibility test's fixture from its
  own writes rather than the previous test's residue.
- [x] 13.5 Raise the node project's `hookTimeout` in `vitest.config.ts`. Thirty-six
  files boot a pglite and only eight raised it per file; under fork contention
  the rest failed whichever lost the race, differently on every run. The
  contention is a property of the suite, not of any one member — pre-existing,
  surfaced by running the gate rather than caused by this change.
- [x] 13.6 Delete `OwnerFloorProvider`, `useBelowOwnerFloor` and the `meets=`
  computation in `(main)/layout.tsx`, and remove `ListHeroSection`'s
  `viewerIsManager` prop and the read behind it, so the floor has one source
  rather than two.
- [x] 13.7 Have the server component rendering each of the visibility picker,
  the collapsed hero's rows and the two delete buttons read
  `activeProfile.role` and pass `disabled` to its client leaf.
- [x] 13.8 Widen the item tree's existing acting-profile prop from the bare id
  to the profile itself, so the role reaches the claim modal — `Item.tsx` is
  `'use client'` and `PurchaseModalSlot.tsx` inherits that boundary, so no
  server ancestor is reachable. Nine declaration sites.
- [x] 13.9 Take the floor out of `ClaimsList` entirely and have each caller
  decide it: `PurchaseFlowContainer`'s list is master unclaim and takes the
  floor, `PurchaseModalSlot`'s is the viewer's own claims and takes none (3.2).
  One floor applied to both is what currently stops a manager dropping their
  own claim. — _the caller's answer arrives as `removalDisabled` rather than
  folded into `canRemove`: folding it would make the forbidden row absent,
  which `2026-08-30-a-forbidden-affordance-renders-disabled` refuses_

## 14. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.

- [x] 14.1 B8 (round 1) the two share surfaces landed on different rules; the expanded one's guard is unreachable — resolved — _no work here: merged into 14.2 at adjudication; see `review.md` Round 2 Adjudications_
- [x] 14.2 B8(round 1)+A1+B2+C3+B9 the owner floor gates sharing, which writes nothing — take the floor read and the disabled state off both share shapes and off the spec — resolved — _the spec never named sharing, so the delta gained the exclusion clause instead of losing one_
- [x] 14.3 A4 task 9.6 names the superseded `dev-profile-managed` seat and claims no new seed rows — resolved
- [x] 14.4 A5 the proposal declares the route drift out of scope while the delta sweeps canonical specs; two references unswept — resolved
- [x] 14.5 A6 `FLOOR_ROLES.member` coupled to `WRITE_ROLES` with its rationale comments deleted, uncovered by any task — resolved — _no work: dropped at adjudication; see `review.md` Round 2 Adjudications_
- [x] 14.6 B7 master unclaim stays operable below the owner floor and toasts success on the refusal — resolved
- [x] 14.7 B8 `LOCALDEV.md` and `e2e/README.md` do not carry the `dev-profile-workshop` seat the T25 fix depends on — resolved
- [x] 14.8 B9 `ShareButton`'s floor read is dead — no call site renders it on a hidden list — resolved — _no work here: merged into 14.2 at adjudication; see `review.md` Round 2 Adjudications_
- [x] 14.9 B10 the Lists panel's empty state claims no *shared* lists on a profile with no lists — resolved
- [x] 14.10 B11 `MemberRow` and `InviteRow` each carry an identical `run` helper — resolved
- [x] 14.11 C12 `sanitizeReturnTo` was not hardened alongside `sameOriginPath`; a tab-prefixed `returnTo` reaches `redirect()` — resolved — _one home at `lib/sameOriginPath.ts` carrying the union of both rules, so `list-item-management`'s standing `://`-and-backslash clause still holds and needs no delta_
- [x] 14.12 C13 `setMemberRole` can rewrite a `self` row and reports success on a zero-row write — resolved
- [x] 14.13 C14 `VisibilityMenuItems` uses native `disabled`, bypassing the `menu-system` `aria-disabled` contract — resolved
- [x] 14.14 C15 the invite-index comment's stated bound is on the result set, not the scan — resolved
- [x] 14.15 C16 `ROLE_LABELS` typed `Record<string, string>` after the `?? role` fallback was deleted — resolved — _no work: dropped at adjudication; see `review.md` Round 2 Adjudications_
- [x] 14.16 T17 the tab strip's composition is asserted by no test — resolved
- [x] 14.17 T18 the two 600px breakpoint scenarios are pinned by no test — resolved — _no work: dropped at adjudication; see `review.md` Round 2 Adjudications_
- [x] 14.18 T19 `setInviteRole`'s ungrantable-role refusal is untested — resolved
- [x] 14.19 T20 the "SHALL NOT fire the coarse tag" half is asserted nowhere — resolved
- [x] 14.20 T21 `dev-profile-managed`'s never-acted-as state is asserted by no test — resolved — _no work: dropped at adjudication; see `review.md` Round 2 Adjudications_
- [x] 14.21 T22 two e2e seed-baseline headers understate what the viewer holds — resolved
- [x] 14.22 `npm run lint` — 0 errors, 4 size warnings (`profile.actions.ts` 366, `profile.members.actions.ts` 312, `profile.ts` 364, `purchase.actions.ts` 302), all pre-existing yellow and the only tolerated warning class
- [x] 14.23 `npx tsc --noEmit` — zero errors
- [x] 14.24 `npm run build` — completes successfully
- [x] 14.25 `npm run test:coverage` — 291 files, 3638 tests, zero failures, every per-file coverage floor met
- [x] 14.26 `npm run test:e2e` — 81 passed, zero failures

## 15. Gates — round 3

Re-run after §13 lands: the round-2 pass predates the acting-role rework.

- [x] 15.1 `npm run lint` — 0 errors, 4 size warnings (`profile.actions.ts` 366, `profile.members.actions.ts` 312, `profile.ts` 364, `purchase.actions.ts` 302), all pre-existing yellow and the only tolerated warning class
- [x] 15.2 `npx tsc --noEmit` — zero errors
- [x] 15.3 `npm run build` — completes successfully
- [x] 15.4 `npm run test:coverage` — 290 files, 3638 tests, zero failures, every per-file coverage floor met
- [x] 15.5 `npm run test:e2e` — 81 passed, zero failures

## 16. A role carries its own rights

Replaces the set predicates built in §1 with one record per role. `admin` is the owner floor; `!isSelf` is grantability. Behaviour is unchanged throughout — every floor assignment §2–§4 fixed stays exactly where it is.

- [x] 16.1 Replace `lib/data/profile.roles.ts` with three `RoleShape` records (`value`, `label`, `isSelf`, `admin`) and `ROLES`. Delete `WRITE_ROLES`, `FLOOR_ROLES`, `meetsFloor`, `belowOwnerFloor`, `GRANTABLE_ROLES`, `MemberRole`, `isGrantableRole` and `ROLE_LABELS` — deleted, not rehomed. Grantability gets no field: `self` is ungrantable because it is the identity relation, so `isSelf` already answers it.
- [x] 16.2 `lib/types.ts` — `ProfileMembershipView.role` and `ProfileCardView.role` carry the record. Both hand-written unions go.
- [x] 16.3 `lib/data/profile.gate.ts` — keep `authedWriter`'s required floor argument (1.3's forcing function) as `adminRequired: boolean`, with `ADMIN_REQUIRED = true` and `ADMIN_OPTIONAL = false` constants. Resolve it as `!membership.role.admin`. The `member` arm consults nothing: `writableMembership`'s own SQL filter already admits exactly the roles that floor passes, so testing them again was a guard re-deciding what the read decided.
- [x] 16.4 Map the column back to its record at the DAL boundary (`ROLES.find((r) => r.value === row.role)`) in `writableMembership`, `ownsProfile` and the membership reads in `profile.members.ts`, `profile.active.ts`, `profile.identity.ts`, `profile.self.ts`. This is the one seam; no other module sees a role string.
- [x] 16.5 SQL predicates send `.value` — `db/schema.ts`'s two CHECKs and both partial unique indexes, `profile.members.actions.ts`'s `ne`/`eq` clauses, `profile.identity.ts`, and the hard-coded `'self'` and `'owner'` role projections in `profile.self.ts` and `profile.actions.ts`.
- [x] 16.6 `lib/data/purchase.ts` — master unclaim reads `role.admin`. The `actorRole` parameter stays nullable (`RoleShape | null`); the null guard is the caller's absent-membership signal, not a separate floor.
- [x] 16.7 The four `belowOwnerFloor` call sites (`ListDetails`, `EditListBody`, `ItemFormBody`, `PurchaseFlowContainer`) read `!role.admin`. `PurchaseFlowContainer` is the only client one — its `disabled` state is decided by the server component that renders it, per the affordance requirement.
- [x] 16.8 `AltvatarSpacePage.tsx:43,45` — `isOwner` and `managed` read `role.admin` and `!role.isSelf`. These are the two surfaces that had routed around the predicates entirely; the new requirement forbids the inline comparison.
- [x] 16.9 `PermissionsSection`'s sole-owner count reads `admin`. The section renders for managed profiles only, which carry no `self` row, so `admin` and `owner` pick out the same rows there — the comment already records why.
- [x] 16.10 `profile.members.actions.ts` — role narrowing at the three endpoints becomes "resolve the value to a record, refuse when absent or `isSelf`"; `actor.role === 'self'` becomes `actor.role.isSelf`. C19's and C20's refusals keep their current shape and message.
- [x] 16.11 Label consumers (`RoleTag`, `ProfileCard`, `MemberRow`, `InviteRow`, `InviteFlow`) read `role.label`; the invite and role-change dropdowns iterate `ROLES.filter((r) => !r.isSelf)`.
- [x] 16.12 `scripts/seed-dev-users.ts`, `test/helpers/profile.ts`, `test/helpers/seedFollowGraph.ts` and the role-carrying unit fixtures send records or `.value` as their seam requires.
- [x] 16.13 Tests for the new requirement's two scenarios: a right is read off the record rather than compared against a name, and the stored value has one home outside the mapping boundary, SQL predicates and migration history.
- [x] 16.14 Confirm review findings A6, B12 and C16 are dissolved rather than open — the code each names (`FLOOR_ROLES.member`'s coupling, role→label homes, `ROLE_LABELS: Record<string, string>`) no longer exists. Record the disposition in `review.md`.

## 17. Gates — round 4

Re-run after §16 lands.

- [x] 17.1 `npm run lint`
- [x] 17.2 `npx tsc --noEmit`
- [x] 17.3 `npm run build`
- [x] 17.4 `npm run test:coverage`
- [x] 17.5 `npm run test:e2e`

## Gates — round 3

Open `Fix now` findings from `review.md` Round 3. Resolve each one there before
checking it off.

- [x] B4 — `ShareMenuItem`'s hidden-list branch still fires the owner-floor `setListVisibility` and shares regardless of the result; reachable from the collapsed hero
- [x] T11 — the role-name scan misses `role.value === '…'` and bare literals; widen it and add a negative control
- [x] T12 — drive `ListDetails`, `EditListBody` and `ItemFormBody` with a `manager` identity and assert the affordances render disabled
- [x] A1 — reconcile task 16.3 and the two floor bullets with the `ADMIN_REQUIRED`/`ADMIN_OPTIONAL` vocabulary that shipped (or introduce `RoleFloor`)
- [x] A2 — reconcile task 16.6's second clause with `canRemovePurchase`'s still-nullable predicate
- [x] A3 — reconcile task 16.7 and the server-resolution clause with `PurchaseFlowContainer` deciding below the client boundary — _dropped at adjudication_
- [x] B5 — pass the two fields the client boundary reads rather than the whole `ProfileMembershipView` with its rendered SVG — _dropped at adjudication_
- [x] B6 — one home for the roster rows' role-menu block shared by `MemberRow` and `InviteRow`
- [x] B7 — `dev-list-workshop-wishlist` has no consumer; reconcile with LOCALDEV.md:48 and sweep the :50 enumeration
- [x] B8 — finish the Profiles → Altvatars label sweep in `menu-system` and `app-frame`
- [x] C9 — drop the vacuous `inArray` role filter in `writableMembership`
- [x] C10 — the raw-SQL role-literal builders in `db/schema.ts` quote without escaping and invert the layering — _dropped at adjudication_
- [x] T13 — restore `profile_id` on the three `Item.test.tsx` item fixtures and drop the stray `actor` key
- [x] T14 — name the floor in each parameterized case in `profile.gate.test.ts`
