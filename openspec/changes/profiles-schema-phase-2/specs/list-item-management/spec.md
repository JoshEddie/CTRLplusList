## MODIFIED Requirements

### Requirement: createPurchase SHALL authenticate the claimer and forbid client-supplied user_id

The `createPurchase` server action's input payload SHALL be `{ item_id: string; guest_name: string | null }` — it SHALL NOT accept an identity field for the actor. The action SHALL call `auth()` and:

- If a session exists AND no non-empty `guest_name` is provided, the action SHALL resolve the caller's identity from the session and use the caller's **self-profile** as the purchase's purchaser (a self-claim), with `guest_name = NULL`. A claim is a human act, so a self-claim's purchaser is always the caller's own self-profile.
- If a session exists AND a non-empty `guest_name` is provided, the action SHALL record a claim **on behalf of that named third party**: it SHALL leave the purchaser NULL and set `purchases.guest_name = <trimmed name>`, so the stored claim belongs to the named person, not to the caller. The authenticated caller's resolved identity SHALL still be used to authorize the request (the viewability / owner-block gate below), so a blocked caller cannot claim via this path. No purchaser identity is ever taken from the payload — the third party is a free-text name, never a profile.
- If no session exists, the action SHALL require a non-empty `guest_name` and SHALL leave the purchaser NULL. If `guest_name` is missing or empty, the action SHALL reject with `{ success: false, error: 'Missing identity' }`.

On every authenticated path the action SHALL record the caller's self-profile as the claim's asserter; the asserter and purchaser columns and their self-profile rule are owned by `claim-attribution` and `profiles-data-model`. The attributed-claim path, in which the payload names a distinct purchaser target that the action re-verifies against the eligible pool, is owned by `claim-attribution` and is not restated here.

This SHALL apply uniformly regardless of how the item was reached (direct id, list page, search). The action SHALL additionally verify that the item belongs to a list the caller can view (using the same access predicate that gates `/lists/[id]` render); items on lists the caller cannot view SHALL be unclaimable, returning `{ success: false, error: 'Item not found' }` (deliberately indistinguishable from a missing item id).

