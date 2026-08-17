---
review: spec-review
target: profiles-schema-phase-2
anchor: 2e5f79580b146af307ad2843625ca3ee1c2b81f1
diff-source: git diff --staged
round: 3
---

<!-- Rounds 1 and 2 of this change's review history were discarded by owner
     decision: the implementation moved far enough that a fresh review not
     derived from them was worth more than continuity. Their gate sections
     survive as history in tasks.md §11 and §14, both fully resolved. The
     round below is a fresh full review and depends on neither. -->

## Round 1 — spec-review (2026-08-15)

The account→profile rewrite is carried through consistently — every ownership
comparison moved to profile ids together, the migration is guarded throughout,
and the identity seam holds. What remains is edge work: two spec documents still
address the follow-graph actions at their pre-move home, a handful of test
fixtures still write the columns production has vacated, and the hero avatar
picked up a caching regression on its way through the new nested read.

**Scope:** `git diff --staged` (160 files) · profiles-schema-phase-2 (Active)

### Alignment

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1 | Major | `review.md:1` | tasks.md §11 and §14 are gate sections for rounds 1 and 2 citing 30 durable IDs and two Adjudications subsections, but review.md is the propose-time scaffold (`round: 0`, `anchor: TBD`, no rounds). The two rounds exist nowhere in the repo. | Drop | Owner reset review.md deliberately — the implementation changed too broadly for the prior rounds to remain a useful base, so a fresh review was run instead. Both sections are fully checked and wedge nothing; their lead-ins are annotated to say the referenced rounds were discarded. |
| A2 | Minor | `tasks.md:132` | 11.23 (`npm run test:e2e`) is the file's only unchecked box, recorded 56 pass / 1 fail. §14's re-run of the same gate (14.17) records 57 passed / 0 failed and attributes the round-1 failure to a stale `next dev` server holding the port, not DB drift. The round-1 gate never clears and `/landfall`'s all-tasks-checked gate wedges on a gate a later round already proved green. | Fix now | `tasks.md:132` (11.23, unchecked) vs `tasks.md:180` (14.17, same gate passing); `finding-format.md` § Gate sections — "Exits" / "Superseding rounds". Reconcile EITHER: check 11.23 off with the round-2 re-run named in a trailing italic note OR annotate it superseded by 14.17 and check it. |
| A3 | Minor | `tasks.md:29` ↔ `drizzle/0011_illegal_wind_dancer.sql:143` | Task 2.4 is `[x]` and states the new `purchases (item_id, profile_id)` partial unique is created "before any other statement touching `purchases`". The migration creates it at step 4 — after both `purchases` column adds, both FK constraints, and both backfills. The guarantee the task cites is in fact met (the account-valued `purchases_item_user_unique_idx` is never dropped), so the SHALL is satisfied while the task's ordering clause and the migration disagree. | Fix now | `tasks.md:29`; `specs/profiles-data-model/spec.md` — "The index SHALL NOT be created by dropping the existing one first" + Scenario "No window without a purchaser uniqueness guarantee". Reconcile EITHER: reword 2.4 to the guarantee that actually holds OR move the `CREATE UNIQUE INDEX` ahead of the `purchases` column/FK/backfill statements. |
| A4 | Minor | `e2e/home-rails.auth.spec.ts:5` | The change's acceptance bar permits exactly one class of e2e edit — the `/user/[id]` address literals — and declares any other e2e diff a defect signal. This file carries a second, comment-only edit updating two DAL names in a header comment (`getListsByUser` → `getListsByProfile`, `getFollowingFeedUsers` → `getFollowingFeedProfiles`). Behaviour untouched; the stated bar and the diff disagree. | Fix now | `design.md:13` and `proposal.md:9` ("pass with one class of edit allowed: the `/user/[id]` address literals … a diff anywhere else is a defect signal, not maintenance"), restated as `tasks.md:89` (9.6). Reconcile EITHER: revert the comment edit OR widen 9.6 / design.md:13 to allow comment-only DAL-name updates. |
| A5+B6 | Minor | `.claude/skills/grill-me/SKILL.md:7` | The diff rewrites the repo-owned grill-me skill into a near-verbatim copy of the installed plugin skill (`mattpocock-skills:grilling`) — same design-tree framing, round/frontier mechanics, question format and closing sentence, differing only in voice. No task covers the edit and proposal.md's Impact does not list it. Meanwhile every fleet skill that runs an interview invokes the plugin one, and this same diff switches adjudicate-review to it too, so after this change nothing in the repo references grill-me at all: one concept, two homes, and the repo-owned copy has zero callers. | Fix now | `.claude/skills/grill-me/SKILL.md:7-23` ↔ mattpocock-skills `grilling/SKILL.md:6-22`; callers `.claude/skills/embark-design/SKILL.md:4,36` · `map/SKILL.md:59,78` · `migrate-epic/SKILL.md:37` · `adjudicate-review/SKILL.md:56` (all invoke the plugin skill). CLAUDE.md § Duplication ("identical-by-design logic → one home on sight"); `tasks.md` no covering task; `proposal.md:127-158` Impact. Reverting the ride-along resolves both halves. |

