# Tasks — profiles-schema-phase-2

Ordered so the tree is never in a state where a profile column exists without
the code that reads it, or a comparison is rewritten before the column it
compares. Sections 1–3 land the columns and the seam; 4–7 move every read,
write, and comparison; 8–9 remove dead code and repoint fixtures; 10 is the
evidence.

## 1. Schema definitions

- [x] 1.1 Add `lists.profile_id` and `items.profile_id` to `db/schema.ts` — nullable at this step, FK to `profiles.id`, `ON DELETE CASCADE` matching the existing `user_id` columns
- [x] 1.2 Add `user_follows.followee_profile_id` (FK `profiles.id`, cascade); leave `follower_id` on `users`
- [x] 1.3 Add `user_blocks.blocker_profile_id` and `blocked_profile_id` (FK `profiles.id`, cascade)
- [x] 1.4 Add `purchases.profile_id` and `purchases.claimed_by_profile_id` — both nullable, `profile_id` cascade and `claimed_by_profile_id` `ON DELETE SET NULL`, mirroring `user_id` and `claimed_by`
- [x] 1.5 Recreate the `user_follows` composite primary key over `(follower_id, followee_profile_id)` and the `user_blocks` one over `(blocker_profile_id, blocked_profile_id)` in the schema definition
- [x] 1.6 Add the partial unique index on `purchases (item_id, profile_id) WHERE profile_id IS NOT NULL`, keeping the existing account-valued `purchases_item_user_unique_idx` beside it
- [x] 1.7 Relax `lists.user_id`, `items.user_id`, `user_follows.followee_id`, `user_blocks.blocker_id`, and `user_blocks.blocked_id` to nullable in the schema definition
- [x] 1.8 Delete the `saved_lists` table definition and its relations from `db/schema.ts`

## 2. Forward migration

Statement order is D1's and must not be rearranged — a `SET NOT NULL` ahead of
its backfill fails on the first existing row. Every cross-statement assertion
lives inside a single `DO $$` block; no interactive transaction anywhere.

- [x] 2.1 Generate the Drizzle migration from the section-1 schema and hand-complete it, following the `drizzle/0001_black_legion.sql` precedent for `IF [NOT] EXISTS` guarding and idempotence
- [x] 2.2 Order the generated statements: add all seven columns nullable, then backfill each through the owning account's self-profile
- [x] 2.3 Add `SET NOT NULL` for `lists.profile_id`, `items.profile_id`, `user_follows.followee_profile_id`, `user_blocks.blocker_profile_id`, and `blocked_profile_id`, each after its own backfill and gated on a `DO $$` assertion that the backfill left no NULL behind
- [x] 2.4 Create the new `purchases (item_id, profile_id)` partial unique — before any other statement touching `purchases`, so no window exists without a purchaser guarantee
- [x] 2.5 Drop and recreate the `user_follows` and `user_blocks` primary keys over the profile columns, keeping each drop and its recreate adjacent
- [x] 2.6 `DROP NOT NULL` on the vacated columns, including `user_follows.followee_id`, `user_blocks.blocker_id`, and `blocked_id` where the dropped primary key leaves an implicit `NOT NULL` behind
- [x] 2.7 Drop the `saved_lists` table
- [x] 2.8 Apply the migration against local Postgres via `npm run db:reset:dev` and confirm it re-runs clean a second time (idempotence)

## 3. Identity resolution seam

- [x] 3.1 Create `lib/data/profile.ts` exporting `getUserIdentity(userId) → { userId, profile }`, resolving the account's self-profile row and wrapped in React `cache()` — not `'use cache'`, so no cache tag and no `updateTag` obligation is introduced
- [x] 3.2 Confirm the new resolution lands in `profile.ts` rather than `user.ts` — `user.ts`'s own size is settled by the D13 split in section 12, not by this task

## 4. Data-layer reads