The access predicate SHALL treat both `'unlisted'` and `'public'` lists as viewable by **any** caller — guest (no session) or authenticated, follower or not — subject only to the owner-block check (a list whose owning profile has blocked the caller's profile is never viewable). A `'public'` list is therefore claimable by anyone who can reach its URL; the follow relationship governs feed discovery, not claim access. Only `'private'` lists (viewable solely by their owning profile) and blocked-owner lists are non-viewable. This is the `list-item-management` application of the access model owned by `list-visibility` ("a `public` list is visible to anyone with the URL").

This requirement is the list-item-management-specific application of the cross-cutting contract in `server-endpoint-authorization`. The cross-cutting capability owns the "no client actor identity" rule globally; this requirement enumerates `createPurchase` as a permitted guest write path — for an unauthenticated caller, AND for an authenticated caller recording a claim on behalf of a named third party — and binds its specific shape.

#### Scenario: Authenticated user self-claims using session identity

- **WHEN** an authenticated user invokes `createPurchase({ item_id, guest_name: null })`
- **THEN** the action resolves the caller from the session and inserts `purchases` with the caller's self-profile as purchaser and asserter, and `guest_name = NULL`

#### Scenario: Authenticated user claims on behalf of a named other person

- **WHEN** an authenticated user invokes `createPurchase({ item_id, guest_name: 'Aunt May' })`
- **THEN** the action inserts `purchases` with a NULL purchaser, the caller's self-profile as asserter, and `guest_name = 'Aunt May'` — the typed name is honored (not discarded), and the claim is attributed to the named third party rather than to the caller
- **AND** the request is still authorized using the caller's session identity, so a blocked caller is rejected with `{ success: false, error: 'Item not found' }`

#### Scenario: Unauthenticated guest claims an item

- **WHEN** an unauthenticated visitor invokes `createPurchase({ item_id, guest_name: 'Aunt May' })`
- **THEN** the action inserts `purchases` with a NULL purchaser, a NULL asserter, and `guest_name = 'Aunt May'`

#### Scenario: Forged user_id has no place to land

- **WHEN** a developer inspects the `createPurchase` Zod schema
- **THEN** no actor-identity field is declared; the payload type does not accept one

#### Scenario: Claim against a non-viewable item is rejected

- **WHEN** any caller (authenticated or not) invokes `createPurchase({ item_id })` where the item belongs to a list the caller cannot view (private list whose owning profile is not theirs, or a list whose owning profile has blocked their profile)
- **THEN** the action returns `{ success: false, error: 'Item not found' }` and no `purchases` row is inserted

#### Scenario: Guest claims an item on a public list

- **WHEN** an unauthenticated guest invokes `createPurchase({ item_id, guest_name: 'Aunt May' })` for an item that belongs only to a `'public'` list whose owning profile has not blocked anyone
- **THEN** the access predicate resolves the item as viewable and the action inserts `purchases` with a NULL purchaser and `guest_name = 'Aunt May'` — it does NOT return `'Item not found'`

#### Scenario: Authenticated non-follower claims an item on a public list

- **WHEN** an authenticated user who does NOT follow the list's owning profile invokes `createPurchase({ item_id })` for an item that belongs only to that profile's `'public'` list, and the owning profile has not blocked the caller's profile
- **THEN** the access predicate resolves the item as viewable and the claim is inserted — viewability does NOT depend on a follow relationship

#### Scenario: Blocked caller cannot claim on a public list

- **WHEN** a caller invokes `createPurchase({ item_id })` for an item on a `'public'` list whose owning profile has blocked the caller's profile
- **THEN** the access predicate resolves the item as non-viewable and the action returns `{ success: false, error: 'Item not found' }` with no `purchases` row inserted

### Requirement: removeListItem SHALL authorize list ownership server-side

A focused server action in `lib/data/listItems.actions.ts` (alongside `setListItems`) SHALL accept `(list_id, item_id)`, verify that the target list's **owning profile** equals the profile the authenticated caller's request acts as before any write (same authorization shape as `setListItems`), and delete at most the single matching `list_items` row. The comparison is between profile ids; comparing the list's owning profile against an account id would be silently always false. Unauthorized or unauthenticated calls SHALL return a failure `ActionResponse` and perform no write. The operation is a single DELETE statement — no transaction is required under the neon-http driver constraint. A successful removal SHALL advance the list's `updated_at` (per `list-update-recency`).

#### Scenario: Non-owner cannot remove an item from someone else's list

- **WHEN** an authenticated user whose profile is not the list's owning profile invokes the action directly with a valid (list_id, item_id) pair
- **THEN** the action returns a failure response and the `list_items` row is not deleted

#### Scenario: Successful removal revalidates cache tags

- **WHEN** the account whose profile owns the list invokes the action with an item currently on the list
- **THEN** the row is deleted, the action returns success, and `updateTag('items')` and `updateTag('lists')` are called
- **AND** the list's `updated_at` is set to the time of the removal

### Requirement: DAL item reads SHALL sanitize purchase attribution by viewer role

The item reads (`getItemsByListId` and `getItemsByProfile` in `lib/data/item.ts`; `getItemsByPurchased` in `lib/data/purchase.ts`) SHALL project each item's `purchases` through a role-aware sanitizer (`sanitizePurchases`, exported from `lib/data/purchase.ts`) before any row escapes the data-layer boundary, so that claim attribution never leaks beyond what the viewer is entitled to see. The sanitized projection SHALL expose, per purchase, only a stable `id`, a `by` tag (`'self'` or `'other'`), and a `firstName` — never a full name, email address, account or profile id, or raw guest identity.

The projection SHALL obey these rules, keyed on whether the viewer owns the items and whether spoilers are explicitly enabled:

- **Owner without spoilers** — when the viewer's profile owns the items and spoilers are NOT enabled, the read SHALL return an **empty** purchases array for every item, regardless of how many claims exist. An owner SHALL NOT be able to infer that, or by whom, their own items were claimed. (Owners cannot claim their own items, so every claim is gift-surprise information.)
- **Owner with spoilers** — when the viewer's profile owns the items and spoilers ARE explicitly enabled, each claim SHALL be exposed as `{ by: 'other', firstName }` (the owner is never the claimer of their own items).
- **Non-owner viewer** — each claim SHALL be exposed as `{ by, firstName }` where `by` is `'self'` only when the viewer's profile matches the claim's **purchaser** profile, and `'other'` otherwise. The match is a profile-id comparison; matching a purchaser profile against an account id would be silently always false, marking every viewer's own claim as someone else's. The purchaser-keyed choice of column (rather than the asserter) is owned by `claim-attribution`.

`firstName` SHALL be derived as the first whitespace-delimited token of the purchaser profile's stored name (falling back to the guest name), and SHALL be the literal `'Someone'` when that name is null, empty, or whitespace-only. The per-item `hasPurchases` flag (where exposed) SHALL reflect whether any claim exists **before** sanitization, so an owner-without-spoilers view can still indicate "claimed" without revealing the claimer.

#### Scenario: Owner without spoilers sees no claim attribution

- **WHEN** the account whose profile owns the items reads them (`getItemsByProfile` / `getItemsByListId` with `isOwner` true) and spoilers are not enabled
- **THEN** every item's sanitized `purchases` array is empty
- **AND** no claimer first name, full name, email, account id, or profile id is present in the result
- **AND** `hasPurchases` (where exposed) still reflects that a claim exists

#### Scenario: Owner with spoilers sees first names tagged other

- **WHEN** the owning account reads their own items with spoilers explicitly enabled
- **THEN** each claim is exposed as `{ by: 'other', firstName }`
- **AND** `firstName` is the first token of the purchaser profile's stored name, or `'Someone'` when that name is null/empty/whitespace-only

#### Scenario: Non-owner viewer sees self versus other first names only

- **WHEN** an authenticated non-owner reads items (`getItemsByListId` with a viewer, or `getItemsByPurchased`)
- **THEN** a claim whose purchaser equals the viewer's profile is tagged `{ by: 'self' }` and every other claim `{ by: 'other' }`
- **AND** only `firstName` is exposed for each claim — never a full name, email, account id, profile id, or raw guest identity

### Requirement: Filter and sort SHALL be derived from URL params client-side and SHALL NOT affect server-side data loading

The choose-items page SHALL continue to load the owner's full library on the server (active items plus archived items currently on the list). The toolbar's filter and sort SHALL be applied client-side over that already-loaded array. Server actions and the underlying DAL functions SHALL NOT be modified by this change.

#### Scenario: Server load is unchanged by toolbar URL params

- **WHEN** the page is requested with any combination of `q`, `sort`, `show`, `store`, `price_min`, or `price_max` URL params
- **THEN** the server-side `getItemsByProfile` call uses the same arguments it does today and returns the same set of items; only the client-side rendered subset and order change

#### Scenario: Selection state is preserved across filter changes

- **WHEN** the owner checks items under one filter setting and then changes the `show`, `store`, `price`, sort, or search controls
- **THEN** the in-progress selection (the set of checkboxes that are checked) is preserved unchanged; only which items are visible may change

#### Scenario: Show filter keys off saved membership, not pending selection

- **WHEN** the owner unchecks a currently-saved item under `Show: All`, then switches to `Show: Only on the list`
- **THEN** the just-unchecked item is still rendered (because saved membership has not changed), and its checkbox reflects the pending unchecked state
