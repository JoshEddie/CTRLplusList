## 1. Schema and migration

- [x] 1.1 Add a nullable `last_active_at` timestamp column to `profile_members` in `db/schema.ts`, beside `ride_along` and `created_at`. No default, no backfill — NULL is the correct value for a membership never acted as, per `profiles-data-model`.
- [x] 1.2 Generate the migration (`npm run db:generate`) and hand-edit it to repo conventions per `DATABASE.md`: `IF NOT EXISTS` on the `ALTER TABLE … ADD COLUMN`, forward-only, no down-migration, an inline rollback note naming the column drop as the whole rollback.
- [x] 1.3 Confirm the generated migration touches nothing else — no rewrite of the existing `profile_members` columns, constraints or the two self-role partial uniques — and that `drizzle/meta/_journal.json` carries only the appended entry.
- [x] 1.4 Apply locally (`npm run db:migrate`), restart the dev server, and confirm every pre-existing membership row's `last_active_at` is NULL and the cascade on user- and profile-delete still carries the row away with its timestamp.

## 2. The selection store and the resolution seam

- [x] 2.1 Add the active-selection cookie module — name, attributes and parse — alongside `lib/data/purchase.cookie.ts`'s shape: `httpOnly` (the selection SHALL NOT be readable by client script), `path: '/'`, `sameSite: 'lax'`, `secure` outside development, and a lifetime that survives a browser restart for as long as the session does.
- [x] 2.2 Add the memberships read to `lib/data/profile.ts` (or `profile.identity.ts` where the import cycle forces it): the profiles an account holds a `self`/`owner`/`manager` membership on, carrying id, name, role, accent and `last_active_at`, ordered most-recently-acted-as first with NULL last. This is the one read that feeds resolution, the dropdown and the ordering.
- [x] 2.3 Add active-profile resolution: read the selection, re-verify it against the account's current memberships server-side, and fall back to the self-profile for every unhonourable cause without distinguishing them — nothing stored, no membership, profile deleted, an id that never existed. Wrap it in the same request-scoped React `cache()` `getUserIdentity` already uses, so repeat resolution in one request costs no extra query.
- [x] 2.4 Assert in the resolver that the read path writes no cookie: a stale or forged selection falls back and leaves the stored value alone.
- [x] 2.5 Change `getUserIdentity` in `lib/data/profile.ts` to return `{ userId, selfProfile, activeProfile }` and **delete** the `profile` field rather than reinterpreting it, per design. Update `UserIdentity` in `lib/types.ts` to match, and rewrite the stale header comment that says `profile` means "the profile this request acts as — today always the account's self-profile".
- [x] 2.6 Update `authedIdentity`'s header comment in `lib/data/user.session.ts` to name both profiles and the split rule, per `server-endpoint-authorization`.
- [x] 2.7 Run `npx tsc --noEmit` and record the resulting error list as the work queue for section 3 — the typechecker enumerating the call sites is the migration strategy, not an audit.

## 3. The self-versus-active split at every call site

> Work the `tsc` queue from 2.7. Each site takes the active profile where it compares
> or writes an ownership column, the self-profile where it names or acts for the human,
> per `active-profile`'s division. Nothing keeps a default.

