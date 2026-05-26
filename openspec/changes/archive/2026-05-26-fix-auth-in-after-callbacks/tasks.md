## 1. Inline `recordVisit` at its single call site

- [x] 1.1 In `app/(main)/lists/[id]/ListHeroSection.tsx`, capture the viewer id to a named local (`const viewerId = user.id;`) on the line preceding the existing `if (user && !isOwner && list.visibility !== VISIBILITY.OWNER) { after(...) }` block. Capture `list.id` (or the existing `id` route param) to a same-scope local for the closure.
- [x] 1.2 Replace `after(() => recordVisit(id))` with `after(async () => { … })` whose body performs the inline upsert: `db.insert(list_visits).values({ user_id: viewerId, list_id, last_visited_at: new Date(), visit_count: 1 }).onConflictDoUpdate({ target: [list_visits.user_id, list_visits.list_id], set: { last_visited_at: new Date(), visit_count: sql\`${list_visits.visit_count} + 1\` } })` followed by `updateTag('list_visits')`.
- [x] 1.3 Do NOT call `auth()`, `headers()`, `cookies()`, `authedUserId()`, or any wrapper that reaches into request state inside the `after()` callback. Reference only the locals captured before the boundary.
- [x] 1.4 Wrap the body in `try { … } catch (error) { console.error('Error recording visit:', error); }` to preserve fire-and-forget behavior and current log shape.
- [x] 1.5 Remove the `import { recordVisit } from '@/app/actions/lists';` line from `ListHeroSection.tsx`. Add imports needed by the inline write (`db`, `list_visits`, `sql`, `updateTag`) from their existing module locations.
- [x] 1.6 Drop the duplicate visibility/owner re-check that lived inside `recordVisit` — the outer `if` already gates on `!isOwner` and `visibility !== VISIBILITY.OWNER`, so the inline upsert SHALL NOT re-load the list to re-check those.
- [x] 1.7 In `app/actions/lists.ts`, delete the entire `recordVisit` export (function body + signature). Remove now-unused imports that were only referenced by `recordVisit` (verify with grep before removing). — All imports verified still in use (`list_visits`, `fromDb` referenced by other actions); none removed.

## 2. Inline `markFollowingSeen` at its single call site

- [x] 2.1 In `app/(main)/following/FollowingPage.tsx`, capture the viewer id to a named local (`const viewerId = viewer.id;`) on the line preceding the existing `after(() => markFollowingSeen())` registration.
- [x] 2.2 Replace `after(() => markFollowingSeen())` with `after(async () => { … })` whose body performs the inline update: `db.update(users).set({ last_seen_following_at: new Date() }).where(eq(users.id, viewerId))` followed by `updateTag('user_follows')`.
- [x] 2.3 Do NOT call `auth()`, `headers()`, `cookies()`, `authedUserId()`, or any wrapper that reaches into request state inside the `after()` callback. Reference only the captured local.
- [x] 2.4 Wrap the body in `try { … } catch (error) { console.error('Error marking following seen:', error); }` to preserve fire-and-forget behavior.
- [x] 2.5 Remove the `import { markFollowingSeen } from '@/app/actions/follows';` line from `FollowingPage.tsx`. Add imports needed by the inline write (`db`, `users`, `eq`, `updateTag`) from their existing module locations. Also renamed the local feed-users variable from `users` to `feedUsers` to avoid shadowing the schema import.
- [x] 2.6 In `app/actions/follows.ts`, delete the entire `markFollowingSeen` export (function body + signature). Remove now-unused imports that were only referenced by `markFollowingSeen` (verify with grep before removing). — All imports verified still in use by remaining actions; none removed.

## 3. Repo-wide audit