- [x] 4.1 `lib/data/list.ts` — move owner joins and ownership predicates onto `lists.profile_id`; drop the `email` selection from the remaining list reads
- [x] 4.2 `lib/data/item.ts` — scope `getItemsByUser` by the viewer's profile; move `getItemsByListId`'s owner resolution to the list's owning profile
- [x] 4.3 `lib/data/purchase.ts` — rewrite `isSelf`, `claimedByViewer`, and both the purchaser and item-owner arms of `canRemovePurchase` as profile-id comparisons; leave the attributed-claim inequality `p.claimed_by !== p.user_id` intact over its now-profile-valued columns
- [x] 4.4 `lib/data/purchase.ts` — restate the eligible attributed-purchaser pool over the profile follow graph, resolving each follow leg's account through `profiles.user_id`, so a profile with no account yields the empty pool without a special case
- [x] 4.5 `lib/data/user.ts` — move follow and block reads onto `followee_profile_id` and the profile-valued block columns; leave `follower_id` and `last_seen_following_at` account-valued
- [x] 4.6 `lib/data/visit.ts` — leave `list_visits` reads account-keyed; verify no profile id reaches them
- [x] 4.7 `lib/listAccess.ts` — `guardListViewable` and the block gate compare profile ids on both sides
- [x] 4.8 If `lib/data/purchase.ts` crosses 400 lines under the rewrite, split it on the seam `data-layer-organization` already names

## 5. Data-layer actions

- [x] 5.1 `list.actions.ts` — `createList` and `updateList` write `lists.profile_id` and stamp `updated_by_user_id`; `setListVisibility` authorizes against the list's owning profile and stamps nothing
- [x] 5.2 `item.actions.ts` and `item.associations.ts` — `createItem` and `updateItem` write `items.profile_id` and stamp `updated_by_user_id`; association updates authorize against the item's owning profile; archive, delete, and reorder stamp nothing
- [x] 5.3 `listItems.actions.ts` — `setListItems` and `removeListItem` authorize against the list's owning profile
- [x] 5.4 `purchase.actions.ts` — `createPurchase` writes the caller's self-profile as asserter on every authenticated path, the caller's self-profile as purchaser on a self-claim, and re-verifies an attributed target against the profile-graph pool; `removePurchase` authorizes the three profile-id comparisons
- [x] 5.5 `user.actions.ts` — `followUser` / `unfollowUser` target `followee_profile_id`; `blockUser` / `unblockUser` write the profile-valued block columns as exactly one row, with `blockUser`'s insert-block-row-first ordering preserved verbatim
- [x] 5.6 `visit.actions.ts` — `bookmarkList`'s owner check compares profile ids while the row it writes stays keyed by the caller's account; the rejection path still writes nothing and skips `updateTag('list_visits')`
- [x] 5.7 Confirm no action reads `profile_members` and no containment helper is introduced

## 6. Comparison rewrites in pages and components

- [x] 6.1 `app/(main)/lists/[id]/page.tsx:44` — `isOwner` compares the list's owning profile against the resolved acting profile
- [x] 6.2 `ListItemsSection.tsx:28` — same rewrite
- [x] 6.3 `ListHeroSection.tsx:30` — same rewrite, and the owner byline link targets `/user/{owning profile id}`
- [x] 6.4 `Item.tsx` — rename the `user_id` prop to `profile_id` and rewrite both `:68` (`isOwner`) and `:226` (self-marking of an attributed claim) as profile-id comparisons
- [x] 6.5 Rename the prop through every component that threads it down to `Item.tsx`
- [x] 6.6 Sweep the page and component tree for any surviving comparison of a session account id against an ownership column; each is a silent always-false

## 7. Profile route and inbound links

- [x] 7.1 `/user/[id]` resolves its `[id]` segment as a profile id
- [x] 7.2 `ConnectionRow`, `UserCard`, and `ListDetails` pass a profile id in the profile-route href
- [x] 7.3 `ProfileHeaderSection`, `UserCard`, `ConnectionRow`, and `ListCard` render the owning profile's name and image
- [x] 7.4 The home digest's My Lists rail resolves through the viewer's profile; Bookmarks and Recently visited stay account-keyed

## 8. Dead code

- [x] 8.1 Delete `getLists()` from `lib/data/list.ts` — exported, no callers
- [x] 8.2 Confirm no application code under `app/` or `lib/` references `saved_lists` after the section-1 deletion

## 9. Fixtures and tests

