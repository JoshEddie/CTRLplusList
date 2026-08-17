# Design — profiles-schema-phase-2

## Context

See [proposal.md](proposal.md) — Why, and the terrain re-verified at departure. The requirements this design implements are in [specs/](specs/).

Three constraints shape every decision below:

- **No interactive transactions.** `neon-http` makes each statement its own HTTP round-trip ([DATABASE.md](../../../DATABASE.md)). Atomicity comes from unique / partial-unique indexes and `ON CONFLICT`, or from a single `DO $$` block; it never comes from `db.transaction(...)`.
- **Two id spaces on the same rows.** An account id and a profile id are both strings, so a comparison across them type-checks and evaluates false for every row. Nothing in the type system catches it, and nothing throws — a mistake here is a silent behavior change, which is why the column work and the comparison rewrite cannot ship apart.
- **One profile per account.** No surface creates a second profile and none switches to one. The self-profile is a complete stand-in for the account, so every "is this mine" question is answerable by strict equality.

**Acceptance bar: no user-visible change in behavior.** `e2e-critical-flows` and `e2e-management-flows` pass with two classes of edit allowed: the `/user/[id]` address literals, because task 7.1 deliberately re-points that segment from an account id to a profile id, and comment-only updates naming a DAL function this change renames. Any edit that touches a spec's executable lines is a defect signal, not maintenance — the suites are the primary evidence that a pointer switch stayed a pointer switch.

## Goals / Non-Goals

**Goals:**

- Land the seven profile columns, their backfills, and the constraint work as one forward-only migration.
- Move every read, write, and ownership comparison onto profile ids in the same change, leaving no cross-kind comparison behind.
- Give identity resolution one seam that a later switcher can extend without renaming anything.

**Non-Goals:**

- Restructuring where authorization happens. Checks stay where they already are (D3).
- Any multi-profile machinery — switching, creation, roles, membership reads, block cascade.
- Applying the migration to production. The owner hand-assembles a single transactional script; this change produces the forward migration only.
- Renaming the `following` capability's `Profile pages SHALL exist at /u/[id]…` requirement header. Its body is corrected to the real `/user/[id]` route in this change's delta, but the header is left verbatim so the MODIFIED block still matches the existing requirement. A rename is a separate tidy-up.

## Decisions

### D1 — One forward-only migration, ordered so no guarantee is ever absent

One generated Drizzle migration, hand-completed. Statement order:

1. Add all seven columns nullable.
2. Backfill each through the owning account's self-profile, `IF NOT EXISTS`-guarded and idempotent, per the `0001_black_legion.sql` precedent.
3. Set `NOT NULL` where the predecessor is `NOT NULL`.
4. Create the new partial unique over `purchases (item_id, profile_id)` — **before** touching anything else on `purchases`.
5. Drop and recreate the `user_follows` and `user_blocks` primary keys over the profile columns.
6. `DROP NOT NULL` on the vacated columns, including the two edge tables where the dropped primary key leaves an implicit one behind.
7. Drop `saved_lists`.

Steps 2 and 3 must not be reordered: a `NOT NULL` set before its backfill fails on the first existing row. Any assertion that spans statements (for example, "no row was missed by the backfill" before a `SET NOT NULL`) lives inside a single `DO $$` block, because there is no transaction to hold it.

*Alternative rejected:* splitting into an additive PR and a tightening PR, as the [#184](https://github.com/JoshEddie/CTRLplusList/issues/184) scout proposed. Phase 1 landed no profile-valued columns on these tables, so the additive half does not already exist; splitting would ship a release in which the columns are present, unbackfilled, and unread — pure carrying cost with no reduction in risk.

### D2 — `getUserIdentity(userId) → { userId, profile }` in a new `lib/data/profile.ts`

Request-cached with React `cache()`, alongside the existing `getUserIdByEmail` pattern in `lib/data/user.ts`. Both callers reach it through the existing `authedIdentity()` seam in `user.session.ts` — actions already did, and pages call it rather than re-deriving the account id and passing it in, so the resolution has one entry point instead of one per surface.

The resolution returns the whole `profiles` row, not the id alone: the lookup already reads the row, and surfaces that render the acting profile's name (the items library's claim byline) would otherwise re-fetch it or fall back to the account's name — the account name is not what a profile-owned surface displays. `profile` deliberately means *the profile this request acts as*. Today that is always the caller's self-profile, and there is nothing to choose between — but the name stays true when [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) makes it switchable and adds the available set beside it, so no call site is renamed then.

React `cache()` rather than `'use cache'` + `cacheTag`: the value is request-scoped identity resolution, not a table read. It therefore introduces no cache tag and no `updateTag` obligation, and cannot go stale within the request that resolved it.

