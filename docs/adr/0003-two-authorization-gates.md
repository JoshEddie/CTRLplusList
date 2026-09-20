# Two authorization gates, and administration bypasses the acting-profile one

`authedWriter` (`lib/data/profile.gate.ts`) requires a live membership on the
profile the request *acts as*, and stamps `last_active_at` inside the gate so a
write added later cannot forget it. Membership administration uses
`administeringOwner` instead, which addresses the profile the request *names* —
otherwise the acting-profile comparison would refuse every control the
management page renders as operable. Enforcement is per-action rather than
middleware, so each `'use server'` export carries its own gate.

**Two deliberate holes:** `redeemInvite`, where the token is the authorization
and the actor holds no membership yet, and the guest-callable
`mintItemPlaceholder`, whose payload is an item id and whose stored row is fully
server-derived.