- [x] 3.1 **Active** — `lib/data/list.actions.ts`, `lib/data/item.actions.ts`, `lib/data/item.associations.ts`, `lib/data/item.placeholder.actions.ts`, `lib/data/listItems.actions.ts`: creation writes the active profile as owner, and every ownership comparison compares against it.
- [x] 3.2 **Active** — `app/(main)/lists/MyListsPage.tsx`, `app/(main)/items/page.tsx`, `app/(main)/items/ui/components/ItemsContainer.tsx`, `SortItemsContainer.tsx`, `app/(main)/items/[id]/ItemFormBody.tsx`, `app/(main)/lists/[id]/page.tsx`, `ListItemsSection.tsx`, `choose-items/ChooseItemsBody.tsx`: profile-scoped content reads and their owner checks.
- [x] 3.3 **Active** — the home page's **My Lists** rail in `app/(main)/HomePage.tsx`. It is an owned-lists read and its own **See all** goes to `/lists`, so binding it to the self-profile would disagree with its destination.
- [x] 3.4 **Self** — `app/(main)/HomePage.tsx`'s Following, Bookmarks and Recently visited rails and the following feed; `app/(main)/purchased/page.tsx`; `app/(main)/settings/connections/FollowersSection.tsx` and `BlockedSection.tsx`; `lib/data/visit.actions.ts`.
- [x] 3.5 **Self** — `lib/data/purchase.actions.ts`: the claim asserter and a self-claim's purchaser. And `lib/data/purchase.ts`'s `sanitizePurchases` viewer argument, so a viewer's own claims keep their unclaim affordance while they act as another profile.
- [x] 3.6 **Self** — `lib/data/profile.actions.ts`'s `blockUser` and `unblockUser`: the blocker end is always the actor's self-profile, per `following` and the block ADR. Its either-direction block gate in `followUser`/`unfollowUser` resolves the viewer by self-profile too.
- [x] 3.7 **Split** — `app/(main)/lists/[id]/ListHeroSection.tsx`: the Follow affordance's two gates take different profiles. The owner comparison takes the **active** profile; the block comparison takes the **self**-profile. Name each at the call site rather than letting one variable serve both.
- [x] 3.8 **Split** — `app/(main)/user/[id]/ProfileHeaderSection.tsx` and `getProfileForViewer` in `lib/data/profile.ts`: its `viewer.profile.id` reads feed both an is-this-me comparison and two block checks. Resolve each to the profile its own meaning calls for and change the parameter so a caller cannot pass one profile for both.
- [x] 3.9 Re-run `npx tsc --noEmit` and confirm zero errors and no surviving reference to a removed `profile` field — the acceptance flow *The seam's split is enumerated by the typechecker*.

## 4. The membership gate, the switch action, and recency

- [x] 4.1 Add the shared profile-scoped write gate: confirm server-side, against current membership rows, that the acting account holds `self`/`owner`/`manager` on the profile the request acts as, before any row is written. Reject with `error: 'Forbidden'` and no database write. One gate, not a per-endpoint re-implementation — `server-endpoint-authorization` requires the single place so a later write cannot omit it.
- [x] 4.2 Route every profile-scoped write in `lib/data/*.actions.ts` through the gate. The ownership comparison each mutation already makes is unchanged: holding a membership makes a profile selectable, never authorizes a write against it.
- [x] 4.3 Put the recency stamp inside the gate: one conditional `UPDATE` on the membership row guarded on `last_active_at IS NULL OR last_active_at < now() - interval '1 hour'`, awaited before the invalidation it fires. Single statement — the driver has no interactive transactions — and idempotent, so a repeat is free.
- [x] 4.4 Fire the narrow `profilesOfUser` invalidation with the stamp, and confirm the hourly guard means a burst of writes fires one write and one invalidation rather than one per mutation.
- [x] 4.5 Add the switch server action to `lib/data/profile.actions.ts`: re-verify membership on the target, reject a target the viewer holds none on without writing a selection, and on success store the cookie, stamp the membership as acted-as, and re-render the current route so the viewer stays on the page they were on.
- [x] 4.6 Discard the selection on sign-out, in the existing `signOutUser` path, so a second account signing in on the same browser does not inherit it.
- [x] 4.7 Verify design's caching finding against the source rather than trusting it: no `'use cache'` function reads the session, every `'use cache'` read takes its profile id as an argument, and reading the cookie adds no dynamic constraint the existing `auth()` JWT cookie read has not already added. Record what the check found; if it disagrees with design, that is a `/run-aground`, not a silent fix.

## 5. Deferred handles from acceptance.md

> Each resolves one inline `*TODO:*` marker. A marker with no decision is a
> deferred decision nobody is holding — settle these before the surfaces below
> are built, so the flows can be refined with real handles at the end.

- [x] 5.1 Resolve the `*TODO:*` in `Flow: The avatar dropdown offers the profiles the viewer is not acting as` — how the profile count is presented on the dropdown's `Profiles` row.
- [x] 5.2 Resolve the `*TODO:*` in `Flow: Switching from the dropdown re-renders the route the viewer is on` — the transient confirmation's copy, which every switch surface raises.
- [x] 5.3 Resolve the `*TODO:*` in `Flow: Switching from a profile card leaves the viewer on the Profiles page` — the active badge's text alternative. The card renders `Active profile` today; confirm or replace it deliberately rather than by inheritance.
- [x] 5.4 Resolve the `*TODO:*` in `Flow: A creation form states which profile the new content is for` — the heading-region copy naming the profile the new content is for.
- [x] 5.5 Resolve the `*TODO:*` in `Flow: An empty profile-scoped surface offers a route to the Profiles page` — the secondary action's label, which names no profile.

