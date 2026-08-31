## Context

See proposal.md — Why. The constraints that shape the approach, all verified against the tree:

- `authedWriter` (`lib/data/profile.gate.ts`) is reached by **13** call sites: `list.actions.ts` ×4, `item.actions.ts` ×4, `listItems.actions.ts` ×3, `item.associations.ts` ×2. `removePurchase` is not among them, and neither is the profile-update action.
- The profile-update action authorizes against the acting account's membership on the **target** profile, not the acting profile — `profiles-surface` fixes that, and `/altvatar/[id]` renders for any member without a switch.
- `writableMembership`, the gate's uncached read, already selects from `profile_members` but projects only `name` and `last_active_at`.
- `getMembershipsForUser` (`lib/data/profile.active.ts:24`) already reads `role` and returns it on `ProfileMembershipView`, but `resolveIdentity` narrows the active profile to `ActorProfile`, which drops it. That read is `'use cache'`.
- `profile.actions.ts` is 447 lines.
- `MenuItem` extends `ButtonHTMLAttributes` and spreads onto a `<button>`; `menu-system` already treats `aria-disabled="true"` as the disabled convention, including in its own scenarios.
- `signInUser` (`lib/data/user.actions.ts:57`) calls `signIn('google')` with no destination, so nothing currently survives a sign-in round trip.
- `nanoid` is already a dependency and is the repo's id idiom — `users.id` and `lists.id` both use it.
- The `(main)` layout short-circuits an un-onboarded account to the gate **instead of** `children`, leaving the requested URL untouched (`2026-08-26-onboarding-is-a-layout-short-circuit-not-a-guard`).

## Goals / Non-Goals

**Goals:**

- Make the floor impossible to omit at a call site added later, without adding a second gate.
- Keep every authorization read uncached, matching the gate's existing doctrine.
- Make admission an act the admitted person performs, without building a notification or acceptance system to do it.
- Leave the follow graph out of administration entirely, so #298 remaps association with nothing of ours to unpick.

**Non-Goals:**

- Narrowing cache tags. #309 owns that; every tag fired here is an existing coarse or per-account tag.
- Repairing `list-item-management`'s pre-existing guest-payload staleness (see Risks).
- Delivering the invite. No email and no notification; the owner copies a link from the roster and sends it.
- Any `menu-system` or `button-system` extension — neither is needed.

## Decisions

### The gate reads the floor uncached

`writableMembership` gains `role` in its projection and `authedWriter(floor)` compares against it. **Zero extra round trips**: the row is already being fetched, and the column is on it.

`UserIdentity.activeProfile` carries the acting role too, but only for rendering. `getMembershipsForUser` is `'use cache'`, and a cached membership can still show a role revoked since the form rendered — precisely the case the gate exists to refuse. `authedWriter` and `writableMembership` stay the only write path, and read uncached.

### Membership administration authorizes on the named profile, not the acting one

The Permissions section lives at `/altvatar/[id]`, which renders for any member of that profile whatever they are currently acting as. Its four actions therefore take the target profile id from the request and check the `owner` floor against the actor's membership on **that** profile — the same shape the profile-update action already uses, and one uncached read of the same row.

Routing them through `authedWriter` was **rejected**: the gate's whole contract is the acting-profile equality check, so an owner viewing their profile's space while acting as their self-profile would be refused every control the page renders as operable. Forcing a switch before administering a profile is a worse surface and would make the Profiles page's `Edit <name>` row a lie.

### `removePurchase` re-reads the role rather than reusing the gate

`removePurchase` cannot pass `authedWriter` — unauthenticated guests reach it, and the gate has no answer for a caller with no membership. It therefore calls `writableMembership` directly on the authenticated path and passes the role into `canRemovePurchase`, which stays a pure function and gains a nullable role parameter. One shared uncached read serves both paths, so the rule has one home.

Reading the role **unconditionally** on the authenticated path, rather than only after the two self-profile legs fail, is deliberate: the conditional saves one round trip on an action that already issues three, and costs a branch whose condition duplicates the authorization logic it is trying to skip.

### Membership administration gets its own module pair

New `lib/data/profile.members.ts` (reads) and `lib/data/profile.members.actions.ts` (actions), following `data-layer-organization`'s per-domain pair convention. `profile.actions.ts` is 447 lines and already carries the follow-graph, block, creation, settings and switch actions; four actions — mint, redeem, re-role, remove — plus the roster read would put it deep into the red band, and membership is a nameable domain rather than an overflow bucket. Watch the band on the new pair too: the CTE and the invite reads are not small.