### Boundary

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B7 | Minor | `app/(main)/lists/[id]/ListHeroSection.tsx:75` | The list-hero owner avatar moves from an uncached read to a cached one: previously `getUserById` (React `cache()`, fresh per request), now `list.profile.user.image` sourced from `getList` — a `'use cache'` read tagged only `lists`/`items`. NextAuth writes `users.image` out-of-band on sign-in with no invalidation hook, which is why four sibling reads carry the verbatim "Not cached" comment. The hero avatar can now pin a stale image until an unrelated list or item mutation fires `updateTag`. | Fix now | `ListHeroSection.tsx:75` ↔ `lib/data/list.ts:20-31` (`'use cache'` + `cacheTag('lists')`/`cacheTag('items')` now feeding `users.image`) ↔ `lib/data/user.ts:9` (`getUserById` is request-scoped) ↔ `lib/data/user.ts:108`, `lib/data/profile.ts:252` (the stated no-caching rule for `users.image`); `proposal.md:9` "no user-visible change in behavior". Either keep `getUserById` for the image or drop nested `user.image` from `getList`'s cached projection. |
| B8 | Minor | `specs/server-endpoint-authorization/spec.md:207` | The delta's own requirement text says "Every follow-graph server action in `lib/data/user.actions.ts` (`followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`)" — but the same change moves four of those five to `lib/data/profile.actions.ts` under D13, leaving only `removeFollower`. The spec delta contradicts both the shipped code and the change's own data-layer-organization delta. | Fix now | `specs/server-endpoint-authorization/spec.md:207` ↔ `lib/data/profile.actions.ts:14,66,89,153` ↔ `specs/data-layer-organization/spec.md:10,38` (profile domain owns `profile.actions.ts`) ↔ `design.md` D13. |
| B9 | Minor | `openspec/specs/following/spec.md:274` | The active `following` spec's "Follow-graph mutations SHALL NOT use interactive transactions" requirement names `lib/data/user.actions.ts` as the home of `followUser`/`unfollowUser`/`blockUser`/`unblockUser`. This change moves all four to `profile.actions.ts`, and the change's `following` delta modifies six other requirements but not this one — so on archive the active spec will point the no-transaction rule at a file that no longer holds those actions. | Fix now | `openspec/specs/following/spec.md:276` ↔ `lib/data/profile.actions.ts` (blockUser's block-first sequential-statement comment travels there verbatim, per `design.md` D10) ↔ `specs/following/spec.md` MODIFIED headers at lines 3, 34, 65, 98, 129, 165 — this requirement absent. |
| B10 | Minor | `lib/data/__tests__/test-helpers.ts:22` | The diff adds a second copy of the self-profile id derivation: `selfProfileOf = (userId) => \`self-${userId}\`` appears identically here and at `test/helpers/seedFollowGraph.ts:14`, each under a near-identical comment, while `scripts/seed-dev-users.ts:91` carries a third as `selfProfileId`. `test-helpers.ts` already imports from `@/test/helpers/db`, and this change adds `test/helpers/profile.ts` — a single home is available. Three copies of a scheme that must stay in lockstep with the seed and the e2e URL literal; drift is silently always-false, not a loud failure. | Fix now | `lib/data/__tests__/test-helpers.ts:22` ↔ `test/helpers/seedFollowGraph.ts:14` ↔ `scripts/seed-dev-users.ts:91` ↔ `e2e/follow.auth.spec.ts:28,44`. CLAUDE.md § Duplication — "3+ copies" escalates even for a trivial line; drift hazard, the copies can fall behind silently. |
| B11 | Minor | `.claude/skills/adjudicate-review/SKILL.md:56` | Step 2 now delegates to `/mattpocock-skills:grilling`, whose contract is to ask a whole frontier of numbered questions per round and wait for batched answers. The step's retained heading ("Interview the owner, one finding at a time") and its retained requirements that a question "name the finding ID(s) it covers" and "offer a recommended disposition" were written for the one-finding-per-AskUserQuestion cadence the delegated skill does not implement; that skill has no notion of per-finding dispositions. The adjudication cadence is now specified in two places that disagree, visible only by reading the plugin skill. | Fix now | `.claude/skills/adjudicate-review/SKILL.md:54-56` and its Step 2 heading ↔ mattpocock-skills `grilling/SKILL.md:8` ("Ask the whole frontier in one round") ↔ `.claude/skills/spec-review/reference/finding-format.md:160` ("how `/adjudicate-review` grills a finding"). |
| B12 | Minor | `app/(main)/following/FollowingPage.tsx:22` | The change routes most page surfaces through the `authedIdentity()`/`authedUserId()` seam but leaves six still hand-rolling `auth()` + `getUserIdByEmail()` at the call site. All six need only the account id, so `authedUserId()` covers them with no extra query. Leaving them behind makes the seam rule a judgement call rather than a grep — and the change's own delta makes the seam normative for pages, not just actions. | Fix now | `FollowingPage.tsx:22` · `settings/connections/FollowingSection.tsx:11` · `lists/bookmarks/BookmarksPage.tsx:11` · `lists/history/HistoryPage.tsx:12` · `lists/new/page.tsx:13` · `lists/[id]/edit/EditListBody.tsx:19` ↔ `lib/data/user.session.ts:15` ↔ `specs/server-endpoint-authorization/spec.md:14,157` ("any server action or page … never by querying the users or profiles tables at the call site") and `proposal.md:86` ("no surface hand-rolls the lookup"). |

### Convention

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C13 | Minor | `lib/data/profile.ts:107` | The JSDoc block describing the eligible attributed-purchaser pool now sits directly above `accountsOfProfiles`, not above the `getEligiblePurchasers` it documents — the new helper was inserted between the doc block and its function. A reader of `accountsOfProfiles` gets a description of sorting, block-filtering and claimer-mutuals the function does not do. | Fix now | `lib/data/profile.ts:107-122`; CLAUDE.md § Comments ("If removing comment wouldn't confuse future reader, don't write it"; a comment must describe the unit it is attached to). The block was correctly attached to `getEligiblePurchasers` at `lib/data/user.ts:150` before the move. |
| C14 | Minor | `lib/data/profile.actions.ts:116` | `blockUser`'s own comment states the ordering rationale: "Insert the block row first so a racing followUser is gated by the block-check before the follow rows are removed." The new `blockedAccount` profiles lookup is placed *before* the `user_blocks` insert, so under neon-http (one HTTP round-trip per statement) it delays the block insert by a full round-trip and widens the exact race the comment claims to close. The lookup's result is not needed until line 135. | Fix now | `lib/data/profile.actions.ts:116-134` vs its own rationale at `:107-114`; DATABASE.md § "Driver: no transactions" ("Race conditions that need cross-statement atomicity must be backstopped at the DB layer … or accepted as residual"). |
| C15 | Minor | `app/(main)/settings/connections/ConnectionsActions.tsx:38` | `ConnectionsAction`'s single `targetId: string` prop now carries two id namespaces: `remove` dispatches to `removeFollower`, which takes an **account** id, while `unfollow`/`block`/`unblock` take **profile** ids. The `fns` record at line 23 erases the distinction behind `(id: string) => …`. `FollowersSection.tsx` renders both variants on adjacent lines (`targetId={f.follower_id}` at :28, `targetId={f.follower.profile_id}` at :31); swapping them compiles, typechecks, and silently no-ops (a delete matching no rows still returns `success: true`). Before this change all four took account ids. | Fix now | `ConnectionsActions.tsx:23-38`, call sites `FollowersSection.tsx:28` and `:31`; craft: type safety and naming clarity (one identifier standing for two id spaces with no compile-time guard); CLAUDE.md § Fragile coupling ("Shared abstraction's callers diverge → split back into separate concepts"). |
| C16 | Minor | `lib/data/visit.ts:18` | The `// Not cached:` comment was rewritten from a WHY ("NextAuth updates user rows out-of-band on sign-in, and we have no hook to fire `updateTag` for that, so caching here can pin a stale version") to a WHAT ("joins the owning profile for `list.profile.name`"). The query no longer joins `users`, so the original rationale no longer applies and the replacement states only what the query does — it does not explain why the function stays uncached. Same at `:65`, which now points back at a comment carrying no rationale. | Fix now | `lib/data/visit.ts:18` and `:65`; CLAUDE.md § Comments ("Never explain WHAT — identifiers do that"; "Add only when WHY non-obvious"). Contrast `lib/data/list.ts:94` and `lib/data/profile.ts`, where the parallel comments were correctly re-derived to keep a live WHY. |
| C17 | Minor | `drizzle/0011_illegal_wind_dancer.sql:177` | `DROP TABLE IF EXISTS "saved_lists" CASCADE;` is destructive DDL in a migration file whose authoring conventions DATABASE.md states as "forward-only, no DROPs"; the migration's own rollback note concedes the drop is "NOT revert-reversible". This diff updates DATABASE.md's *Preserved legacy artifacts* paragraph to record that 0011 dropped the table, but leaves the "no DROPs" convention statement unamended, so rule and migration disagree with no sanctioned exception written where the rule lives. Separately, `CASCADE` silently drops any dependent object; none exists, so plain `DROP TABLE IF EXISTS` is the narrower statement. | Fix now | `drizzle/0011_illegal_wind_dancer.sql:177` vs `DATABASE.md:25` ("forward-only, no DROPs, `IF [NOT] EXISTS` on every `CREATE`/`ALTER`/`DROP`"). Reconcile either side: drop the `CASCADE` and amend DATABASE.md:25 to name when a soak-ended table drop is sanctioned, or defer the table drop to its own migration. |

### Testing

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| T18 | Major | `lib/data/__tests__/user.actions.test.ts:137` | The two `removeFollower` tests (`FollowerExists_DeletesInvertedRow` :134-139, `OnlySeversEdgeWhereActorIsFollowee_LeavesThirdPartyEdgeIntact` :157-162) assert the surviving edge via the vacated account column `followee_id`, which `seedFollow` still populates. The action now keys its delete on `followee_profile_id` (`lib/data/user.actions.ts:70-73`); an implementation matching `followee_id` against the account id instead would pass both tests unchanged while writing nothing in production (app-written follow rows now have `followee_id` NULL). No test pins the profile-valued predicate, so the requirement's edge-scoping scenario is effectively unpinned. | Fix now | `specs/server-endpoint-authorization/spec.md` "#### Scenario: removeFollower can only sever an edge where the actor is the followee" (staleness sweep — changed SHALL's stable handle, `followee_profile_id`). Assert `followee_profile_id` (and `followee_id: null` for app-written rows) in both tests. |
| T19 | Minor | `test/helpers/seedFollowGraph.ts:62` | Fixtures still write the vacated account columns production no longer writes: `seedFollow` sets `followee_id` (:62), `seedBlock` sets `blocker_id`/`blocked_id` (:75-76), and `seedList`/`seedItem` set `lists.user_id`/`items.user_id` (`lib/data/__tests__/test-helpers.ts:62, :93`). Production writes NULL there. Seeded rows carry a shape the app can no longer produce, and every ownership/edge assertion built on them stays green whether the code compares the profile column or the superseded account column — the same silent-mismatch class the change's own spec forbids. `seedPurchase` in this same commit dropped `user_id`/`claimed_by` entirely; the follow/block/list/item fixtures did not. | Fix now | `specs/server-endpoint-authorization/spec.md` "### Requirement: An identity SHALL be compared only against a column of its own kind"; TESTING.md § "Shared setup belongs in a fixture" (stale fixture makes a test pass while exercising the wrong thing). Drop the vacated account columns from the four fixtures, matching `seedPurchase`. |
| T20 | Minor | `test/helpers/db.test.ts:38` | `DuplicatePurchase_ViolatesPartialUniqueWith23505` was converted from the account-valued `(item_id, user_id)` partial unique to the profile-valued `(item_id, profile_id)` one, which `db/__tests__/profile-references.test.ts:113` already covers. Nothing in the suite now asserts that `purchases_item_user_unique_idx` still exists, so the requirement that the two indexes coexist for this phase (never swapped) has no test — dropping the account-valued index early would leave the suite green. | Fix now | `specs/profiles-data-model/spec.md` "#### Scenario: Both indexes exist after the migration". Keep one assertion that a duplicate `(item_id, user_id)` pair still raises 23505. |
| T21 | Minor | `drizzle/0011_illegal_wind_dancer.sql:1` | The migration's backfill scenarios have no test: the pglite harness (`test/helpers/db.ts:33-52`) replays migrations against an empty database, so no test exercises the backfill over pre-existing rows or a second run. The post-migration schema shape (nullability, recreated composite keys, cascade/SET NULL behaviour) is pinned by `db/__tests__/profile-references.test.ts`. | Drop | `specs/profiles-data-model/spec.md` "#### Scenario: Backfill routes every row through its account's self-profile" / "#### Scenario: Backfill is idempotent" — the repo's standing scope bound excludes unit tests for migration backfills; schema-shape consequences are covered. |

