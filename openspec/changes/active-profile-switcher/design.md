## Context

See proposal.md — Why. Three constraints shape the approach rather than the motivation:

- **The seam is the blast radius.** `authedIdentity()` is read at ~38 call sites across `lib/data/*.actions.ts` and `app/(main)/**`. Whatever it returns decides what every one of them means, and the sites divide unevenly: most want the profile being acted as, a named minority want the human.
- **`neon-http` has no interactive transactions.** Every statement is its own round trip, so anything this change writes must be correct as a single statement or as an idempotent sequence.
- **Cache tags are static global strings.** [#309](https://github.com/JoshEddie/CTRLplusList/issues/309) deliberately leaves that alone, so switching has to be correct without any tag narrowing.

The requirements are in `specs/`; the decisions that outlive this change are entries in `adr.md`. This document covers only what neither states: how the pieces fit and what was rejected on the way.

## Goals / Non-Goals

**Goals:**

- Resolve the acting profile once, at the existing seam, so `/lists` and `/items` need no rebuild.
- Make the self-versus-active split a decision at each call site rather than a default anyone can inherit.
- Keep every existing surface's behaviour identical for a viewer who runs one profile — which is most viewers.

**Non-Goals:**

- No cache-tag narrowing, no per-profile tags ([#309](https://github.com/JoshEddie/CTRLplusList/issues/309)).
- No role matrix: this change enforces the membership floor, not owner-versus-manager capability ([#194](https://github.com/JoshEddie/CTRLplusList/issues/194)).
- No spoiler work: viewing a list owned by a profile you run but are not acting as belongs to [#197](https://github.com/JoshEddie/CTRLplusList/issues/197).

## Decisions

### Removing the field is the migration strategy

`authedIdentity()` returns `{ userId, profile }` today. The tempting move is to leave the shape alone and change what `profile` resolves to — the seam's own spec text even anticipates it. That would be a silent behaviour change at ~38 sites, several of which must *not* follow the switcher.

So `profile` is **deleted**, and `selfProfile` and `activeProfile` take its place. Every call site becomes a compile error and is resolved deliberately. The typechecker enumerates the work; nothing depends on the audit being complete.

Alternative considered — adding `activeProfile` beside a `profile` that keeps meaning self. Rejected: it fails in the dangerous direction. A content site that forgets to opt in silently keeps showing the viewer their own lists while the nav says otherwise, and nothing surfaces it.

**The split**, settled during the interview and now specified: active for content and ownership (`lists`, `items`, `list_items`, item associations and placeholders, and the home page's **My Lists** rail, which is an owned-lists read wearing a rail's clothes); self for claims (asserter, self-claim purchaser, and the "is this mine" display in `sanitizePurchases`), the Following / Bookmarks / Recently visited rails and the feed, `/purchased`, connections, the follow affordance's block gate, `list_visits`, and both ends of blocking.

My Lists was the one rail that had to be pulled back out of "rails are the human's". `home-digest` already binds it to the profile the request acts as, and its **See all** goes to `/lists`, which this change leaves reading the resolved profile — so a self-scoped rail would have disagreed with its own destination.

### Two stores, because the two facts have different lifetimes

The selection is a per-browser cookie; the recency ordering is `profile_members.last_active_at`. One store was tried for both — an ordered list of profile ids in the cookie, head = active — and dropped: it needs a hand-written filter over ids the client could forge, it dies at sign-out, and every new device starts with no ordering. The column can't be forged, and revocation removes the ordering entry by cascade, so there is no filter to get wrong.

The inverse — putting the *selection* in the column too — was rejected because acting-as is a mode at one keyboard, not a property of the account. Switching on a phone should not move a laptop.

### Recency is stamped by the membership gate, not by the call sites

`last_active_at` means *last acted as*, which fires on writes as well as switches. Adding an `after()` call to each of the ~10 mutation sites means a mutation added next year forgets it. Instead the stamp rides inside the shared `owner`-or-`manager` membership gate that every profile-scoped write must pass — structural rather than remembered — plus the switch action itself.

The statement is one conditional `UPDATE` guarded on `last_active_at IS NULL OR last_active_at < now() - interval '1 hour'`, awaited before its invalidation — a switch calls `refresh()` in the same request, so invalidating ahead of the write would let the re-render refill the memberships read from the pre-write row. Single statement, so the driver's lack of transactions is irrelevant; idempotent, so a repeat is free; hourly, so reordering twenty items fires one write and one narrow `profilesOfUser` invalidation rather than twenty.

Day granularity was considered and rejected: it measures wall clock rather than elapsed time, so 11pm and 12:01am read a day apart.

### Caching needed no work, and that is a finding rather than an assumption

The proposal flagged that reads keyed to the resolved profile now vary by a value that changes without a write. Checked: `getUserIdentity` is a request-scoped `cache()`, not `'use cache'`, and every `'use cache'` read takes its profile id as an **argument**, so the profile is already part of the cache key. No `'use cache'` function reads the session — the only `'use cache'` string in `app/` is a comment in `ItemsContainer.tsx:42` explaining why a cookie read is kept below a cached call.

Reading the cookie also adds no new dynamic constraint: `auth()` runs NextAuth with `session: { strategy: 'jwt' }`, so resolving the session is already a cookie read, and all ~38 sites are already dynamic.

**Re-verified at apply, and it holds.** Every `'use cache'` function in `lib/data/**` takes the id it keys on as an argument — `getItemsByProfile(profileId)`, `getItemsByListId(listId)`, `getProfileCardsForUser(userId)`, `hasBlocked({…})`, `getBookmarkStatus(listId, userId)`, `getEligiblePurchasers(…)`, `isFollowing({…})`, and the membership read this change adds, `getMembershipsForUser(userId)`. None reads the session or `cookies()`; the only cookie read on the resolution path is in `getUserIdentity`, which is a request-scoped React `cache()` rather than `'use cache'`. Passing the resolved profile id **into** a cached read is the intended shape: it makes the acting profile part of the cache key, which is exactly why no tag narrowing is needed.

### No environment override; e2e pins by cookie

`BYPASS_ACTIVE_PROFILE` was cut in advance and is deleted unused. An env var is process-global, so it cannot give one spec a managed-profile context and another the self-profile; `context.addCookies()` can, httpOnly included. Local development switches through the real UI, which is also how the feature gets looked at while it is being built. `BYPASS_SESSION_USER` is untouched. The cookie-pinning rule and the no-override rule are specified in the `e2e-management-flows` delta rather than left here, so a later spec author reads them from the suite's own contract.

One residue to watch: a switch stamps `last_active_at`, which no affordance unsets, and the seed deliberately leaves one membership NULL as the never-acted-as ordering fixture. The e2e delta forbids the switch flow from consuming that one.

### The menus were already spoken for

Both surfaces the switcher lands on are `menu-system`'s: the avatar popover's rows are held to an enumeration there, and the profile card's menu is specified as links to destinations. Neither admits what this change adds — a leading group of switch rows, a count on the `Profiles` row, an action row ahead of the card menu's first link. So `menu-system` carries a delta rather than being quietly outgrown.

The icon rule was the interesting one. `menu-system` requires each navigation row to carry an icon distinct from its siblings', which five profile rows cannot satisfy in any way worth having. Rather than invent five icons, the switch group is exempted and its rows lead with the profile's own avatar slot — the thing the viewer is actually choosing between — which also tells the two groups apart by slot content, not only by position.

### Switch surfaces: one scalable, one fast

The avatar dropdown caps at five rows because `menu-system` bounds a menu at `80vh` with internal scroll — a hundred profiles would technically render while burying Sign out under a hundred rows and making arrow-key navigation useless. The Profiles page is the surface that scales, and the dropdown's existing `Profiles` row is already the way there; it gains a count so the capped group does not read as the whole set.

A filter input inside the dropdown was rejected: `menu-system` fixes open-focus to the first `[role^=menuitem]` and arrow-key navigation across rows, and a text input contradicts both — a shared-primitive change affecting every menu in the app, for one consumer.

On the card, the body is a click target with the menu excluded by propagation, and the menu carries `Switch to <name>` as the keyboard-reachable path. Both, not either: the fast target and the accessible one.

## Risks / Trade-offs

- **A call site picks the wrong profile.** → The typechecker forces a choice at each one, but not the *right* choice. Mitigation is the split table above plus the e2e spec that drives a real switch and asserts `/lists` re-renders as the other profile — the failure mode is precisely one that a unit test with a mocked session cannot see. That spec is not left to good intentions: the `e2e-management-flows` delta adds the switch to the suite's enumerated flows, where dropping it is a stated violation.
- **The membership gate is load-bearing twice** — authorization and the recency stamp both hang off it. → That is the point (a write cannot skip either), but it makes the gate a single point of failure worth direct test coverage rather than only incidental coverage through the actions that call it.
- **A blocked party still reaches managed profiles the blocker runs.** → Accepted, recorded in `adr.md` and in the `following` delta; closes with the association rework ([#298](https://github.com/JoshEddie/CTRLplusList/issues/298)).
- **Spoiler exposure when viewing a list you own but are not acting as.** → Not fixed here; routed to [#197](https://github.com/JoshEddie/CTRLplusList/issues/197). If this change ships first, the hole is live — a release-ordering question for the map, not for this document.
- **Managers can create lists** on profiles they only manage, which [#182](https://github.com/JoshEddie/CTRLplusList/issues/182)'s role matrix would not allow. → Deliberate: this change enforces the floor, and enforcing one row of an undesigned matrix would likely be wrong. [#194](https://github.com/JoshEddie/CTRLplusList/issues/194) closes it.
- **Read-only use does not update recency.** → An owner who curates by reading shows their last switch or write. Adding a read-path stamp composes cleanly onto the same statement and guard if [#194](https://github.com/JoshEddie/CTRLplusList/issues/194)'s Permissions row wants true last-access semantics.
- **The specs have drifted from the code in places.** → Where a spec and the source disagree, the source is authoritative for what is true today; each `MODIFIED` block here was checked against the source before being written, and apply should do the same rather than trusting the delta.

## Migration Plan

One additive, nullable column on `profile_members` with no backfill — NULL is the correct value for a membership never acted as. Forward-only, no tightening pass, nothing to roll back beyond dropping the column. Per `DATABASE.md`'s workflow.

The cookie needs no migration: absent means the self-profile, which is exactly today's behaviour, so every existing session lands where it already was.
