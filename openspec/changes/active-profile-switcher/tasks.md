## 1. Schema and migration

- [ ] 1.1 Add a nullable `last_active_at` timestamp column to `profile_members` in `db/schema.ts`, beside `ride_along` and `created_at`. No default, no backfill — NULL is the correct value for a membership never acted as, per `profiles-data-model`.
- [ ] 1.2 Generate the migration (`npm run db:generate`) and hand-edit it to repo conventions per `DATABASE.md`: `IF NOT EXISTS` on the `ALTER TABLE … ADD COLUMN`, forward-only, no down-migration, an inline rollback note naming the column drop as the whole rollback.
- [ ] 1.3 Confirm the generated migration touches nothing else — no rewrite of the existing `profile_members` columns, constraints or the two self-role partial uniques — and that `drizzle/meta/_journal.json` carries only the appended entry.
- [ ] 1.4 Apply locally (`npm run db:migrate`), restart the dev server, and confirm every pre-existing membership row's `last_active_at` is NULL and the cascade on user- and profile-delete still carries the row away with its timestamp.

## 2. The selection store and the resolution seam

- [ ] 2.1 Add the active-selection cookie module — name, attributes and parse — alongside `lib/data/purchase.cookie.ts`'s shape: `httpOnly` (the selection SHALL NOT be readable by client script), `path: '/'`, `sameSite: 'lax'`, `secure` outside development, and a lifetime that survives a browser restart for as long as the session does.
- [ ] 2.2 Add the memberships read to `lib/data/profile.ts` (or `profile.identity.ts` where the import cycle forces it): the profiles an account holds a `self`/`owner`/`manager` membership on, carrying id, name, role, accent and `last_active_at`, ordered most-recently-acted-as first with NULL last. This is the one read that feeds resolution, the dropdown and the ordering.
- [ ] 2.3 Add active-profile resolution: read the selection, re-verify it against the account's current memberships server-side, and fall back to the self-profile for every unhonourable cause without distinguishing them — nothing stored, no membership, profile deleted, an id that never existed. Wrap it in the same request-scoped React `cache()` `getUserIdentity` already uses, so repeat resolution in one request costs no extra query.
- [ ] 2.4 Assert in the resolver that the read path writes no cookie: a stale or forged selection falls back and leaves the stored value alone.
- [ ] 2.5 Change `getUserIdentity` in `lib/data/profile.ts` to return `{ userId, selfProfile, activeProfile }` and **delete** the `profile` field rather than reinterpreting it, per design. Update `UserIdentity` in `lib/types.ts` to match, and rewrite the stale header comment that says `profile` means "the profile this request acts as — today always the account's self-profile".
- [ ] 2.6 Update `authedIdentity`'s header comment in `lib/data/user.session.ts` to name both profiles and the split rule, per `server-endpoint-authorization`.
- [ ] 2.7 Run `npx tsc --noEmit` and record the resulting error list as the work queue for section 3 — the typechecker enumerating the call sites is the migration strategy, not an audit.

## 3. The self-versus-active split at every call site

> Work the `tsc` queue from 2.7. Each site takes the active profile where it compares
> or writes an ownership column, the self-profile where it names or acts for the human,
> per `active-profile`'s division. Nothing keeps a default.