## 6. The nav avatar and its dropdown

- [x] 6.1 Change the gradient nav's avatar to render the **active** profile in `app/(auth)/ui/components/UserAvatarPopover.tsx`: that profile's initials, with its accent as a ring. Remove `session.user.image` from the nav entirely. `UserImage` had no consumer beyond the nav, so it is deleted with it.
- [x] 6.2 Add the switch group to the popover, above the `Profiles` / `Connections` destinations and `Sign out`, excluding the profile being acted as, so no row is inert.
- [x] 6.3 Render every switch row as the profile's name and nothing more — including the viewer's own row, which appears only while they are acting as another profile. The `app-frame` delta was amended to forbid a return-flavoured prefix (a prefix plus a long profile name is what overflows a menu row first); `switcherView` carries the same rule. Render no switch rows at all for a viewer who runs only their self-profile.
- [x] 6.4 Cap the group at five rows, ordered most-recently-acted-as first, and carry the viewer's profile count on the `Profiles` row whenever it is more than one — the cap is the surface's limit, and the count is what stops it reading as the whole set.
- [x] 6.5 Give each switch row the profile's own avatar slot in its leading position — initials on the accent until avatar art lands — and no navigation icon. `menu-system` exempts the switch group from sibling-distinct icons; do not invent five.
- [x] 6.6 Wire each row to the switch action and raise the transient confirmation from 5.2.

## 7. The Profiles page

- [x] 7.1 Make the card body a click target in `app/(main)/profiles/ui/components/ProfileCard.tsx` that switches rather than navigates, with the management menu excluded by propagation so opening the menu does not also switch. The card still contains no link until its menu is opened.
- [x] 7.2 Replace `ProfileCard`'s `isActive = profile.role === 'self'` with the resolved active profile, and delete the comment claiming the role IS the active state. The mark moves as the viewer switches and rests on the self-profile only while they act as themselves.
- [x] 7.3 Add `Switch to <name>` to `ProfileCardMenu` as a `<MenuItem>` — an action, not a destination — ordered before `Edit <name>`, and absent from the card of the profile already being acted as. This is the keyboard-reachable path to switching from this surface. Update the menu's "One row today" header comment.
- [x] 7.4 Raise the same confirmation on a card switch, from both the body and the menu row.

## 8. Empty states and creation surfaces

- [x] 8.1 Give `app/ui/components/Empty.tsx` an optional secondary action — destination and label — rendered as `<LinkButton variant="secondary">` immediately after the CTA, inside the same `empty-container`. With none supplied, every existing consumer renders exactly what it renders today.
- [x] 8.3 Supply the secondary action from `/lists` and `/items` when the active profile has nothing to show **and** the viewer runs more than one profile. A viewer who runs only their own sees the surface exactly as it is today. Copy names no profile — neither the active one nor any other.
- [x] 8.4 State the profile in the list and item creation forms (`app/(main)/lists/ui/components/ListForm.tsx`, `app/(main)/items/ui/components/itemform/`): the heading region names the active profile as the one the new content is for, and the submit control names it too. Neither shortens: the `MAY` licensing a bare-verb fallback was dropped from the delta rather than implemented, because the drop point depends on the profile name's length and not on the container's width alone.
- [x] 8.5 Render the statement only for a viewer who runs more than one profile — a single-profile viewer has no ambiguity and is shown no statement that could only name themselves.

## 9. Removing the dormant seam

- [x] 9.1 Delete `bypassActiveProfile()` and the `BYPASS_ACTIVE_PROFILE` env read from `lib/auth.ts`, and its cases from `lib/__tests__/auth.test.ts`. It is cut unused: an env var is process-global and cannot give one spec a managed-profile context and another the self-profile.
- [x] 9.2 Remove `BYPASS_ACTIVE_PROFILE` from `LOCALDEV.md` (its own `## Active profile` section and the seeded-coverage mention) and from `.env.example` if it appears there. `BYPASS_SESSION_USER` is untouched.
- [x] 9.3 Remove the bypass avatar constant from `lib/auth.ts` if the nav change leaves it with no consumer; keep it if a surface still reads it, and say which.

