## Context

See proposal.md — Why. The constraints that shape the approach, all verified against the tree:

- `authedWriter` (`lib/data/profile.gate.ts`) is reached by **13** call sites: `list.actions.ts` ×4, `item.actions.ts` ×4, `listItems.actions.ts` ×3, `item.associations.ts` ×2. `removePurchase` is not among them, and neither is the profile-update action.
- The profile-update action authorizes against the acting account's membership on the **target** profile, not the acting profile — `profiles-surface` fixes that, and `/profiles/[id]` renders for any member without a switch.
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

### The floor is read where the gate already reads, not carried on the identity

`writableMembership` gains `role` in its projection and `authedWriter(floor)` compares against it. **Zero extra round trips**: the row is already being fetched, and the column is on it.

The tempting alternative — widening `UserIdentity.activeProfile` to carry the role, since `getMembershipsForUser` already has it — is **rejected**. That read is `'use cache'`, and the gate's existing comment states why its own read is not: a cached membership can still show a role revoked since the form rendered, which is precisely the case the gate exists to refuse. Authorization must not be decided on a cached membership. Keeping the role off `UserIdentity` also keeps it un-reachable by accident from the ~38 call sites that resolve an identity for non-authorization reasons.

### Membership administration authorizes on the named profile, not the acting one

The Permissions section lives at `/profiles/[id]`, which renders for any member of that profile whatever they are currently acting as. Its four actions therefore take the target profile id from the request and check the `owner` floor against the actor's membership on **that** profile — the same shape the profile-update action already uses, and one uncached read of the same row.

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

### `setListItems` keeps its own rejection shape

`setListItems` (`lib/data/listItems.actions.ts:18`) calls `auth()` first and then folds the gate's rejection into its own ownership comparison, under `server-endpoint-authorization`'s stated exemption for endpoints keeping a local error code. Adding the floor must preserve that collapse rather than introduce a second, differently-worded refusal on the same endpoint.

## Risks / Trade-offs

- **A call site left on the wrong floor silently widens a role** → the floor argument is required with no default, so every one of the 13 sites is a compile error until it names one. A wrong choice is still possible; a forgotten one is not.
- **Concurrent last-owner removals leave an ownerless profile** → accepted, not mitigated. The state is already reachable when a sole owner deletes their account (#187), so the race lands somewhere the application tolerates. Named in `profile-permissions` as an explicit non-violation, in the shape `list-item-management` already uses for its concurrent-claim residual.
- **`list-item-management`'s reproduced block carries scenarios that are already false** — its guest `guest_name` payload legs describe behaviour `guest-claim-identity` retired, and the code accepts only `{ purchase_id }`. This change does not make them false and does not repair them; the MODIFIED block edits only the authorization prose it owns. Flagged for spec hygiene rather than swept here.
- **A leaked link is a working grant** → bounded rather than closed. The token names no recipient, so whoever holds it is who joins; one redemption, seven days, a role the owner may narrow while it is outstanding, and a revoke are the mitigation. Binding the link to an identity would mean knowing the recipient's account before sending it, which is the constraint the link exists to escape.
- **The roster row carries the token in the page** → so it renders for an owner only. A manager sees the memberships and not the outstanding invites: every other forbidden control renders disabled beside them, but a bearer token is not a control, and a disabled one would still be readable.
- **The two-floor vocabulary cannot express a third tier** → if #335's publication axis lands and splits reach from publish, a third value is needed. Named in the ADR's consequences so the cost is argued with rather than worked around.

## Migration Plan

One migration, adding `profile_invites`: `token` as the primary key (a `nanoid(32)`, so the id idiom already in the schema rather than a second one), `profile_id` and `created_by_user_id` both FK with `ON DELETE CASCADE`, `role` NOT NULL under a check constraint admitting `owner | manager` only — `self` is never grantable — `created_at` and `expires_at` NOT NULL, and a nullable `redeemed_at` that is the single-use marker. No index beyond the primary key: every read of the table is by token.

`profile_members` is unchanged — `role` and `last_active_at` exist and are already backfilled or correctly NULL, and `ride_along` stays unread exactly as it shipped.

Rollback is no longer a bare revert. Reverting the code leaves the table in place holding rows that grant nothing, which is inert; dropping the table discards any unredeemed invite, and redeemed ones have already become membership rows that survive independently. Neither direction can strand a membership.