- [ ] 3.1 **Active** — `lib/data/list.actions.ts`, `lib/data/item.actions.ts`, `lib/data/item.associations.ts`, `lib/data/item.placeholder.actions.ts`, `lib/data/listItems.actions.ts`: creation writes the active profile as owner, and every ownership comparison compares against it.
- [ ] 3.2 **Active** — `app/(main)/lists/MyListsPage.tsx`, `app/(main)/items/page.tsx`, `app/(main)/items/ui/components/ItemsContainer.tsx`, `SortItemsContainer.tsx`, `app/(main)/items/[id]/ItemFormBody.tsx`, `app/(main)/lists/[id]/page.tsx`, `ListItemsSection.tsx`, `choose-items/ChooseItemsBody.tsx`: profile-scoped content reads and their owner checks.
- [ ] 3.3 **Active** — the home page's **My Lists** rail in `app/(main)/HomePage.tsx`. It is an owned-lists read and its own **See all** goes to `/lists`, so binding it to the self-profile would disagree with its destination.
- [ ] 3.4 **Self** — `app/(main)/HomePage.tsx`'s Following, Bookmarks and Recently visited rails and the following feed; `app/(main)/purchased/page.tsx`; `app/(main)/settings/connections/FollowersSection.tsx` and `BlockedSection.tsx`; `lib/data/visit.actions.ts`.
- [ ] 3.5 **Self** — `lib/data/purchase.actions.ts`: the claim asserter and a self-claim's purchaser. And `lib/data/purchase.ts`'s `sanitizePurchases` viewer argument, so a viewer's own claims keep their unclaim affordance while they act as another profile.
- [ ] 3.6 **Self** — `lib/data/profile.actions.ts`'s `blockUser` and `unblockUser`: the blocker end is always the actor's self-profile, per `following` and the block ADR. Its either-direction block gate in `followUser`/`unfollowUser` resolves the viewer by self-profile too.
- [ ] 3.7 **Split** — `app/(main)/lists/[id]/ListHeroSection.tsx`: the Follow affordance's two gates take different profiles. The owner comparison takes the **active** profile; the block comparison takes the **self**-profile. Name each at the call site rather than letting one variable serve both.
- [ ] 3.8 **Split** — `app/(main)/user/[id]/ProfileHeaderSection.tsx` and `getProfileForViewer` in `lib/data/profile.ts`: its `viewer.profile.id` reads feed both an is-this-me comparison and two block checks. Resolve each to the profile its own meaning calls for and change the parameter so a caller cannot pass one profile for both.
- [ ] 3.9 Re-run `npx tsc --noEmit` and confirm zero errors and no surviving reference to a removed `profile` field — the acceptance flow *The seam's split is enumerated by the typechecker*.

## 4. The membership gate, the switch action, and recency

- [ ] 4.1 Add the shared profile-scoped write gate: confirm server-side, against current membership rows, that the acting account holds `self`/`owner`/`manager` on the profile the request acts as, before any row is written. Reject with `error: 'Forbidden'` and no database write. One gate, not a per-endpoint re-implementation — `server-endpoint-authorization` requires the single place so a later write cannot omit it.
- [ ] 4.2 Route every profile-scoped write in `lib/data/*.actions.ts` through the gate. The ownership comparison each mutation already makes is unchanged: holding a membership makes a profile selectable, never authorizes a write against it.
- [ ] 4.3 Put the recency stamp inside the gate, fired from `after()`: one conditional `UPDATE` on the membership row guarded on `last_active_at IS NULL OR last_active_at < now() - interval '1 hour'`. Single statement — the driver has no interactive transactions — and idempotent, so a repeat is free.
- [ ] 4.4 Fire the narrow `profilesOfUser` invalidation with the stamp, and confirm the hourly guard means a burst of writes fires one write and one invalidation rather than one per mutation.
- [ ] 4.5 Add the switch server action to `lib/data/profile.actions.ts`: re-verify membership on the target, reject a target the viewer holds none on without writing a selection, and on success store the cookie, stamp the membership as acted-as, and re-render the current route so the viewer stays on the page they were on.
- [ ] 4.6 Discard the selection on sign-out, in the existing `signOutUser` path, so a second account signing in on the same browser does not inherit it.
- [ ] 4.7 Verify design's caching finding against the source rather than trusting it: no `'use cache'` function reads the session, every `'use cache'` read takes its profile id as an argument, and reading the cookie adds no dynamic constraint the existing `auth()` JWT cookie read has not already added. Record what the check found; if it disagrees with design, that is a `/run-aground`, not a silent fix.