## 10. Seed and local dev

- [x] 10.1 Add a second managed profile to `scripts/seed-dev-users.ts` on which the primary test viewer is `manager` rather than `owner`, so the viewer runs three profiles across all three roles and the `manager` role is covered by a fixture.
- [x] 10.2 Give the seeded memberships deterministic, distinct `last_active_at` values far enough apart to order unambiguously, with at least one left NULL — the fixture that lets a switcher's ordering be told from a broken one, and the never-acted-as branch's fixture.
- [x] 10.3 Confirm `db:reset:dev`'s wipe still reaches every profile a seeded user holds any membership on, including the new one, and still precedes the seeded-user delete.
- [x] 10.4 Run `npm run db:reset:dev`, restart the dev server, and confirm the three memberships, their timestamps and the NULL are recreated deterministically.
- [x] 10.5 Update `LOCALDEV.md`'s profile coverage section for the second managed profile and the seeded timestamps, and state that local development switches through the real UI.

## 11. Unit tests

- [x] 11.1 Cover active-profile resolution directly: a held membership resolves; a revoked membership, a forged id, a deleted profile and an absent selection each fall back to the self-profile with no error and no cookie write.
- [x] 11.2 Cover the membership gate directly rather than only incidentally through the actions that call it — it is load-bearing twice, for authorization and for the recency stamp, and design names it a single point of failure worth its own coverage. Include the rejection shape (`error: 'Forbidden'`, no write) and that another held membership does not widen the current request.
- [x] 11.3 Cover the recency stamp's hourly guard: a stamp older than an hour updates, one inside the hour does not, and a NULL stamps.
- [x] 11.4 Cover the switch action: a held target stores the selection and stamps; an unheld target rejects, stores nothing and leaves the target's timestamp unchanged.
- [x] 11.5 Cover the split at its riskiest sites: a claim recorded while acting as a managed profile names the self-profile; `blockUser` inserts exactly one row whose blocker is the self-profile; the block gates compare the self-profile whatever profile is acted as.
- [x] 11.6 Cover `Empty`'s secondary action: supplied renders after the CTA with the label and href; absent leaves the container as its sibling requirements describe.
- [x] 11.7 Cover the dropdown's switcher: the active profile is never offered, the viewer's own row reads their plain profile name and appears only when acting as another, a single-profile viewer gets no rows and no count, and twelve profiles yield five rows and a count of twelve.
- [x] 11.8 Cover the card: the body switches without navigating, the menu's trigger does not switch, the switch row is absent from the active profile's card, and the active mark and badge move with the switch.
- [x] 11.9 Cover the creation-surface statement in both directions — multi-profile viewer sees it in the heading region and on the submit control; single-profile viewer sees none.

## 12. End-to-end

- [x] 12.1 Add the profile-switch spec to `e2e/`: starting un-pinned on the self-profile, switch through a real switching affordance, assert `/lists` re-renders as that profile's collection, switch back, assert it is the viewer's own again. Drive the switch through the UI rather than pinning the selection — the failure mode this covers is invisible to a unit test holding a mocked session.
- [x] 12.2 Select a switch target that is **not** the seeded membership left with a NULL `last_active_at`: a switch stamps it and no affordance unsets it, so consuming that fixture would break the never-acted-as ordering branch for every later run against the same database.
- [x] 12.3 Document the residue in the spec file — the stamp a switch leaves is a mutation the viewer's UI cannot reverse — per the suite's contained-residue rule.
- [x] 12.4 Add the cookie-pinning helper to `e2e/helpers` for a spec that needs a non-default starting acting profile: `context.addCookies()` with the application's own selection cookie, httpOnly included. No environment override.

## 13. Specs, docs, and ADR