- [x] 9.1 Repoint seed fixtures onto profile ids; the seeded managed profile gains no content
- [x] 9.2 `db/__tests__` — constraint coverage for the seven new columns' nullability and delete behavior, the two recreated composite primary keys, and the new partial unique
- [x] 9.3 Update data-layer unit suites for `list.ts`, `item.ts`, `purchase.ts`, `user.ts`, `visit.ts`, and `listAccess.ts` to assert the profile-id comparisons
- [x] 9.4 Update action suites for the six `*.actions.ts` modules, including `updated_by_user_id` stamped on the four content-bearing writes and absent on the rest
- [x] 9.5 Update the affected page and component suites for the renamed prop and the rewritten `isOwner` comparisons
- [x] 9.6 Leave `e2e-critical-flows` and `e2e-management-flows` untouched except for the profile-route address literals and comment-only updates naming a DAL function this change renames — an edit touching a spec's executable lines is a defect signal, not maintenance. Task 7.1 re-points `/user/[id]` at a profile id, so `follow.auth.spec.ts`'s two `/user/dev-friend-dave` navigations become `/user/self-dev-friend-dave`; the behavior under test is unchanged. The original "untouched, full stop" wording missed both that the URL identifier itself moves and that a header comment naming a renamed DAL function goes stale with it
- [x] 9.7 Refine `acceptance.md`'s flows with the literal handles and routes as they land — refine, not rewrite; flow identity and journey scope stay as drafted
- [x] 9.8 Restart the dev server after the reseed so `'use cache'` DAL results are not stale

## 10. Pre-merge

All five gates run locally against the author's real `.env.local`. This change
is executable throughout, so no gate is exempt.

- [x] 10.1 `npm run lint` passes with zero errors and zero non-size warnings
- [x] 10.2 `npx tsc --noEmit` passes with zero errors
- [x] 10.3 `npm run build` completes successfully
- [x] 10.4 `npm run test:coverage` passes with zero failing tests
- [x] 10.5 `npm run test:e2e` passes with zero failing tests
- [x] 10.6 `openspec validate --strict` passes for this change

## 11. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.
>
> _This section's round is history: the implementation moved far enough that
> `review.md` was reset for a fresh review not derived from it. The referenced
> round is no longer in the file, and every item below is already resolved._

- [x] 11.1 A1 `user.ts` grew into the yellow band while task 3.2 claims it did not — resolved — _settled at adjudication: D13 split (§12) returns all four modules to the green band, lint reports zero warnings, and the spec clause and task 3.2 are reworded; see round 1 `### Adjudications`_
- [x] 11.2 A2 owner name/avatar moved into the `lists`-tagged cache with no task or spec record — resolved — _dropped at adjudication: #199 moves avatars onto `profiles`, retiring the uncached rationale; see round 1 `### Adjudications`_
- [x] 11.3 A3 two `profiles` reads live in `user.actions.ts` instead of the profile module — resolved — _settled at adjudication: `blockUser` moved to `profile.actions.ts` (§12.3) and the amended id-kind rule no longer assigns `getClaimPickerForItem` to `profile`; see round 1 `### Adjudications`_
- [x] 11.4 A4+B8+C18 `getUserById` left exported with no production caller — resolved
- [x] 11.5 A5+B11 `list-item-management` delta still names `getItemsByUser` — resolved
- [x] 11.6 A6+B9+B13+C19 rename sweep stops short — the following-feed thread still names accounts while carrying profiles: `getFollowingFeedUsers`, `FollowingFeedUser`, `FollowingPage`'s `feedUsers`, `UserCard`'s `user` prop, and both call sites (`UserCardGrid`, `FollowingRail`), plus their five suites — resolved
- [x] 11.7 B10 three active specs name DAL functions this diff renames — resolved
- [x] 11.8 B12 LOCALDEV.md's `BYPASS_ACTIVE_PROFILE` forward reference becomes false — resolved
- [x] 11.9 B14 identity pair re-declared inline instead of using `UserIdentity` — resolved
- [x] 11.10 B15 one untyped `targetId` prop dispatches across both id spaces — resolved — _filed #304 at adjudication: branded id types are a repo-wide call for the end-of-map sweep; T23 (11.16) is the interim catch_
- [x] 11.11 B16 viewer-identity resolution copied verbatim into 14 components — resolved
- [x] 11.12 C17 two dead exports migrated rather than deleted — resolved — _filed #304 at adjudication; see round 1 `### Adjudications`_
- [x] 11.13 C20 `// Not cached:` rationales rewritten into non-reasons — resolved — _filed #304 at adjudication; see round 1 `### Adjudications`_
- [x] 11.14 C21 viewer-controls predicate bound and then restated verbatim — resolved
- [x] 11.15 T22 account-valued purchase partial unique lost its coverage — resolved — _dropped at adjudication: #191 drops that index deliberately, so the test would be written and deleted one chunk later_
- [x] 11.16 T23 per-action `targetId` id kinds unasserted in `FollowersSection` — resolved
- [x] 11.17 T24 purchaser avatar's two-hop relation never exercised non-null — resolved — _dropped at adjudication: #199 rewrites the `purchaserProfile → user → image` hop onto `profiles`_
- [x] 11.18 T25 `ManagedProfileOwnerId_IgnoresAccountlessProfile` names an unsupplied input — resolved
- [x] 11.19 `npm run lint` — zero errors, zero non-size warnings
- [x] 11.20 `npx tsc --noEmit` — zero errors
- [x] 11.21 `npm run build` — completes successfully
- [x] 11.22 `npm run test:coverage` — 248 files / 2822 tests pass; 100% lines, 100% functions
- [x] 11.23 `npm run test:e2e` — 56 pass, 1 fail: `remove-list-item.auth` cannot see its seeded item on `/items` page 1, the shared dev DB having grown to 215 active items against a 24-per-page library. Re-run after a reseed — _superseded by 14.17, which re-ran the same gate at 57 passed / 0 failed and traced the failure to a stale `next dev` server holding the port, not DB drift_