### `getEligiblePurchasers` is not touched, and no mutual-follow helper is extracted

An earlier cut of this change drew the add pool from the acting owner's mutual follows and extracted the pair computation out of `getEligiblePurchasers` (`lib/data/profile.ts:156`) to share it. With admission moved to the invite link there is no second caller, so the extraction has nothing to serve: `getEligiblePurchasers` keeps its computation inline and this change does not read the follow graph at all.

### An outstanding invite is a row, not a one-shot dialog

A minted link shown once in the overlay that minted it is lost the moment that overlay closes, and the owner has no way to ask what they have outstanding. It therefore takes a row in the Permissions section, beside the memberships it is going to become: copy, re-role and revoke all hang off that row, and a redemption replaces it with the member's own. The minting overlay accordingly stops presenting the link at all and only chooses the role.

Re-roling an outstanding invite edits the stored row and leaves the token alone, so a link already sent grants whatever it says at the moment it is redeemed rather than what it said when it was sent. Revoking deletes the row. Both are guarded on `redeemed_at IS NULL`, so neither can reach back through a redemption that has already happened — a membership, once granted, is the removal action's to take away and not an invite's.

### Redemption is an explicit submission, never the GET

The invite route renders what the link grants — the profile, its art, and the role — and redeems only on a submitted action. It renders as a `form-shell-system` overlay rather than a bare page: an invite is a decision to take or leave, and a shell states that where a full page of two sentences does not. An account that already holds a membership is redirected to the profile instead of being offered anything, since it has nothing to accept. Redeeming on load would spend the link before the recipient saw it: chat clients, mail scanners and the browser's own prefetch all issue that GET, and a single-use token has no second chance. This is the same reasoning that keeps every other destructive or one-shot act behind a control, and it costs one extra click on a page the recipient has to read anyway.

### Consuming the token and writing the membership are one CTE

Per `2026-08-18-atomic-writes-in-one-cte`, applied through its own fixability test rather than by reflex. The UPDATE that marks the token spent and the INSERT of the membership row must not half-apply: a spent token with no membership is repairable by nobody — the recipient cannot redeem again, and the owner is never told. In Drizzle, `db.$with()` over the guarded UPDATE (`WHERE token = … AND redeemed_at IS NULL AND expires_at > now()`), feeding an insert-select into `profile_members` with `ON CONFLICT DO NOTHING`. Zero rows out of the UPDATE is the refusal, and it is the same refusal for an unknown, expired or already-spent token, so no branch distinguishes them and no message can leak which one it was.

The block check is **not** folded into that statement. A block edge landing between the read and the write is benign — nobody is harmed by a redemption that beat a block by a millisecond — so it stays a plain read before the CTE rather than a fourth clause inside it.

### The redemption route lives under `(main)`

So the onboarding short-circuit does the work: an account that signs up to accept an invite hits the gate instead of the page, completes it, and the untouched URL reveals the invite it came for. Nothing invite-specific is added to the gate. For a signed-out visitor, `signInUser` gains a destination argument threaded to `signIn`'s `redirectTo`, which is the whole of the sign-in round trip — no cookie, no stashed token.

### The owner floor is one guarded DELETE

Per the ADR. In Drizzle: `db.delete(profile_members).where(and(eq(user_id), eq(profile_id), exists(<aliased self-join over the same table for a surviving owner>)))`, with zero returned rows as the refusal. The same-table subquery needs an alias. No raw SQL.

Demotion carries no such guard, for the reason the spec records — the actor is necessarily a surviving owner. The reasoning is in the spec rather than a code comment because its audience is the next person to read the requirement and wonder why one path is guarded and the other is not.

### Disabled controls need no primitive work

`Button` already accepts `disabled`. Menu rows take `aria-disabled="true"` — `menu-system` fixes that as the convention, its arrow-key navigation and open-focus selector both already skip it, and `MenuItem` spreads the attribute through. Consumers guard their own `onClick`, since `aria-disabled` is advisory. So the disabled-not-hidden ruling is a consumer change only.

### `--meta-text-color` is retuned corpus-wide rather than scoped to the new surfaces

The invite page and the profile space both lean on `--meta-text-color`, and at its stored `#bbbbbb` it rendered at roughly 1.9:1 against white — a WCAG failure, not a taste call. It is retuned to `#5f6470` (≈5.5:1, passing AA) in `app/ui/styles/global.css` rather than shadowed by a new token scoped to the two new stylesheets.