- [x] 13.1 Promote `2026-08-25-the-active-profile-is-the-authorization-context` into `openspec/adr/2026-08-25-the-active-profile-is-the-authorization-context.md`, and add its rows to `openspec/adr/INDEX.md` under **Touching** `DAL` and `DB Queries`.
- [x] 13.2 Promote `2026-08-25-actor-resolution-names-both-profiles` into `openspec/adr/2026-08-25-actor-resolution-names-both-profiles.md`, and add its row to `openspec/adr/INDEX.md` under **Touching** `DAL`.
- [x] 13.3 Promote `2026-08-25-a-block-belongs-to-the-human` into `openspec/adr/2026-08-25-a-block-belongs-to-the-human.md`, and add its rows to `openspec/adr/INDEX.md` under **Touching** `DAL` and `DB Queries`.
- [x] 13.4 Promote `2026-08-25-active-selection-in-a-cookie-recency-on-the-membership` into `openspec/adr/2026-08-25-active-selection-in-a-cookie-recency-on-the-membership.md`, and add its rows to `openspec/adr/INDEX.md` under **Touching** `DB Schema` and `DAL`.
- [x] 13.5 Promote `2026-08-25-no-environment-override-for-the-acting-profile` into `openspec/adr/2026-08-25-no-environment-override-for-the-acting-profile.md`, and add its rows to `openspec/adr/INDEX.md` under **Touching** `E2E Test` and `Local Dev`.
- [x] 13.6 Check each `MODIFIED` block in `specs/` against the source before applying it — design records that the specs have drifted from the code in places, and that where they disagree the source is authoritative for what is true today.
- [x] 13.7 Refine `acceptance.md`'s flows with the literal handles the implementation landed — real button text, real routes, real command names — and confirm no `*TODO:*` marker survives. Refine, not rewrite: flow identity and journey scope stay as drafted.
- [x] 13.8 Run `openspec validate active-profile-switcher --strict` and resolve anything it reports.

## 14. Following the switch out of a profile's space

- [x] 14.1 Amend the `active-profile` delta so the "remain on the page" rule reads on profile-*scoped* surfaces only, and a route *keyed* to a profile's id follows the switch instead. Add the space, rejection and unsaved-changes scenarios, and the matching `acceptance.md` flows.
- [x] 14.2 Lift switching into `app/ui/components/ProfileSwitchProvider.tsx`, mounted in `app/(main)/layout.tsx` outside `AppFrame` — the form holding unsaved work and the dropdown initiating the switch are different subtrees, and this is the nearest thing wrapping both. `useProfileSwitch` keeps its signature; `lib/useProfileSwitch.ts` is deleted and its two call sites repointed.
- [x] 14.3 Follow the route on success: `router.replace('/profiles/<newId>')` when the current path is a profile space. `replace`, not `push` — a back entry pointing at a space for a profile the viewer no longer acts as contradicts what the nav says.
- [x] 14.4 Read the path from `window.location` inside the switch rather than through `usePathname()`. The provider wraps every `(main)/` route, and a layout-level client component reading runtime URL data makes the whole tree a blocking prerender.
- [x] 14.5 Hold a switch behind `ConfirmDialog` while a form reports unsaved changes, via `useUnsavedChanges(isDirty)`. The hook clears the hold on unmount, so leaving the form releases it.
- [x] 14.6 Track dirtiness in `ProfileSettingsForm` against the last-written values rather than the props: a save revalidates the route, and until that render lands the props still carry the old values and would read as unsaved.
- [x] 14.7 Add `test/helpers/profile-switch.tsx` — `renderWithProfileSwitch`, `setTestPathname`, `routerReplace` — and repoint the three suites that render a switching surface at it.
- [x] 14.8 Cover the provider in `app/ui/components/__tests__/ProfileSwitchProvider.test.tsx`: scoped surface does not navigate, profile space does, `/profiles` does not, a rejected switch moves nobody, and the four confirmation paths including release on unmount.
- [x] 14.9 Cover the form's own wiring in `ProfileSettingsForm.test.tsx`: unedited switches clean, an edit prompts, a reverted edit does not, and a saved edit does not.
- [x] 14.10 Extend `e2e/profile-switch.auth.spec.ts` with the space-following leg, driven through the real dropdown.

## 15. Pre-merge

All five gates run locally against the author's real `.env.local` before review is
requested. This change edits production source, a migration, the seed and tests, so
no gate is exempt.

- [x] 15.1 `npm run lint` passes — zero errors, zero non-size warnings.
- [x] 15.2 `npx tsc --noEmit` passes — zero errors.
- [x] 15.3 `npm run build` passes — production build completes.
- [x] 15.4 `npm run test:coverage` passes — zero failing tests.
- [x] 15.5 `npm run test:e2e` passes — zero failing tests.