## 5. Deferred handles from acceptance.md

> Each resolves one inline `*TODO:*` marker. A marker with no decision is a
> deferred decision nobody is holding — settle these before the surfaces below
> are built, so the flows can be refined with real handles at the end.

- [ ] 5.1 Resolve the `*TODO:*` in `Flow: The avatar dropdown offers the profiles the viewer is not acting as` — how the profile count is presented on the dropdown's `Profiles` row.
- [ ] 5.2 Resolve the `*TODO:*` in `Flow: Switching from the dropdown re-renders the route the viewer is on` — the transient confirmation's copy, which every switch surface raises.
- [ ] 5.3 Resolve the `*TODO:*` in `Flow: Switching from a profile card leaves the viewer on the Profiles page` — the active badge's text alternative. The card renders `Active profile` today; confirm or replace it deliberately rather than by inheritance.
- [ ] 5.4 Resolve the `*TODO:*` in `Flow: A creation form states which profile the new content is for` — the heading-region copy naming the profile the new content is for.
- [ ] 5.5 Resolve the `*TODO:*` in `Flow: An empty profile-scoped surface offers a route to the Profiles page` — the secondary action's label, which names no profile.

## 6. The nav avatar and its dropdown

- [ ] 6.1 Change the gradient nav's avatar to render the **active** profile in `app/(auth)/ui/components/UserAvatarPopover.tsx`: that profile's initials, with its accent as a ring. Remove `session.user.image` from the nav entirely — `UserImage` keeps feeding follower, purchaser and list surfaces.
- [ ] 6.2 Add the switch group to the popover, above the `Profiles` / `Connections` destinations and `Sign out`, excluding the profile being acted as, so no row is inert.
- [ ] 6.3 Render the viewer's own row as `Back to <self name>` whenever the active profile is not their own, and render no switch rows at all for a viewer who runs only their self-profile.
- [ ] 6.4 Cap the group at five rows, ordered most-recently-acted-as first, and carry the viewer's profile count on the `Profiles` row whenever it is more than one — the cap is the surface's limit, and the count is what stops it reading as the whole set.
- [ ] 6.5 Give each switch row the profile's own avatar slot in its leading position — initials on the accent until avatar art lands — and no navigation icon. `menu-system` exempts the switch group from sibling-distinct icons; do not invent five.
- [ ] 6.6 Wire each row to the switch action and raise the transient confirmation from 5.2.

## 7. The Profiles page

- [ ] 7.1 Make the card body a click target in `app/(main)/profiles/ui/components/ProfileCard.tsx` that switches rather than navigates, with the management menu excluded by propagation so opening the menu does not also switch. The card still contains no link until its menu is opened.
- [ ] 7.2 Replace `ProfileCard`'s `isActive = profile.role === 'self'` with the resolved active profile, and delete the comment claiming the role IS the active state. The mark moves as the viewer switches and rests on the self-profile only while they act as themselves.
- [ ] 7.3 Add `Switch to <name>` to `ProfileCardMenu` as a `<MenuItem>` — an action, not a destination — ordered before `Edit <name>`, and absent from the card of the profile already being acted as. This is the keyboard-reachable path to switching from this surface. Update the menu's "One row today" header comment.
- [ ] 7.4 Raise the same confirmation on a card switch, from both the body and the menu row.

## 8. Empty states and creation surfaces