## 12. Module split on id kind (D13)

Reads and actions whose leading identity parameter flipped from an account id to a
profile id move to the `profile` pair; everything still leading with an account id
stays. Sizes are a consequence, not the trigger.

- [x] 12.1 Move `getFollowersOfProfile`, `getBlockedByProfile`, `hasBlocked`, `getEligiblePurchasers`, and `getProfileForUser` from `lib/data/user.ts` to `lib/data/profile.ts`, unchanged apart from imports
- [x] 12.2 Rename `getProfileForUser` to a profile-first name in its new home and repoint `ProfileHeaderSection` and its suite — now `getProfileForViewer`
- [x] 12.3 Create `lib/data/profile.actions.ts` carrying the module-level `'use server'` directive, and move `followUser`, `unfollowUser`, `blockUser`, and `unblockUser` into it verbatim — `blockUser`'s statement ordering and its inline account resolution included
- [x] 12.4 Repoint every import of a moved export across `app/` and `lib/`
- [x] 12.5 Move each moved export's test block to the suite colocated with its new module, per `testing-foundation`'s colocation rule
- [x] 12.6 Confirm all four modules land under 300 code lines and `npm run lint` reports zero size warnings

## 13. Identity carries the acting profile row (owner-directed)

Raised by the owner while applying §11.11: two surfaces render the acting
profile's display name, and the ids-only pair left them reading the account's
name instead. The resolution already loads the row, so it returns the row.

- [x] 13.1 `UserIdentity` becomes `{ userId, profile: ProfileTable }` in `lib/types.ts`, with `ProfileTable` declared beside it; `getUserIdentity` drops its `columns` projection and returns the row
- [x] 13.2 Repoint every `identity.profileId` / `viewer.profileId` read across `app/` and `lib/` to `identity.profile.id`
- [x] 13.3 `app/(main)/items/page.tsx` and `ItemsContainer` derive the viewer display name from `identity.profile.name`, and drop the `auth()` + `getUserIdByEmail` pair each kept only for it
- [x] 13.4 Suites mocking the identity pair build its row through `makeProfile` (`test/helpers/profile.ts`) rather than an inline literal
- [x] 13.5 Restate the shape in `proposal.md`, `design.md` D2, task 3.1, and the `data-layer-organization` delta's shared-shape scenario

## 14. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.
>
> _This section's round is history: the implementation moved far enough that
> `review.md` was reset for a fresh review not derived from it. The referenced
> round is no longer in the file, and every item below is already resolved._