## 16. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1, as amended by its `### Adjudications (2026-08-26)`.
> Resolve each open `Fix now` there before checking it off.

- [x] 16.1 A1 switch-row label: tasks 6.3/11.7 say `Back to <self name>`, delta and code say plain name — resolved — _tasks 6.3 and 11.7 reworded to the plain-name rule at adjudication; no code change_
- [x] 16.2 A2+C15 list-hero byline avatar dropped with `withSelfAvatar`; `<Avatar src={null}>` left standing — resolved — _dropped at adjudication_
- [x] 16.3 A3 `getItemsByListId` profile-agreement filter and `getList` rewrite documented by no task or delta — resolved — _dropped at adjudication_
- [x] 16.4 A4 task 6.1 claims `UserImage` still feeds surfaces; it is deleted — resolved — _task 6.1 reworded at adjudication; no code change_
- [x] 16.5 A5 task 8.4 claims a bare-verb submit shortening that is not implemented — resolved — _task 8.4 reworded and the `MAY` clause plus its scenario deleted from the `active-profile` delta at adjudication; no code change_
- [x] 16.6 A6 `canRemovePurchase` takes the self-profile; canonical `list-item-management` still says the acting profile — resolved — _dropped at adjudication; owned by #194_
- [x] 16.7 B7 `profile.cookie.ts` rationale comment false — the e2e helper declares the second literal it claims to prevent — resolved
- [x] 16.8 B8 `.menu-profile-avatar` / `.menu-item-count` defined outside the menu primitive's stylesheet — resolved
- [x] 16.9 B9 membership-gate query duplicated between `profile.gate.ts` and `switchActiveProfile` — resolved
- [x] 16.10 B10 `getMembershipsForUser` duplicates `getProfileCardsForUser`'s join and cache-tag structure — resolved
- [x] 16.11 B11 `Empty`'s dead `purchase` branch newly hardened into contract — spec and tasks pulled back at adjudication; remove the `type="purchase"` secondary-action test and the consumer-contract comment — resolved
- [x] 16.12 C12 `ProfileHeader` own-profile test compares the active profile while `followUser` guards on the self-profile — dead Follow affordance — resolved
- [x] 16.13 C13 `stampActedAs` invalidates before the deferred `last_active_at` write, so `refresh()` refills stale — resolved
- [x] 16.14 C14 `cursor: pointer` on `.profile-card:hover` including the non-clickable active card — resolved
- [x] 16.15 C16 newly-authored comments naming future issue numbers in `ProfileCardMenu` / `ProfileCard` — resolved
- [x] 16.16 T17 `signOutUser`'s cookie delete asserted nowhere — resolved
- [x] 16.17 T18 cookie options (`httpOnly`, `maxAge`) unobservable — the `cookies().set` mock drops them — resolved
- [x] 16.18 T19 `contentTagCalls` rationale false; `profilesOfUser` tag asserted nowhere — resolved
- [x] 16.19 T20 `canRemovePurchase`'s self/active split untested with the two profiles differing — resolved
- [x] 16.20 T21 connections fixtures collapse `selfProfile` and `activeProfile`, so the SHALL NOT is unpinned — resolved
- [x] 16.21 T22 `ItemsPage`'s `actingAs` empty-state and form forwarding untested — resolved
- [x] 16.22 T23 `UserAvatarPopover` trigger accent unasserted — resolved
- [x] 16.23 `npm run lint` — zero errors, two tolerated size warnings (`profile.actions.ts` 359, `profile.ts` 337)
- [x] 16.24 `npx tsc --noEmit` — zero errors
- [x] 16.25 `npm run build` — completes successfully
- [x] 16.26 `npm run test:coverage` — 258 files, 3229 tests, zero failures; every threshold met
- [x] 16.27 `npm run test:e2e` — 70 passed, zero failures

## 17. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.