New module rather than an addition to `user.ts`: profiles are their own table with their own lifecycle, and identity resolution is profile-keyed. D13 generalizes this into the rule governing the whole `user` / `profile` split, and gives `profile` an actions module alongside this read module.

*Alternatives rejected:* `profile.session.ts` (a profile is not a session); `Actor` / `ActorContext` (the spec's term, but vague to the owner); `UserScope` (reads as OAuth); `UserContext` (reads as React); folding the profile id into `getUserIdByEmail` (the name would then lie about what it returns).

### D3 — No structural refactor: every check stays where it is

Authorization is **not** hoisted to page boundaries with booleans threaded down. Next.js wants the call at the point of use, and D2's request-scoped cache makes a repeat call free. This change is a pointer switch, not a refactor — which is also what keeps the e2e suites usable as the acceptance oracle.

*Alternative rejected:* resolve once per page, pass `isOwner` down. It would have made this change a refactor of ~19 components on top of a schema migration, with the two failure modes indistinguishable when a test went red.

### D4 — Ownership is strict equality; `profile_members` gains no reader

Containment over a one-element set is equality. Collapsing to strict comparison removes, in one step, a containment helper, a `profile_members` cache tag, and the `updateTag` obligation that would have come with it. `getLists`-style reads compare ids directly.

This is the decision that keeps the change small. Reintroducing membership is the switcher's job, not this one's.

### D5 — `Item.tsx` receives a profile id under a renamed prop

`Item.tsx` is a client component and cannot resolve a profile itself, so the server passes one down: its `user_id` prop carries the profile id and is renamed `profile_id` through every component that threads it.

Its two uses want *different* profiles once a switcher exists — the `isOwner` check wants the profile being viewed, the self-marking of an attributed claim wants the actor's self-profile. Those are the same value here. Renaming the prop now means [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) inherits the split named rather than hidden inside a prop still called `user_id`.

### D6 — The purchases partial unique is created, never swapped

A drop-then-create leaves a window with no partial unique over the concurrent-claim path, and under D1's no-transaction constraint that window is real wall-clock time. A claim landing in it double-records a purchaser permanently. Both indexes coexist for one release; [#191](https://github.com/JoshEddie/CTRLplusList/issues/191) drops the old one with its column. Two indexes for one release is the entire cost of removing the window.

### D7 — The two composite primary keys are dropped and recreated

`user_follows` and `user_blocks` keep their old columns inside composite primary keys, and a primary key implies `NOT NULL`, so the constraint cannot be relaxed while the key stands. Both are recreated over the profile columns, then the vacated columns get an explicit `DROP NOT NULL` — Postgres does not remove the implicit one when the key goes, and forgetting this leaves a column that still rejects the NULLs [#191](https://github.com/JoshEddie/CTRLplusList/issues/191) will need.

Unlike D6, this one cannot be done by addition: a table has one primary key. The window it opens is covered in Risks.

### D8 — The claim asserter is always the actor's self-profile

A claim is a human act, so the asserter does not follow whatever profile a switcher later lets an account act as; a self-claim's purchaser is the actor's self-profile for the same reason. This keeps profile → human injective, since the database enforces one self-profile per account.

Three consequences, all of which shrink the change: no companion actor column is owed on `purchases` (the human resolves through `profiles.user_id`, and a null there means a deleted account, which [#229](https://github.com/JoshEddie/CTRLplusList/issues/229) already accepts); a moderation target is recoverable; and the attributed-claim test stays the plain inequality it is today, both sides having become profiles, rather than becoming a per-purchaser lookup.

### D9 — Blocks ship plain: one row, no cascade

[#202](https://github.com/JoshEddie/CTRLplusList/issues/202) specified an owners-only cascade materializing a block row per profile the blocker owns. That branch needs an account owning a second profile, which cannot exist until [#192](https://github.com/JoshEddie/CTRLplusList/issues/192) — it would be a branch with no reachable caller. Inheritance at profile birth is [#192](https://github.com/JoshEddie/CTRLplusList/issues/192)'s.

A profile-scoped block is evadable by creating a fresh profile. Unreachable here for the same reason; the redesign it calls for is [#303](https://github.com/JoshEddie/CTRLplusList/issues/303), which now gates [#192](https://github.com/JoshEddie/CTRLplusList/issues/192) and [#193](https://github.com/JoshEddie/CTRLplusList/issues/193).

### D10 — Follow-graph write ordering is preserved verbatim

`blockUser` keeps its insert-block-row-first ordering, so a partial failure leaves the pair effectively-blocked rather than effectively-followed. The columns change; the ordering rationale does not. D13 moves the action to `profile.actions.ts`; the statement order travels with it verbatim, including the account resolution that precedes the block insert. `hasBlocked` already keys on both ids, so feeding it profile ids needs no cache change.

### D11 — Dead code is deleted, not migrated

`saved_lists` is dropped rather than given a profile column: dead since `list_visits` replaced it, with no read or write anywhere in application code. `getLists()` is deleted rather than rewritten: exported, no callers. The `email` selection in the remaining list reads is dropped: the only email the application renders is the session user's own, read from the session.

Migrating dead code costs the same review attention as live code and produces a column nothing will ever read.

One deliberate exception: `getUserById` keeps its export after `ListHeroSection` stops calling it, against a future caller needing to resolve who owns a profile once that relationship stops being 1:1. Recorded here rather than deleted so the next reader does not re-decide it, and so the keep is visibly a choice rather than an oversight.

### D13 — The data layer splits on id kind, not on module size

Reads and actions divide between `user` and `profile` by the id kind of their leading identity parameter, not by which file was getting long. Every export whose leading identity parameter flipped from an account id to a profile id in this change moves to `profile.ts` / `profile.actions.ts`; every export still leading with an account id stays in `user.ts` / `user.actions.ts`. `isFollowing` leads with the follower's account and stays, though its followee became a profile.

A rule rather than a one-time placement: the two ids are both strings, so nothing in the type system distinguishes them and a cross-kind mistake is silently always-false (see Context). The module boundary is the one place the kind becomes visible without a type — at the import line.

Sizes fall out rather than drive: `user.ts` 354 → 127 code lines, `user.actions.ts` 221 → 77, `profile.ts` ~255, `profile.actions.ts` ~159, all four in the green band.

*Alternative rejected:* extracting helpers out of `user.ts` until the lint warning clears. It answers the size band without answering where a profile-keyed function belongs, so the next profile-keyed read re-opens the question.

### D12 — Seed fixtures repoint; the managed profile stays contentless

Fixtures move onto profile ids. The seeded managed profile gains **no** content: with no switcher, nothing can render as it, so seeded content there would be fixture no test can exercise. [#192](https://github.com/JoshEddie/CTRLplusList/issues/192) and [#193](https://github.com/JoshEddie/CTRLplusList/issues/193) own that.

## Risks / Trade-offs

**A cross-kind comparison is silent, not loud.** A profile column compared against an account id is always-false and throws nothing; the surface simply behaves as though nobody owns anything. → The eight known sites are enumerated in the proposal and specified in the deltas. The `server-endpoint-authorization` delta adds a standing rule so a ninth is a review violation rather than a judgment call. The unchanged e2e suites are the detector: an always-false ownership check fails them loudly.

**D7's primary-key recreate has a real window.** Between `DROP CONSTRAINT` and `ADD CONSTRAINT`, nothing rejects a duplicate follow or block row, and under the no-transaction driver that window is wall-clock time. → The owner applies production as a single hand-assembled transactional script, which closes the window there. The generated forward migration keeps the two statements adjacent so the window is as short as the transport allows.

**Backfilling seven columns locks the tables it touches.** → The backfills are plain `UPDATE`s over tables at current production scale, run inside the owner's maintenance script rather than at request time. If a table has grown beyond what a single statement should carry, the backfill for that column is the one to batch; nothing else in the sequence depends on it completing in one statement.

**`saved_lists` is dropped irreversibly in a forward-only migration.** → It has zero application readers and zero writers; its rows were copied into `list_visits` at the migration that superseded it, and that data is still there. The drop loses no information the application can reach.

**Renaming `Item.tsx`'s prop touches components a schema change would not otherwise touch.** → Bounded to the thread from the item surfaces down, mechanical, and covered by the existing component tests. The alternative — leaving a prop named `user_id` that carries a profile id — is exactly the silent-mismatch hazard this change exists to remove.

**`lib/data/user.ts` and `purchase.ts` are near the size bands.** → The profile-id rewrite grew `user.ts` past the yellow threshold on its own, so D2's new module was not sufficient mitigation; D13's id-kind split is what returns `user.ts` and `user.actions.ts` to the green band. If `purchase.ts` crosses 400 lines under the rewrite, `data-layer-organization`'s decomposition rule already names the seam to split on; splitting to chase the goal band is not required.

## Migration Plan

1. Generate one Drizzle migration and hand-complete it with the backfills and `DO $$` gating, in D1's order.
2. Land schema, data layer, and comparison rewrites together — a release carrying the columns but not the rewrites, or the reverse, is broken in the silent way.
3. Verify against the five gates, with `test:e2e` as the acceptance evidence.
4. Production application is the owner's single transactional script and is outside this change.

**Rollback.** Forward-only. Steps 1–4 of D1 are additive and inert if unread — a code revert alone restores behavior, because the account columns still carry their data through this phase. Steps 5–7 are not reversible by revert: the recreated primary keys and the `saved_lists` drop would need their own forward migration. That asymmetry is the argument for keeping the account columns until [#191](https://github.com/JoshEddie/CTRLplusList/issues/191): for the duration of this phase, the data needed to reconstruct the old state is still on the row.