The retune ripples to seven call sites this change does not otherwise touch, across `following-and-history.css`, `button.css` and `onboarding.css`. That ripple is the point: those call sites were failing the same ratio for the same reason, and a parallel token would have left them failing while declaring the problem solved on the new surfaces alone — which is exactly the parallel-shorthand system CLAUDE.md's "Reuse existing CSS variables" rules out. The token's role is unchanged; only its value moves.

### A role is a record, not a string

`lib/data/profile.roles.ts` holds one record per role, carrying its stored value, its label, and the two rights that distinguish it:

```ts
type RoleShape = { value: string; label: string; isSelf: boolean; admin: boolean };

const SELF: RoleShape    = { value: 'self',    label: 'You',     isSelf: true,  admin: true  };
const OWNER: RoleShape   = { value: 'owner',   label: 'Owner',   isSelf: false, admin: true  };
const MANAGER: RoleShape = { value: 'manager', label: 'Manager', isSelf: false, admin: false };

export const ROLES = [SELF, OWNER, MANAGER] as const;
```

`admin` is the owner floor and `!isSelf` is grantability, so `WRITE_ROLES`, `FLOOR_ROLES`, `meetsFloor`, `belowOwnerFloor`, `GRANTABLE_ROLES`, `MemberRole`, `isGrantableRole` and `ROLE_LABELS` all collapse into the record. Both hand-written unions in `lib/types.ts` go with them — `ProfileMembershipView.role` and `ProfileCardView.role` carry the record.

Grantability is not its own field. `self` is ungrantable *because* it is the identity relation rather than a membership anyone can hand out, so it is one fact and one field.

Two seams remain and only two: the column is `text`, so a read maps it back (`ROLES.find((r) => r.value === row.role)`) and a SQL predicate sends `SELF.value`; the invite and role-change dropdowns iterate `ROLES.filter((r) => !r.isSelf)`.

`authedWriter` keeps its required floor argument — the forcing function 1.3 exists for — but implements it as `!membership.role.admin`. `member` consults nothing, because `writableMembership` returning a row *is* the member floor: its SQL already filtered to the roles that floor admits, so testing them again was a guard re-deciding what the read decided.

**A role is never compared by reference.** RSC serialization rebuilds the object crossing into a client component, so `role === OWNER` holds on the server and fails on the client. The flags are what keep this out of reach: every comparison reads `admin` or `isSelf`, and none needs identity.

### The acting role rides on the identity

`resolveIdentity` already selects the acting membership — role included — then discards the role by returning it as `ActorProfile`. So `activeProfile` narrows less instead: `ActorProfile & { role: Role }`. `selfProfile` and the switcher rows keep `ActorProfile`; neither is being acted as. `getUserIdentity` is request-scoped `cache()`, so the role costs no round trip, needs no helper, and has no nullable case — an identity that resolved has a membership by construction.

Each affordance takes its `disabled` state from the server component that renders it. Where the leaf sits under a client parent — the claim modal, below `Item.tsx`'s `'use client'` — that tree already threads the acting profile for ownership comparisons, so the existing prop widens to carry the profile whole rather than a second prop appearing beside it.

Two shapes are rejected and stay rejected. A `viewerIsManager` prop threaded through the list and item trees is the shape that produced the round-1 defect: it reached `ListDetails`, stopped at the expanded hero, and nothing about a missing prop is loud. A provider resolved in `(main)/layout.tsx` publishes from the segment Next re-renders least, and defaults an affordance rendered outside it to operable.

Freshness follows from the identity read: page segments re-render on navigation and it carries the tags every membership write fires, so the answer is as current as the page.

### The pending-invite roster is uncached

`getPendingInvites` filters `expires_at > now`, which makes its result a statement about a clock rather than about rows. Cached, that clock freezes into the entry, and no tag thaws it: expiry is elapsed time, not a write. An expired link would sit in the roster reading "expires in 1 day" until some unrelated write on the profile happened to evict it, refusing on every press.

So the read is uncached, for the reason `getLiveInvite` already was. The consequence is that `profile_invites` needs no cache tags at all — nothing cached reads the table — and the mint, revoke, re-role and redeem paths fire none. The tags added earlier in this change are removed rather than left firing into nothing.

### e2e gets its own manager seat

The manager e2e flow writes lists and items it cannot clean up: deleting either is the owner-floor act the flow exists to prove a manager is refused. It had been pinned to `dev-profile-managed`, which simultaneously serves as the never-acted-as ordering fixture and the empty-lists fixture two other specs read — so the suite passed only because single-worker filename order happened to run the readers first.