- [x] 17.1 A1 `acceptance.md`'s single-profile flow still says the submit control "renders its bare verb" after the A5 pullback deleted the shortening — resolved — _dropped at adjudication; see Round 2's `### Adjudications` in `review.md`_
- [x] 17.2 A2 `active-profile` delta's purchased-empty-state SHALL and scenario survive the B11 pullback; `/purchased` renders no `<Empty>` — resolved
- [x] 17.3 B4 `lib/activeProfile.ts` imports a type from `app/` — the repo's only `lib/ → app/` dependency — resolved
- [x] 17.4 B5 the accent disc block is written three times across `menu.css`, `auth.css` and `profiles.css` — resolved — _dropped at adjudication; see Round 2's `### Adjudications` in `review.md`_
- [x] 17.5 B6+T12 `test/helpers/next-server.ts` is dead on arrival; no `lib/` module imports `next/server` — resolved
- [x] 17.6 C7 two comments in `profile.gate.ts` still describe the `after()` deferral the C13 fix removed — resolved
- [x] 17.7 T8 no test writes content with the active profile differing from the self-profile; the ownership rule survives inversion — resolved
- [x] 17.8 T9 `MyListsRail profileId={activeProfile.id}` unpinned — the HomePage fixture collapses self and active — resolved
- [x] 17.9 T10 the items library's active-read / self-name split is untested — resolved
- [x] 17.10 T11 the purchased view's self-profile scoping is untested and its test name is semantically stale — resolved
- [x] 17.11 `npm run lint` — zero errors, two tolerated size warnings (`profile.actions.ts` 359, `profile.ts` 339)
- [x] 17.12 `npx tsc --noEmit` — zero errors
- [x] 17.13 `npm run build` — completes successfully
- [x] 17.14 `npm run test:coverage` — 258 files, 3236 tests, zero failures; every threshold met
- [x] 17.15 `npm run test:e2e` — 70 passed, zero failures

## 18. Gates — round 3

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 3. Resolve each open `Fix now` there before checking it off.
> Round 3's verdict is `outgrew recheck` — the fix delta moved code and spec
> artifacts together, so the next round is `/incremental-spec-review`, whose
> status table supersedes this section.

- [x] 18.1 B1 `ownerActsAsManaged()` and its `MANAGED` constant are duplicated byte-identically across `list.actions.test.ts` and `item.actions.test.ts` — _dropped at adjudication; see `review.md` Round 4 Adjudications_
- [x] 18.2 C2 `list.actions.test.ts` fails `npm run check-format`; CI does not run it, so the drift lands silently — resolved — _round 4 widened the fix to three files: `list.actions.test.ts`, `UserAvatarPopover.test.tsx`, `test/helpers/next-headers.ts`_
- [x] 18.3 `npm run lint` — zero errors, two tolerated size warnings (`profile.actions.ts` 359, `profile.ts` 339)
- [x] 18.4 `npx tsc --noEmit` — zero errors
- [x] 18.5 `npm run build` — completes successfully
- [x] 18.6 `npm run test:coverage` — 258 files, 3238 tests, zero failures; every threshold met
- [x] 18.7 `npm run test:e2e` — 70 passed, zero failures

## 19. Gates — round 4

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 4. Resolve each open `Fix now` there before checking it off.
> Section 18's items are **not** superseded — round 4's status table found both
> still open, so 18.2 stays unchecked and is resolved alongside these. 18.1 was
> dropped at adjudication.

- [x] 19.1 B1 the `'active_profile'` cookie name is re-declared as a bare literal in three unit suites while four siblings import the constant — _dropped at adjudication; see `review.md` Round 4 Adjudications_
- [x] 19.2 B2 `data-layer-organization` still names the `{ userId, profile }` identity pair the change renamed, with no delta — resolved
- [x] 19.3 T3 the removal gate's `itemOwnerProfileId === actor.activeProfile.id` leg survives inversion with a green suite — resolved
- [x] 19.4 T4 the list-hero byline avatar's initials-only render is unpinned; the Avatar stub discards its props — _dropped at adjudication; see `review.md` Round 4 Adjudications_
- [x] 19.5 T5 `OwnerWithoutAvatar_RendersOwnerNameWithoutImage` asserts neither half of its name — _dropped at adjudication; see `review.md` Round 4 Adjudications_
- [x] 19.6 `npm run lint` — zero errors, two tolerated size warnings (`profile.actions.ts` 359, `profile.ts` 339)
- [x] 19.7 `npx tsc --noEmit` — zero errors
- [x] 19.8 `npm run build` — completes successfully
- [x] 19.9 `npm run test:coverage` — 258 files, 3238 tests, zero failures; every threshold met
- [x] 19.10 `npm run test:e2e` — 70 passed, zero failures