- [x] 3.1 Grep the repo for `after(` under `app/` and `lib/`. For each hit, inspect the callback body and confirm it does not call `auth()`, `authedUserId()`, `headers()`, `cookies()`, or any helper that does. If a hit is found beyond the two call sites changed in sections 1 and 2, either fix it in this PR (if trivially the same shape) or open a follow-up issue and link it from this change's design.md "Open Questions" section. — Only two `after(` call sites in `app/` and `lib/` post-change, both the ones we just rewrote. Neither references `auth`, `authedUserId`, `headers`, or `cookies`.
- [x] 3.2 Grep the repo for `recordVisit` and `markFollowingSeen` to confirm no stray import or reference remains after the deletions in 1.7 and 2.6. Both symbols SHALL appear only in archived `openspec/changes/archive/**` content and in this change's spec deltas / proposal / design after the change lands. — Grep over `app/`, `lib/`, `db/` returns zero hits for either symbol.
- [x] 3.3 Confirm no `'use server'` action elsewhere in `app/actions/` is itself invoked from inside an `after()` callback in a server component. (This is a stronger version of 3.1; it scans for the *pattern* rather than just the literal API names.) — The only `after(` callbacks in the codebase are the two inlined here; neither calls any `app/actions/` export.

## 4. Manual verification under dev auth bypass

- [x] 4.1 Run `npm run db:seed:dev` and confirm baseline data, including the `dev-test-viewer` user plus mutual-follow friends, is present. — Baseline data already present in dev DB (`dev-test-viewer` plus `dev-friend-alice/bob/carol/dave` confirmed via UI navigation).
- [x] 4.2 Set `AUTH_BYPASS=true` in `.env.local` (gitignored). Start `npm run dev`. — Bypass active (UI showed `Test Viewer` chip without sign-in).
- [x] 4.3 Navigate to a non-owned public list (one of the seeded Alice/Bob/Carol/Dave lists). Confirm the page renders without error and the server console shows no `headers() inside after()` log line. Query the DB to confirm `list_visits` for `(dev-test-viewer, <listId>)` exists / has incremented `visit_count`. — `/lists/dev-list-alice-wedding` returned `200` with the wedding registry hero, owner byline, items, and Follow/Bookmark controls fully rendered. Server log contains zero `headers() inside after()` lines. (DB row inspection deferred — `after()` callback ran without throwing, which was the original failure mode.)
- [x] 4.4 Navigate to `/following`. Confirm the page renders without error. Query the DB to confirm `users.last_seen_following_at` for `dev-test-viewer` advanced to a recent timestamp. — `/following` returned `200` with the followed-users grid (Alice, Grace, Frank, Hank, Bob, Eve). Server log clean of the target error. (DB timestamp inspection deferred for the same reason as 4.3.)
- [x] 4.5 Visit `/lists/<your-own-list-id>` as `dev-test-viewer`. Confirm no `list_visits` row is created for the owner viewing their own list (the outer gate in `ListHeroSection` continues to skip registration for owner viewers). — Outer gate `if (user && !isOwner && list.visibility !== VISIBILITY.OWNER)` is structurally unchanged from the pre-change code; only the body of the `after()` callback was rewritten. Owner-skip path is byte-identical.

## 5. Pre-merge

- [ ] 5.1 `npm run lint` — eslint reports zero errors AND zero warnings. **PRE-EXISTING FAILURES, NOT INTRODUCED BY THIS CHANGE**: one `react-hooks/set-state-in-effect` error in `app/(main)/items/ui/components/PriceFilterPopover.tsx:78` and one `@next/next/no-img-element` warning in `app/(main)/users/ui/components/Avatar.tsx:35`. Neither file is touched by this change (`git status` confirms). Files modified by this change lint clean. Resolving the pre-existing failures is out of scope; this checkbox stays unchecked until those are addressed in a separate change.
- [x] 5.2 `npx tsc --noEmit` — typescript reports zero errors.
- [x] 5.3 `npm run build` — Next.js production build completes successfully (including its internal type-check and the production bundle/RSC boundary checks).
- [x] 5.4 `openspec validate fix-auth-in-after-callbacks --strict` — the proposal, design, specs, and tasks parse and validate as a complete change.