- [x] 14.1 A27 the id-kind domain rule as written claims six reads that stay in their table domains — resolved
- [x] 14.2 A28 "a data module SHALL NOT declare a type its callers import" is contradicted by `ClaimPicker` and `ItemData` — resolved
- [x] 14.3 A29+C30 `CLAUDE.md:106` links `.claude/basics.md`, which the same delta's `.gitignore:74` ignores — resolved — _dropped by owner instruction: out of this change's scope; see round 2 `### Adjudications`_
- [x] 14.4 A31 `.gitignore`, `CLAUDE.md` and `adjudicate-review/SKILL.md` change with no covering task, and the SKILL.md edit orphans its bullet list — resolved — _dropped by owner instruction: out of this change's scope; see round 2 `### Adjudications`_
- [x] 14.5 A32+C33 `lib/data/profile.ts:12` comment names the removed `profileId` field — resolved
- [x] 14.6 B34 profile → account resolution written twice (`isEligiblePurchaser` / `getEligiblePurchasers`) — resolved
- [x] 14.7 B36 `DATABASE.md:31` still describes `saved_lists` as preserved after migration 0011 drops it — resolved
- [x] 14.8 B37 `proposal.md` Modified Capabilities omits the three delta specs added for B10 — resolved
- [x] 14.9 C38 `user.session.ts:22` comment declares the superseded `{ userId, profileId }` shape — resolved
- [x] 14.10 C40 `ListDetails.tsx:86` re-spells `showOwnerControls` inline beside the fixed viewer branch — resolved
- [x] 14.11 T42 four test names fossilized on the pre-rename account meaning — resolved
- [x] 14.12 T43 three constraint tests use a bare `_Insert` token while asserting specific values — resolved
- [x] 14.13 `npm run lint` — zero errors, zero non-size warnings
- [x] 14.14 `npx tsc --noEmit` — zero errors
- [x] 14.15 `npm run build` — completes successfully
- [x] 14.16 `npm run test:coverage` — passes with every threshold met; 100% lines, 100% functions, 99.94% statements, 99.07% branches
- [x] 14.17 `npm run test:e2e` — 57 passed, 0 failed. Round 1's 11.23 failure (`remove-list-item.auth`) does not reproduce: a stale `next dev` server was holding the port, not DB drift; killing it and re-running cleared it with no reseed

## 15. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.
>
> _This is the round-1 section of the **fresh** review that replaced the discarded
> rounds recorded in §11 and §14 — its IDs resolve against `review.md` Round 1, the
> only round in that file._

- [x] 15.1 A2 `tasks.md` 11.23 stays unchecked though 14.17 re-ran the same gate green — resolved — _reconcile side settled at adjudication: 11.23 is an obsolete gate from a discarded round; check or delete it during this section's e2e re-run_
- [x] 15.2 A3 task 2.4's "before any other statement touching `purchases`" clause contradicts the migration's step-4 index creation — resolved — _dropped at adjudication: tasks.md is point-in-time and the migration's guarantee holds; see round 1 `### Adjudications`_
- [x] 15.3 A4 `e2e/home-rails.auth.spec.ts` carries a comment-only DAL-name edit outside the one permitted class of e2e edit — resolved — _reconcile side settled at adjudication: widen the bar in `design.md:13`, `proposal.md:9` and 9.6; the edits are correct, the bar was written too tight_
- [x] 15.4 A5+B6 the `grill-me` rewrite rides along with no covering task and leaves a zero-caller duplicate of the plugin grilling skill — resolved — _dropped at adjudication: unrelated artifact staged by accident, not a finding of this change; see round 1 `### Adjudications`_
- [x] 15.5 B7 the list-hero owner avatar moves from an uncached read into the `lists`-tagged cache, so it can pin a stale `users.image` — resolved — _dropped at adjudication: already settled at §11.2; #199 retires the `users.image` rationale; see round 1 `### Adjudications`_
- [x] 15.6 B8 the `server-endpoint-authorization` delta still homes four follow-graph actions in `user.actions.ts` after D13 moved them — resolved
- [x] 15.7 B9 the active `following` spec's no-transaction requirement points at `user.actions.ts` and this change's delta does not touch it — resolved
- [x] 15.8 B10 `selfProfileOf` exists in three copies that must stay in lockstep and drift silently — resolved
- [x] 15.9 B11 `adjudicate-review` step 2 delegates to a grilling skill whose cadence contradicts the step's own retained per-finding requirements — resolved — _dropped at adjudication: unrelated staged artifact, same rule as 15.4 and the §14.4 instruction; see round 1 `### Adjudications`_
- [x] 15.10 B12 six page surfaces still hand-roll `auth()` + `getUserIdByEmail()` instead of the `authedUserId()` seam — resolved — _reconcile side settled at adjudication: `authedUserId()`, not `authedIdentity()` — all six need only `users.id`, and `authedIdentity()` would add an unread `profiles` query plus a redirect on a missing profile row_
- [x] 15.11 C13 the eligible-purchaser JSDoc is orphaned onto `accountsOfProfiles` — resolved
- [x] 15.12 C14 `blockUser` runs its profiles lookup before the block insert, contradicting its own block-first rationale — resolved
- [x] 15.13 C15 `ConnectionsAction`'s `targetId` carries account ids for `remove` and profile ids for the other three — resolved — _dropped at adjudication: already filed as #304 with its interim test catch landed; see round 1 `### Adjudications`_
- [x] 15.14 C16 `lib/data/visit.ts`'s "Not cached" comment lost its WHY and now states only WHAT — resolved
- [x] 15.15 C17 migration 0011's `DROP TABLE … CASCADE` stands against DATABASE.md's unamended "forward-only, no DROPs" — resolved — _dropped at adjudication: the rule stands as a general principle by owner decision, overruled case by case; see round 1 `### Adjudications`_
- [x] 15.16 T18 both `removeFollower` tests assert the vacated `followee_id`, leaving the profile-valued predicate unpinned — resolved
- [x] 15.17 T19 the follow/block/list/item fixtures still write account columns production has vacated — resolved
- [x] 15.18 T20 no test asserts `purchases_item_user_unique_idx` still exists, so an early drop stays green — resolved — _dropped at adjudication: already settled at §11.15; #191 drops that index in phase 3; see round 1 `### Adjudications`_
- [x] 15.19 `npm run lint` — zero errors, zero non-size warnings
- [x] 15.20 `npx tsc --noEmit` — zero errors
- [x] 15.21 `npm run build` — completes successfully
- [x] 15.22 `npm run test:coverage` — 248 files / 2819 tests pass; 100% lines, 100% functions, 99.94% statements, 99.07% branches
- [x] 15.23 `npm run test:e2e` — 57 passed, 0 failed, after the runner's own wipe + reseed (which also exercises the seed script's move onto the shared `selfProfileOf`)