### What looks good

- The account→profile authorization rewrite is consistent end to end: every ownership comparison moved to profile ids together, with no half-migrated surface where one side compares an account id and the other a profile id.
- The migration is carefully guarded — a pre-flight assertion, `IF [NOT] EXISTS` on every DDL, gate + `ALTER` paired inside single `DO $$` blocks to respect the no-transactions driver, and PK swaps kept atomic so no window opens without the de-dup backstop. The drizzle snapshot matches the SQL.
- `createSelfProfile` in `lib/auth.ts` backs the `authedIdentity()` invariant the whole diff depends on, so the seam has a real guarantee behind it rather than an assumption.
- `seedPurchase` is the model the other fixtures should follow — it dropped the vacated account columns outright rather than keeping them alive alongside the new ones.
- `openspec validate profiles-schema-phase-2 --strict` passes.

**Verdict:** findings remain — 18 open `Fix now` (A2, A3, A4, A5+B6, B7–B12, C13–C17, T18–T20); tasks.md 11.23 still unchecked; CI unverified (non-PR invocation, no check-run rollup to read).

### Adjudications (2026-08-15)

| # | Old → New | Rationale |
|---|-----------|-----------|
| A3 | Fix now → Drop | `tasks.md` is a point-in-time artifact; only spec files persist as inputs to future changes. The migration's guarantee holds (the account-valued index is never dropped), so an already-checked task's wording is not worth an edit. |
| A5+B6 | Fix now → Drop | The `grill-me` rewrite is unrelated to this change and was staged by accident. Standing rule set here: an artifact sitting in the tree with no relation to the proposal is not a finding of this change. |
| B7 | Fix now → Drop | Same move already adjudicated (discarded round 1, §11.2): #199 moves avatars onto their own per-profile table, retiring the `users.image` uncached rationale outright. Staleness window is bounded by any list/item mutation. |
| B11 | Fix now → Drop | Same standing rule as A5+B6 — the `adjudicate-review` SKILL.md edit is an unrelated staged artifact, matching the prior instruction recorded at §14.4. |
| C15 | Fix now → Drop | Already filed as [#304](https://github.com/JoshEddie/CTRLplusList/issues/304), which carries this finding verbatim as a known inhabitant; the interim test catch it specifies has landed (`FollowersSection.test.tsx:92`). The real fix is branded id types, a repo-wide call #304 exists to hold. |
| C17 | Fix now → Drop | `DATABASE.md:25`'s "no DROPs" stands unamended as a general principle by owner decision — a written exception clause is the failure mode, since an agent can self-authorize into it and lose data. 0011's drop is a deliberate one-off overrule of a dead, soaked-out table. `CASCADE` is a verified no-op. |
| T20 | Fix now → Drop | Same defect already adjudicated (discarded round 1, §11.15): [#191](https://github.com/JoshEddie/CTRLplusList/issues/191) drops the account-valued index in phase 3, so the test would be written and deleted one chunk later. |

Also raised in-interview and routed to [#191](https://github.com/JoshEddie/CTRLplusList/issues/191)
(not a round-1 finding, no ID assigned): `profiles.id` is not an independent id —
`createSelfProfile` writes `self-<userId>`, bypassing the `nanoid()` default the
schema already declares. A phase-1 decision (D4/D7) that contradicts this map's
dependent-profile direction and outlives its referent under `ON DELETE SET NULL`.
Nothing has shipped, so re-iding is nearly free now and becomes a cascading update
across seven profile FK columns after release. Routed to #191 rather than fixed
here: it needs a migration, #191 is the migration chunk, and phase 2 is too close
to landing to absorb another round.
[Comment](https://github.com/JoshEddie/CTRLplusList/issues/191#issuecomment-5305792958).

Also raised and dropped in-interview (not a round-1 finding, no ID assigned): inside
`getFollowingFeedProfiles`, `users` joins on the **followee's** account, so the
`new_count` filter reads the followee's `last_seen_following_at` while
`FollowingPage` writes the viewer's — the viewer's badge never clears. Pre-existing
(`lib/data/__tests__/user.test.ts:174-177` records it as "preserved from the
pre-profile query shape"), outside this change's charter, and dropped as scope
increase on a tree still in motion.

**Verdict:** findings remain — 11 open `Fix now` (A2, A4, B8, B9, B10, B12, C13, C14, C16, T18, T19).

## Round 2 — incremental-spec-review (2026-08-15)

Every round-1 open `Fix now` is resolved in the code, and the fixes are the right
ones — the seam sweep is complete, `selfProfileOf` has a real home, and the
fixtures now write only the profile-valued columns. What the fix delta introduced
is a rim of overclaim around otherwise-correct work: the block-first ordering fix
states a guarantee stronger than the session seam permits in three artifacts at
once, a restored comment names a hazard its own write path rules out, and the
suite cannot falsify the profile-name move it was repointed onto.

**Scope:** A/C `git diff` · B/T `git diff 2e5f795` — the three unstaged files the
owner ruled out of scope (`.gitignore`, `CLAUDE.md`,
`.claude/skills/grill-me/SKILL.md`) excluded from every arena · profiles-schema-phase-2 (Active)

### Prior findings

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A2 | `tasks.md` 11.23 unchecked though 14.17 re-ran the gate green | Resolved | `tasks.md:136` now `[x]` with a trailing italic note naming 14.17 as the superseding run — the "annotate superseded" reconcile side. |
| A4 | `e2e/home-rails.auth.spec.ts` comment-only DAL-name edit outside the permitted class | Resolved | Bar widened on all three artifacts: `design.md:13`, `proposal.md:9`, `tasks.md:89` (9.6) now name "comment-only updates naming a DAL function this change renames" as a second permitted class, with executable lines still a defect signal. |
| B8 | `server-endpoint-authorization` delta homed four follow-graph actions in `user.actions.ts` | Resolved | `spec.md:207` now splits the enumeration: the four in `profile.actions.ts`, `removeFollower` in `user.actions.ts`, each target named in its own id space. |
| B9 | active `following` spec's no-transaction requirement points at `user.actions.ts` | Resolved | The delta now MODIFIES that requirement (`specs/following/spec.md:187-199`) with the same split, and adds the idempotent-ordering clause that a later-needed read SHALL NOT precede the safer write. |
| B10 | `selfProfileOf` in three copies | Resolved | One home at `lib/profileIds.ts:6`; `test/helpers/profile.ts`, `seedFollowGraph.ts`, `test-helpers.ts` re-export it, `lib/auth.ts` and `scripts/seed-dev-users.ts` import it. See T8 — two fixtures still hand-copy the scheme. |
| B12 | six page surfaces hand-roll `auth()` + `getUserIdByEmail()` | Resolved | `getUserIdByEmail` now has exactly one caller, `lib/data/user.session.ts:18`. All six pages route through the seam. See B6 — `ChooseItemsBody` still hand-rolls `auth()`, a seventh surface the round-1 finding did not enumerate. |
| C13 | eligible-purchaser JSDoc orphaned onto `accountsOfProfiles` | Resolved | The block sits at `lib/data/profile.ts:120-131` directly above `getEligiblePurchasers`; `accountsOfProfiles` carries its own two-line managed-profile WHY. |
| C14 | `blockUser` profiles lookup ahead of the block insert | Resolved | The lookup moved to `lib/data/profile.actions.ts:130`, behind the insert and behind the first follow-row delete. See A1+C2 — the sentence added with the reorder overclaims. |
| C16 | `visit.ts` "Not cached" comment lost its WHY | Resolved | Both comments (`:18`, `:67`) carry a WHY again. See C3 — the WHY as restated does not hold for these two reads. |
| T18 | both `removeFollower` tests assert the vacated `followee_id` | Resolved | `user.actions.test.ts:137` and `:161` assert `followee_profile_id: selfProfileOf(…)` **and** `followee_id: null`, pinning both the profile-valued predicate and the vacated column. |
| T19 | follow/block/list/item fixtures write vacated account columns | Resolved | All four named fixtures write profile columns only (`seedFollowGraph.ts:61,73-74,95`; `test-helpers.ts:54,85`). Residual outside the finding's enumeration: `lib/data/__tests__/seedVisitGraph.ts:19` still writes `lists.user_id` — the same file T8 sends a fix session into. |

### Alignment

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1+C2 | Major | `specs/following/spec.md:209` ↔ `lib/data/profile.actions.ts:110` | The B9/C14 fix asserts, in three artifacts at once, that the `user_blocks` insert is the action's **first database statement**: the new scenario's clause at `spec.md:209`, the comment sentence "Every other statement, the profiles lookup included, stays behind it", and the new test's ordering comment. `blockUser` opens with `await authedIdentity()` (`:95`), which issues two round-trips — `getUserIdByEmail` then `getUserIdentity` — before the insert, and the change's own test asserts the order `['profiles-lookup', 'block-insert', 'profiles-lookup']`. As written the spec clause is unsatisfiable by any action using the session seam this change makes normative. | Fix now | `specs/following/spec.md:209` (new SHALL-bearing scenario) ↔ `lib/data/profile.actions.ts:94,110-112` ↔ `lib/data/user.session.ts:15-21` ↔ `lib/data/__tests__/profile.actions.test.ts:214-224`; `specs/server-endpoint-authorization/spec.md:207` requires actor resolution through the seam, itself two reads; DATABASE.md § "Driver: no transactions". Reconcile EITHER: narrow all three to the statements the action controls the placement of (first statement **of the mutation**, after identity resolution) OR reorder so no read precedes the insert — which the seam requirement forbids. |

> Withdrawn before adjudication: the alignment and boundary arenas both raised
> `lib/profileIds.ts` being untracked as a defect. It is not one. This skill's
> contract is staged tree = reviewed baseline, unstaged working tree = fix delta,
> and staging is `/landfall`'s act — an untracked new module in the fix delta is
> the same uncommitted state as every unstaged modification beside it. The finding
> was invalid, not merely dropped, so no ID is reserved for it.

### Boundary

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B4+T5 | Minor | `lib/data/user.ts:9` ↔ `lib/data/__tests__/user.test.ts:39` | The change deletes `getLists()` on the stated rule that a caller-less exported read is dead code, then leaves two exports meeting the same test. `getUserById` had exactly one production caller, `ListHeroSection.tsx:68`, and this change removes it in favour of the nested `list.profile` projection — the only remaining references are its definition and its three tests, which now pin a contract nothing consumes. `getListsSharedByProfile` (`lib/data/list.ts:68`) was already caller-less and was migrated (rename + `user_id` → `profile_id`) rather than deleted alongside its twin. Neither is visible from the diff, which shows only a removed call site and a rename. | Fix now | `lib/data/user.ts:9` and `lib/data/list.ts:68` (zero production callers — verified by grep across `app/`, `lib/`, `db/`, `scripts/`) ↔ `proposal.md:98` / `design.md:106` ("`getLists()` is deleted rather than migrated: it has no callers"); CLAUDE.md § Over-generality (KISS) — no code for callers that do not exist. Delete each export with its describe block, or name the caller that keeps it live. |
| B6 | Minor | `app/(main)/lists/[id]/choose-items/ChooseItemsBody.tsx:17` | The last surface in `app/` (outside the sign-in components) still importing `auth` directly: it hand-rolls `const session = await auth(); if (!session?.user?.email) redirect('/')` and then calls `authedIdentity()` at `:25`, which calls `auth()` again internally. The B12 sweep converted six pages and task 13.3 dropped the leftover pair from two more, so "pages resolve the actor through the seam" is one surface short of being a grep. The `:18` guard is also dead against its own control flow — `authedIdentity()` returns null on a missing session email and `:27`'s `if (!identity || !list) redirect('/lists')` already covers it; the only difference bought is the redirect destination. | Fix now | `ChooseItemsBody.tsx:1,17-20` vs `:25-28` ↔ `lib/data/user.session.ts:15-28` ↔ `specs/server-endpoint-authorization/spec.md:14,157` ("any server action or page … never by querying the users or profiles tables at the call site") and `proposal.md:86` ("no surface hand-rolls the lookup"); CLAUDE.md § Redundant guards. |

### Convention

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C3 | Minor | `lib/data/visit.ts:18` | The restored WHY states a hazard its own mechanism rules out: `profiles` rows are written once, by NextAuth's `createUser` event (`lib/auth.ts:84` → `createSelfProfile`, a single `insert … onConflictDoNothing()`), and no production path updates them — `update(profiles)` appears nowhere in `lib/`, `app/`, `db/`, `scripts/`. A row written at account creation, before any list of that profile can be bookmarked, cannot pin a stale name. Both queries also dropped their `users` join, so the live sign-in-rewrite hazard the four sibling comments cite no longer applies here. `:67` points back at a rationale that does not hold. | Fix now | `lib/data/visit.ts:18-20` and `:67-68` ↔ `lib/auth.ts:56-64` (insert-once) and `:84` (`createUser` event only) ↔ the sibling comments at `lib/data/list.ts:94`, `lib/data/profile.ts:252`, `lib/data/user.ts:108`, whose `users.image` rationale is the live one. CLAUDE.md § Comments — a WHY whose stated rationale does not hold misleads more than no comment. Reconcile EITHER: state the reason that actually holds OR cache both reads under a `list_visits` tag if none does. |

### Testing

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| T7 | Major | `test/helpers/seedFollowGraph.ts:23` | `seedUsers` writes the same `name` to both the `users` row and its self-`profiles` row, so no fixture in the repo has a profile name differing from the account behind it. Every assertion this change repointed onto the profile's name — `list.test.ts`'s profile-join and `-ProfileProjection` cases, `visit.test.ts`'s `rows[0].list.profile.name`, `profile.test.ts`'s blocked-profile join, the `ListCard` byline suite — would pass identically if the DAL still projected `users.name`. The one behavior the profile-name move exists to produce is unfalsifiable by the suite. | Fix now | `specs/list-collections/spec.md` "#### Scenario: Byline names the owning profile" ("a list whose owning profile's name differs from the name of the account behind it") — no named test; TESTING.md § "Shared setup belongs in a fixture" (a stale fixture makes a test pass while quietly exercising the wrong thing). Give `seedUsers` an optional distinct profile name and pin at least one divergent case. |
| T8 | Minor | `lib/__tests__/listAccess.test.ts:57` | The self-profile id scheme is hand-copied into two fixtures — `const P = (userId) => \`self-${userId}\`` here and `profile_id: \`self-${list.user_id}\`` at `lib/data/__tests__/seedVisitGraph.ts:19` — while `selfProfileOf` is exported from `lib/profileIds.ts` and re-exported through `test/helpers/profile.ts` and `seedFollowGraph.ts` (the sibling `test-helpers.ts` imports it correctly). `lib/profileIds.ts`'s own header states the scheme needs one home because a second copy could fall behind silently; the change ships two. `seedVisitGraph.ts:18` additionally still writes the vacated `lists.user_id` — the T19 residual. | Fix now | `lib/__tests__/listAccess.test.ts:57` and `lib/data/__tests__/seedVisitGraph.ts:18-19` vs `lib/profileIds.ts:1-6`; TESTING.md § "Shared setup belongs in a fixture, not duplicated or merged away"; CLAUDE.md § Duplication (drift hazard — the copies fall behind silently). |
| T9 | Minor | `lib/data/listItems.actions.ts:185` | The `updated_by_user_id` "non-content writes leave the column alone" scenario names five triggers; two are pinned — `Archive_LeavesUpdatedByUserIdUnstamped` (`item.actions.test.ts:647`) and `PrivateToPublic_LeavesUpdatedByUserIdUnstamped` (`list.actions.test.ts:686`). Reordering (`updatePriority`) and list-recency touches (`lib/data/list.touch.ts`) have no assertion that the column stays null, so a future write path stamping either regresses silently. | Fix now | `specs/profiles-data-model/spec.md` "#### Scenario: Non-content writes leave the column alone" (scenario traceability — partial pinning). Add the two missing `…_LeavesUpdatedByUserIdUnstamped` cases. |
| T10 | Minor | `lib/data/profile.ts:14` | The delta ADDs "Repeat resolution within one request costs no extra query" and `getUserIdentity` implements it with React `cache()`. No test pins it. | Drop | `specs/server-endpoint-authorization/spec.md` "#### Scenario: Repeat resolution within one request costs no extra query" — React `cache()` memoizes only inside a React request scope, which the vitest harness cannot establish, so a call-count assertion would fail against correct code; the sibling `getUserById` / `getUserIdByEmail` caches are unpinned for the same reason. Code-shape review check, not a unit-testable behavior. |

### What looks good

- Every one of round 1's eleven open `Fix now` findings is genuinely resolved in the code, not just checked off — verified read by read, not by diff eyeballing.
- The B9 fix went further than the finding asked: rather than only re-homing the actions, it wrote the idempotent-ordering rule ("a read the mutation needs only later SHALL NOT be issued ahead of the safer write") into the requirement, so the C14 defect now has a spec behind it instead of only a comment.
- T18's fix pins both halves — `followee_profile_id` set **and** `followee_id: null` — so the tests now fail on either a wrong-column predicate or a fixture that starts writing the vacated column again.
- `getUserIdByEmail` is down to a single caller inside the seam itself, which turns the "no surface hand-rolls the lookup" rule into something a grep can enforce.
- The three unstaged files the owner ruled out of scope stayed out of scope; no arena spent findings on them.

**Verdict:** findings remain — 7 open `Fix now` (A1+C2, C3, B4+T5, B6, T7, T8, T9). CI unverified (non-PR invocation, no check-run rollup to read). Two arena findings were excluded before this verdict: round 1's T20 (`test/helpers/db.test.ts:38`), re-raised by the testing arena and already adjudicated `Drop` — a re-dispositioned finding is never re-litigated — and the untracked-`lib/profileIds.ts` finding, withdrawn as invalid per the note above the Boundary table.

### Adjudications (2026-08-16)

| # | Old → New | Rationale |
|---|-----------|-----------|
| C3 | Fix now → Drop | The finding holds today, but [#202](https://github.com/JoshEddie/CTRLplusList/issues/202) settles `profiles.name` as **editable** (against an immutable `users.name`) and [#183](https://github.com/JoshEddie/CTRLplusList/issues/183) gives it a Settings surface inside this same map — so the uninvalidated-`profiles`-join rationale the comment states becomes live before the map closes. The comment is early, not wrong; restating it now writes a WHY that gets deleted when the edit surface lands. |
| B4+T5 | Fix now → Drop | A named inhabitant class of [#304](https://github.com/JoshEddie/CTRLplusList/issues/304) — "dead exports migrated through the repoint rather than deleted". `getUserById` went caller-less as a consequence of this change and [#199](https://github.com/JoshEddie/CTRLplusList/issues/199) retires its `users.image` job outright; `getListsSharedByProfile` was already caller-less before it. No new issue filed: #304 records the class, and the post-all-chunks scout is the only vantage that can tell a dead export from one whose caller arrives next chunk. |
| B6 | Fix now → Drop | The other named inhabitant class of [#304](https://github.com/JoshEddie/CTRLplusList/issues/304) — "identity resolution hand-rolled at call sites instead of the shared helper". [#302](https://github.com/JoshEddie/CTRLplusList/issues/302) additionally re-cuts page auth shape across the app (layout short-circuits to a blocking onboarding modal, `createSelfProfile` moves out of the NextAuth `createUser` event), so this surface is rewritten there regardless. |

T10 was confirmed `Drop` as proposed and T20's exclusion stands; neither is a change, so
neither is listed above.

**Verdict:** findings remain — 4 open `Fix now` (A1+C2, T7, T8, T9). CI unverified (non-PR invocation, no check-run rollup to read).

## Round 3 — adjudicate-review (2026-08-16)

Round 2's four surviving `Fix now` findings are resolved and the full gate set is
green. **Provenance, stated plainly:** this round was written by
`/adjudicate-review` in the same session that authored the fixes, at the owner's
direction, in place of a `/recheck-review` pass. It is a close-out record, not an
independent second reader — the fixes were verified by re-reading each cited
artifact and by the five gates, not by a fresh arena sweep.

**Scope:** unstaged fix delta against anchor `2e5f795` · profiles-schema-phase-2 (Active)

### Prior findings

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A1+C2 | spec, comment and test all claim the block insert is the action's first database statement | Resolved | `specs/following/spec.md:206` retitled "The block row is the mutation's first database statement" and narrowed to name `authedIdentity()`'s two reads as necessarily prior; matching sentence at `profile.actions.ts:111-114`. The test needed no edit — its comment at `profile.actions.test.ts:230-231` already named the leading lookup, so two artifacts overclaimed, not the three the finding cited. The scenario keeps its teeth: a read inserted between resolution and the block insert still violates it. |
| C3 | `visit.ts`'s restored WHY names a hazard its own write path rules out | Dropped | Adjudicated — see round 2 `### Adjudications`. |
| B4+T5 | `getUserById` / `getListsSharedByProfile` left as caller-less exports | Dropped | Adjudicated to [#304](https://github.com/JoshEddie/CTRLplusList/issues/304). |
| B6 | `ChooseItemsBody` hand-rolls `auth()` ahead of `authedIdentity()` | Dropped | Adjudicated to [#304](https://github.com/JoshEddie/CTRLplusList/issues/304). |
| T7 | no fixture gives a profile a name differing from its account | Resolved, with a bound named below | `seedUsers` takes an optional `profile_name`; `list.test.ts`'s `-ProfileProjection` case seeds account `Owen` against profile `Not Owen` and asserts `name: 'Not Owen'`. The projection now fails if the DAL reverts to `users.name`. |
| T8 | self-profile id scheme hand-copied into two fixtures | Resolved | `lib/__tests__/listAccess.test.ts` and `lib/data/__tests__/seedVisitGraph.ts` both import `selfProfileOf`; `seedVisitGraph`'s vacated `lists.user_id` write — the T19 residual round 2 flagged — went with it. `selfProfileOf` now has no hand-copy anywhere in the tree. |
| T9 | the non-content-writes scenario pins two of its five triggers | Resolved | `Reorder_LeavesUpdatedByUserIdUnstamped` (`listItems.actions.test.ts`, asserting both the moved item and the holding list) and `TouchedRows_LeaveUpdatedByUserIdUnstamped` (`list.touch.test.ts`). Four of five triggers pinned; the fifth is delete, which leaves no row to assert on. |
| T10 | the repeat-resolution scenario has no test | Dropped | Confirmed as proposed at adjudication. |

### Bound on T7's fix, recorded rather than papered over

The scenario T7 cites — `list-collections` "Byline names the owning profile", *"a
list whose owning profile's name differs from the name of the account behind it"* —
is **not fully pinnable where it is written.** `ListCard` receives only
`list.profile?.name` (`app/ui/components/ListCard.tsx:22`); the account name never
enters its props, so a component test cannot represent the divergence. A
`ListCard` case seeded with one name and a comment asserting a different account
name would pin nothing — the execute-for-coverage shape TESTING.md forbids. The
divergence is real only at the DAL projection that feeds the card, and that is
where it is now pinned. The residue is a spec-homing question (a data-layer
guarantee written as a component scenario), not missing coverage.

### What looks good

- The A1+C2 fix narrowed the claim rather than reordering the action, keeping the seam requirement and the block-first rule both intact — the reconcile side that costs no correctness.
- T8's fix cleared the T19 residual in the same edit, so the vacated-column class round 1 opened is now closed across every fixture rather than nearly closed.
- The T7 fixture change is additive and defaulted (`profile_name ?? name ?? id`), so no existing seed call changed behavior — 2819 of 2821 tests are byte-identical in intent.
- Every gate ran to completion on this delta, including e2e, with no stale-server retry.

**Verdict:** clear to land — no open `Fix now` findings across rounds 1–3 as amended. Gates: `npm run lint` zero errors / zero non-size warnings · `npx tsc --noEmit` zero errors · `npm run build` completes · `npm run test:coverage` 248 files / 2821 tests pass, 100% lines, 100% functions, 99.94% statements, 99.07% branches · `npm run test:e2e` 57 passed, 0 failed · `openspec validate --strict` valid. CI unverified (non-PR invocation, no check-run rollup to read).
