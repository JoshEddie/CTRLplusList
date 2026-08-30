## 1. The gate learns the floor

- [x] 1.1 Add `role` to `writableMembership`'s projection in `lib/data/profile.gate.ts` and to its return type — the row is already fetched, so this adds no round trip.
- [x] 1.2 Define the two-valued floor type (`'member' | 'owner'`) and its role sets in `profile.gate.ts`: `member` admits `self | owner | manager`, `owner` admits `self | owner`. Keep `WRITE_ROLES` as the selectability set the read still filters on.
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

- [x] 4.1 Create `lib/data/profile.members.ts` with the Permissions section's roster read: every membership on the named profile with the member's profile name, avatar inputs, role and `last_active_at`, tagged `profileMembers` + `profilesOfUser`.
- [x] 4.2 Revert any mutual-follow extraction already applied for the retired add pool: `getEligiblePurchasers` (`lib/data/profile.ts:156`) keeps its pair computation inline, and no shared mutual-follow helper survives — admission no longer reads the follow graph.
- [x] 4.4 Create `lib/data/profile.members.actions.ts` with a shared owner-floor check that loads the acting account's membership on the **named** profile (uncached) and refuses below `owner` — never passing `authedWriter` and never comparing the acting profile.
- [x] 4.5 Remove `addMember` and the candidate-pool read if already applied. Admission is §6's invite link and nothing else creates a membership row for another account.
- [x] 4.6 `setMemberRole(profileId, userId, role)` — refuses when the target membership is the actor's own, in either direction. No survivor guard: the actor is necessarily a surviving owner, so one would be the redundant kind.
- [x] 4.7 `removeMember(profileId, userId)` — permits an owner to remove anyone and any member to remove themselves; refuses a manager targeting anyone else.
- [x] 4.8 Fold the ≥1-owner floor into the removal statement itself: `db.delete(profile_members).where(and(eq(user_id), eq(profile_id), exists(<aliased self-join for a surviving self-or-owner member>)))`, with zero rows affected as the refusal. Drizzle `exists` over an alias of the same table; no raw SQL, no read-then-write.
- [x] 4.9 Every action that writes a membership row — role change, removal, and §6's redemption — fires `cacheTags.profilesOfUser(<the affected member's account>)` as well as the coarse `profileMembers`; a removal must invalidate the removed account's tag, not only the acting owner's. Minting fires neither: no cached read lists invites.

## 5. The Permissions section

- [x] 5.1 Render the Permissions section after the Settings form in the profile's space (`app/(main)/altvatar/[id]/AltvatarSpacePage.tsx`), for a managed profile only — never for a self-profile.
- [x] 5.2 Build the member roster: one row per membership with profile name, avatar, role, and last-active. Extract the row as its own component rather than nesting it inline.
- [x] 5.3 Render last-active relative and coarse ("3 days ago"); a membership never acted as renders as never and sorts after every membership carrying a value.
- [x] 5.4 Replace the add-member flow with the invite-minting flow over `form-shell-system`: a role choice of `owner | manager` defaulting to `manager`, and the minted link presented for the owner to copy, stating the profile and role it grants. No candidate pool and no empty state — there is nobody to list.
- [x] 5.5 Build the role-change control per `menu-system`, absent from the viewer's own row (self-demotion is not offered).
- [x] 5.6 Route removal through `confirm-dialog-system`, on another member's row and on the viewer's own alike; dismissal deletes nothing.
- [x] 5.7 For a `manager` viewer, render every owner-floor control **disabled** rather than absent (invite minting, role change, removal of another member), and leave their own removal control operable. Guard each `onClick`, since `aria-disabled` on a menu row is advisory.

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
- [x] 9.2c Unit-test revocation and invite re-roling: an owner's revoke makes the token refuse, a role change is honoured at redemption, both refuse on a spent token without touching the membership it granted, and a manager is refused either.
- [x] 9.5a Component-test the roster's invite row (copy, re-role, revoke, dismissal) and the invite surface (what it states, accept, refusal, the signed-out door).
- [x] 9.2b Unit-test redemption: a valid token writes the membership at the token's role; a spent token, an expired token and an unknown token each refuse with the same response and write nothing; a redeemer already holding a membership keeps their role while the token is consumed; a block edge with the minting owner refuses.
- [x] 9.3 Unit-test the ≥1-owner floor: the sole owner's self-removal refused with the row intact, one of two owners removed successfully, and the profile's only manager removed successfully.
- [x] 9.4 Unit-test `canRemovePurchase`'s new role parameter: master unclaim refused for `manager`, admitted for `owner` and `self`, and both self-profile legs still admitting a manager's own claim.
- [x] 9.5 Component-test the Permissions section: the manager view rendering forbidden controls disabled rather than absent, and their own removal control operable.
- [x] 9.6 Add the manager-role Playwright spec (`e2e/`), pinning the context to the seeded `dev-profile-managed` seat via the application's own selection cookie. Assert both halves: the writes a manager may make, and an owner-floor write refused past its disabled control with a reload showing the target unchanged. No new seed rows. Ordering is left out — dnd-kit's sensor does not arm under Playwright, no spec in the suite has ever driven a drag, and `updatePriority` takes the same floor as the writes that are covered.
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