- [ ] 8.1 Give `app/ui/components/Empty.tsx` an optional secondary action — destination and label — rendered as `<LinkButton variant="secondary">` immediately after the CTA, inside the same `empty-container`. With none supplied, every existing consumer renders exactly what it renders today.
- [ ] 8.2 Make `type === 'purchase'` reject a secondary action rather than render one: the purchased view is scoped to the human and has nothing to switch between, so it continues to render no interactive element at all.
- [ ] 8.3 Supply the secondary action from `/lists` and `/items` when the active profile has nothing to show **and** the viewer runs more than one profile. A viewer who runs only their own sees the surface exactly as it is today. Copy names no profile — neither the active one nor any other.
- [ ] 8.4 State the profile in the list and item creation forms (`app/(main)/lists/ui/components/ListForm.tsx`, `app/(main)/items/ui/components/itemform/`): the heading region names the active profile as the one the new content is for, and the submit control names it too, shortening to its bare verb where the width does not permit. The heading region does not shorten.
- [ ] 8.5 Render the statement only for a viewer who runs more than one profile — a single-profile viewer has no ambiguity and is shown no statement that could only name themselves.

## 9. Removing the dormant seam

- [ ] 9.1 Delete `bypassActiveProfile()` and the `BYPASS_ACTIVE_PROFILE` env read from `lib/auth.ts`, and its cases from `lib/__tests__/auth.test.ts`. It is cut unused: an env var is process-global and cannot give one spec a managed-profile context and another the self-profile.
- [ ] 9.2 Remove `BYPASS_ACTIVE_PROFILE` from `LOCALDEV.md` (its own `## Active profile` section and the seeded-coverage mention) and from `.env.example` if it appears there. `BYPASS_SESSION_USER` is untouched.
- [ ] 9.3 Remove the bypass avatar constant from `lib/auth.ts` if the nav change leaves it with no consumer; keep it if a surface still reads it, and say which.

## 10. Seed and local dev

- [ ] 10.1 Add a second managed profile to `scripts/seed-dev-users.ts` on which the primary test viewer is `manager` rather than `owner`, so the viewer runs three profiles across all three roles and the `manager` role is covered by a fixture.
- [ ] 10.2 Give the seeded memberships deterministic, distinct `last_active_at` values far enough apart to order unambiguously, with at least one left NULL — the fixture that lets a switcher's ordering be told from a broken one, and the never-acted-as branch's fixture.
- [ ] 10.3 Confirm `db:reset:dev`'s wipe still reaches every profile a seeded user holds any membership on, including the new one, and still precedes the seeded-user delete.
- [ ] 10.4 Run `npm run db:reset:dev`, restart the dev server, and confirm the three memberships, their timestamps and the NULL are recreated deterministically.
- [ ] 10.5 Update `LOCALDEV.md`'s profile coverage section for the second managed profile and the seeded timestamps, and state that local development switches through the real UI.

## 11. Unit tests

- [ ] 11.1 Cover active-profile resolution directly: a held membership resolves; a revoked membership, a forged id, a deleted profile and an absent selection each fall back to the self-profile with no error and no cookie write.
- [ ] 11.2 Cover the membership gate directly rather than only incidentally through the actions that call it — it is load-bearing twice, for authorization and for the recency stamp, and design names it a single point of failure worth its own coverage. Include the rejection shape (`error: 'Forbidden'`, no write) and that another held membership does not widen the current request.
- [ ] 11.3 Cover the recency stamp's hourly guard: a stamp older than an hour updates, one inside the hour does not, and a NULL stamps.
- [ ] 11.4 Cover the switch action: a held target stores the selection and stamps; an unheld target rejects, stores nothing and leaves the target's timestamp unchanged.
- [ ] 11.5 Cover the split at its riskiest sites: a claim recorded while acting as a managed profile names the self-profile; `blockUser` inserts exactly one row whose blocker is the self-profile; the block gates compare the self-profile whatever profile is acted as.
- [ ] 11.6 Cover `Empty`'s secondary action: supplied renders after the CTA with the label and href; absent leaves the container as its sibling requirements describe; `type="purchase"` renders no `<button>` and no `<a>` even when one is supplied.
- [ ] 11.7 Cover the dropdown's switcher: the active profile is never offered, `Back to <self name>` appears only when acting as another, a single-profile viewer gets no rows and no count, and twelve profiles yield five rows and a count of twelve.
- [ ] 11.8 Cover the card: the body switches without navigating, the menu's trigger does not switch, the switch row is absent from the active profile's card, and the active mark and badge move with the switch.
- [ ] 11.9 Cover the creation-surface statement in both directions — multi-profile viewer sees it in the heading region and on the submit control; single-profile viewer sees none.