## 16. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.
>
> _Round 2 of the **fresh** review whose round 1 is §15 — its IDs resolve against
> `review.md` Round 2, not the discarded round-2 history recorded in §14._

- [x] 16.1 A1+C2 spec scenario, comment and test all claim the block insert is the action's first database statement, which the session seam makes impossible — resolved — _narrowed to the mutation's first statement in `specs/following/spec.md` and `profile.actions.ts`; the test's own comment already named the leading `authedIdentity` lookup and needed no edit_
- [x] 16.2 C3 `visit.ts`'s restored "Not cached" WHY names a hazard its own write path rules out — resolved — _dropped at adjudication: #202/#183 make `profiles.name` editable inside this map, so the stated rationale is early rather than wrong; see round 2 `### Adjudications`_
- [x] 16.3 B4+T5 `getUserById` (and `getListsSharedByProfile`) left as caller-less exports with live tests, against the rule that deleted `getLists()` — resolved — _dropped at adjudication: a named inhabitant class of #304, which already records it; see round 2 `### Adjudications`_
- [x] 16.4 B6 `ChooseItemsBody` still hand-rolls `auth()` ahead of `authedIdentity()`, with a guard dead against its own control flow — resolved — _dropped at adjudication: a named inhabitant class of #304, and #302 re-cuts page auth shape regardless; see round 2 `### Adjudications`_
- [x] 16.5 T7 no fixture gives a profile a name differing from its account, so the profile-name move is unfalsifiable by the suite — resolved — _`seedUsers` takes an optional `profile_name`; `list.test.ts`'s `-ProfileProjection` case now seeds account `Owen` against profile `Not Owen` and asserts the profile's_
- [x] 16.6 T8 the self-profile id scheme is hand-copied into `listAccess.test.ts` and `seedVisitGraph.ts` instead of importing `selfProfileOf` — resolved — _both import it now; `seedVisitGraph`'s vacated `lists.user_id` write (the T19 residual) went with it_
- [x] 16.7 T9 the `updated_by_user_id` non-content-writes scenario pins two of its five triggers — resolved — _`Reorder_LeavesUpdatedByUserIdUnstamped` and `TouchedRows_LeaveUpdatedByUserIdUnstamped` added; delete leaves no row to assert on_
- [x] 16.8 `npm run lint` — zero errors, zero non-size warnings
- [x] 16.9 `npx tsc --noEmit` — zero errors
- [x] 16.10 `npm run build` — completes successfully
- [x] 16.11 `npm run test:coverage` — 248 files / 2821 tests pass; 100% lines, 100% functions, 99.94% statements, 99.07% branches
- [x] 16.12 `npm run test:e2e` — 57 passed, 0 failed