A third seeded profile, `dev-profile-workshop`, carries the residue instead. It is one profile row and two membership rows, against a whole class of order-dependence: with it, no assertion anywhere depends on which file ran first, and `dev-profile-managed` keeps both fixtures intact. Its membership is stamped with a `last_active_at`, so the NULL ordering branch stays a fixture of exactly one row.

### Sharing is not an owner-floor act

Round 1 read the promote-then-share flow as a floor-gated write and disabled both share affordances below the floor; round 2 found the two shapes disagreeing about which condition disables them, and the collapsed shape refusing lists no floor governs. Neither reconcile direction was taken.

Sharing hands out a URL. What the recipient can then see is the list's own visibility, not the sharer's role, so no share shape is an owner-floor affordance and the floor gates none of them. The promote-then-share flow the two shapes wrap predates this change and is left as it was; the floor read and the disabled state this change added are removed, and `profile-permissions` states the exclusion so a later sweep does not re-add them.

### One home for the same-origin rule

This change hardened `signInUser`'s destination guard against the characters URL parsing removes, and left the repo's other guard on the same class of input — `sanitizeReturnTo`, reached by a plain query string — on the old string-shape checks. Two copies of one rule, and the drift was the defect.

`lib/sameOriginPath.ts` is now the single guard both boundaries call, carrying the union: the control characters stripped as a parser strips them, then the leading-slash test, then `list-item-management`'s standing refusal of `://` and backslashes. The union rather than either alone, because that spec is canonical and its rule is a superset that costs nothing to keep. `sanitizeReturnTo` and its test file are deleted.

### `setListItems` keeps its own rejection shape

`setListItems` (`lib/data/listItems.actions.ts:18`) calls `auth()` first and then folds the gate's rejection into its own ownership comparison, under `server-endpoint-authorization`'s stated exemption for endpoints keeping a local error code. Adding the floor must preserve that collapse rather than introduce a second, differently-worded refusal on the same endpoint.

## Risks / Trade-offs

- **A call site left on the wrong floor silently widens a role** → the floor argument is required with no default, so every one of the 13 sites is a compile error until it names one. A wrong choice is still possible; a forgotten one is not.
- **Concurrent last-owner removals leave an ownerless profile** → accepted, not mitigated. The state is already reachable when a sole owner deletes their account (#187), so the race lands somewhere the application tolerates. Named in `profile-permissions` as an explicit non-violation, in the shape `list-item-management` already uses for its concurrent-claim residual.
- **`list-item-management`'s reproduced block carries scenarios that are already false** — its guest `guest_name` payload legs describe behaviour `guest-claim-identity` retired, and the code accepts only `{ purchase_id }`. This change does not make them false and does not repair them; the MODIFIED block edits only the authorization prose it owns. Flagged for spec hygiene rather than swept here.
- **A leaked link is a working grant** → bounded rather than closed. The token names no recipient, so whoever holds it is who joins; one redemption, seven days, a role the owner may narrow while it is outstanding, and a revoke are the mitigation. Binding the link to an identity would mean knowing the recipient's account before sending it, which is the constraint the link exists to escape.
- **The roster row carries the token in the page** → so it renders for an owner only. A manager sees the memberships and not the outstanding invites: every other forbidden control renders disabled beside them, but a bearer token is not a control, and a disabled one would still be readable.
- **The two-floor vocabulary cannot express a third tier** → if #335's publication axis lands and splits reach from publish, a third value is needed. Named in the ADR's consequences so the cost is argued with rather than worked around.
- **Content already rendered outlives a revocation** → resolving the floor with the identity the request already read makes it as fresh as the page, but a browser sitting on a page it loaded before the revocation keeps showing it until it navigates. Writes are unaffected: `authedWriter` re-reads `writableMembership` uncached and refuses. Accepted; bounding it by time rather than by navigation needs an invalidation signal reaching the session, which this change does not build.

## Migration Plan

One migration, adding `profile_invites`: `token` as the primary key (a `nanoid(32)`, so the id idiom already in the schema rather than a second one), `profile_id` and `created_by_user_id` both FK with `ON DELETE CASCADE`, `role` NOT NULL under a check constraint admitting `owner | manager` only — `self` is never grantable — `created_at` and `expires_at` NOT NULL, and a nullable `redeemed_at` that is the single-use marker. No index beyond the primary key: every read of the table is by token.

`profile_members` is unchanged — `role` and `last_active_at` exist and are already backfilled or correctly NULL, and `ride_along` stays unread exactly as it shipped.

Rollback is no longer a bare revert. Reverting the code leaves the table in place holding rows that grant nothing, which is inert; dropping the table discards any unredeemed invite, and redeemed ones have already become membership rows that survive independently. Neither direction can strand a membership.