## 12. End-to-end

- [ ] 12.1 Add the profile-switch spec to `e2e/`: starting un-pinned on the self-profile, switch through a real switching affordance, assert `/lists` re-renders as that profile's collection, switch back, assert it is the viewer's own again. Drive the switch through the UI rather than pinning the selection — the failure mode this covers is invisible to a unit test holding a mocked session.
- [ ] 12.2 Select a switch target that is **not** the seeded membership left with a NULL `last_active_at`: a switch stamps it and no affordance unsets it, so consuming that fixture would break the never-acted-as ordering branch for every later run against the same database.
- [ ] 12.3 Document the residue in the spec file — the stamp a switch leaves is a mutation the viewer's UI cannot reverse — per the suite's contained-residue rule.
- [ ] 12.4 Add the cookie-pinning helper to `e2e/helpers` for a spec that needs a non-default starting acting profile: `context.addCookies()` with the application's own selection cookie, httpOnly included. No environment override.

## 13. Specs, docs, and ADR

- [ ] 13.1 Promote `2026-08-25-the-active-profile-is-the-authorization-context` into `openspec/adr/2026-08-25-the-active-profile-is-the-authorization-context.md`, and add its rows to `openspec/adr/INDEX.md` under **Touching** `DAL` and `DB Queries`.
- [ ] 13.2 Promote `2026-08-25-actor-resolution-names-both-profiles` into `openspec/adr/2026-08-25-actor-resolution-names-both-profiles.md`, and add its row to `openspec/adr/INDEX.md` under **Touching** `DAL`.
- [ ] 13.3 Promote `2026-08-25-a-block-belongs-to-the-human` into `openspec/adr/2026-08-25-a-block-belongs-to-the-human.md`, and add its rows to `openspec/adr/INDEX.md` under **Touching** `DAL` and `DB Queries`.
- [ ] 13.4 Promote `2026-08-25-active-selection-in-a-cookie-recency-on-the-membership` into `openspec/adr/2026-08-25-active-selection-in-a-cookie-recency-on-the-membership.md`, and add its rows to `openspec/adr/INDEX.md` under **Touching** `DB Schema` and `DAL`.
- [ ] 13.5 Promote `2026-08-25-no-environment-override-for-the-acting-profile` into `openspec/adr/2026-08-25-no-environment-override-for-the-acting-profile.md`, and add its rows to `openspec/adr/INDEX.md` under **Touching** `E2E Test` and `Local Dev`.
- [ ] 13.6 Check each `MODIFIED` block in `specs/` against the source before applying it — design records that the specs have drifted from the code in places, and that where they disagree the source is authoritative for what is true today.
- [ ] 13.7 Refine `acceptance.md`'s flows with the literal handles the implementation landed — real button text, real routes, real command names — and confirm no `*TODO:*` marker survives. Refine, not rewrite: flow identity and journey scope stay as drafted.
- [ ] 13.8 Run `openspec validate active-profile-switcher --strict` and resolve anything it reports.

## 14. Pre-merge

All five gates run locally against the author's real `.env.local` before review is
requested. This change edits production source, a migration, the seed and tests, so
no gate is exempt.

- [ ] 14.1 `npm run lint` passes — zero errors, zero non-size warnings.
- [ ] 14.2 `npx tsc --noEmit` passes — zero errors.
- [ ] 14.3 `npm run build` passes — production build completes.
- [ ] 14.4 `npm run test:coverage` passes — zero failing tests.
- [ ] 14.5 `npm run test:e2e` passes — zero failing tests.
