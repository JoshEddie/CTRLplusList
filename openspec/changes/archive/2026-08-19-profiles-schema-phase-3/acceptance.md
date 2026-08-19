# Acceptance — profiles-schema-phase-3

## Flows

### Flow: A production database reaches the end state in one forward pass

- **Given** a database that has run neither `0010_late_chamber.sql` nor `0011_illegal_wind_dancer.sql`, holding accounts, lists, items, follow edges, block edges and purchases
- **When** the owner runs `npm run db:migrate`
- **Then** every account holds exactly one profile whose `name` is the account's name, and a `profile_members` row with role `self` linking the two
- **And** no profile's id contains the id of any account: each is 21 characters from nanoid's alphabet, minted by the migration's temporary `migration_0010_nanoid()` function
- **And** every list, item, follow edge, block edge and purchase row names the self-profile of the account its account column named
- **And** a purchase row whose purchaser and asserter were both account X ends with both profile columns set to X's self-profile
- **And** a row whose account column was NULL has a NULL profile column

### Flow: An account carrying no name is backfilled with the placeholder sentinel

- **Given** a pre-migration database holding an account whose `name` is null
- **When** the owner runs `npm run db:migrate`
- **Then** that account's self-profile is created with the name `UNTITLED`

### Flow: Re-running the migration changes nothing

- **Given** a database the migration has already been applied to in full
- **When** the owner runs `npm run db:migrate` a second time
- **Then** the command completes without error
- **And** every account still holds exactly one self-profile, with no duplicate profile or membership row
- **And** no column value changes

### Flow: The dev reset wipes seeded profile state and recreates the fixtures

- **Given** a local database holding the seeded self-profiles, the seeded managed profile, and a profile created by hand carrying a seeded user's membership
- **When** the owner runs `npm run db:reset:dev`
- **Then** all three profiles are gone, along with their membership and preference rows — the wipe reaches them through `profile_members`, membership being the sole handle
- **And** the seed's own profile fixtures are recreated deterministically
- **And** one managed profile exists with an `owner` membership for the test viewer and a `manager` membership for another seeded user

### Flow: A new account is born with a self-profile

- **Given** no account exists for the signing-in Google identity
- **When** the person completes sign-in
- **Then** a profile row exists carrying the account's name in `name`
- **And** a `profile_members` row with role `self` links the account to that profile
- **And** the profile's id contains no account id — `createSelfProfile` mints it with `nanoid()`

### Flow: A nameless new account gets the placeholder sentinel

- **Given** no account exists for the signing-in identity, and the provider returns no name
- **When** the person completes sign-in
- **Then** their self-profile is created with the name `UNTITLED`

### Flow: Creation for an account that already holds a self-profile is a no-op

- **Given** an account that already holds a self-profile and its `self` membership row
- **When** account creation runs for that account again
- **Then** no duplicate profile or membership row is created
- **And** no error surfaces to the caller

### Flow: A creation that loses the uniqueness race leaves no orphan profile

- **Given** an account with no self-profile, and two account-creation attempts issued concurrently for it
- **When** both attempts run to completion
- **Then** exactly one profile exists with exactly one `self` membership row
- **And** the losing attempt leaves no profile row behind
- **And** no error surfaces to the caller that lost

### Flow: A second self membership is rejected from either direction

- **Given** an account holding a `self` membership on its own profile
- **When** an insert attempts a second `self` membership row for that account, and another attempts a `self` membership row naming that account's profile for a different account
- **Then** the database rejects both — `profile_members_one_self_per_user_idx` and `profile_members_one_self_per_profile_idx` respectively

### Flow: Deleting an account detaches the self-profile instead of deleting it

- **Given** an account holding a self-profile that owns lists and items, and a purchase row naming that profile as asserter
- **When** the account row is deleted
- **Then** the profile row remains
- **And** its `self` membership row is gone

### Flow: Deleting a profile takes its content with it

- **Given** a profile referenced by lists, items, follow edges, block edges and purchases, and a separate purchase row naming it as asserter
- **When** the profile row is deleted
- **Then** the lists, items, follow edges, block edges and purchaser rows referencing it are deleted
- **And** the purchase row naming it as asserter survives with `claimed_by_profile_id` set to NULL

### Flow: A viewer claims an item for themselves in one tap

- **Given** a signed-in viewer on another profile's list item they have not claimed
- **When** the viewer clicks `Claim this gift`
- **Then** a `purchases` row is inserted whose `profile_id` and `claimed_by_profile_id` are both the viewer's own self-profile
- **And** its `guest_name` is NULL
- **And** no intervening confirmation screen renders

### Flow: A viewer records a claim for one of the owner's mutuals

- **Given** a signed-in viewer C on owner O's list item, where O's account follows profile B and B's account follows O's profile, and no block edge exists between B and C
- **When** C clicks `Claiming for someone else?`, clicks B's row, and clicks `Confirm — {name}`
- **Then** a `purchases` row is inserted whose `claimed_by_profile_id` is C's self-profile and whose `profile_id` is B
- **And** its `guest_name` is NULL
- **And** the item's claimed state renders with an unclaim affordance for C

### Flow: A managed profile's list offers only the free-text fallback

- **Given** a signed-in viewer on a list whose owning profile holds no `self` membership
- **When** the viewer clicks `Claiming for someone else?`
- **Then** the picker renders no pool rows
- **And** the free-text entry under `Someone not listed?` is the disclosure's only content
- **And** no error state renders

### Flow: An account-less profile cannot be marked as the purchaser

- **Given** a signed-in viewer on an item they may view, and a target profile holding no `self` membership
- **When** the viewer POSTs to `createPurchase` naming that profile as the attribution target
- **Then** the action rejects the request
- **And** no `purchases` row is inserted

### Flow: A profile cannot be recorded twice as one item's purchaser

- **Given** an item already carrying a `purchases` row whose purchaser is profile B
- **When** a second request records B as the purchaser of that item
- **Then** the insert violates the partial unique index on `purchases (item_id, profile_id) WHERE profile_id IS NOT NULL` with SQLSTATE `23505`
- **And** the action returns `{ success: false, error: 'Duplicate claim' }`
- **And** exactly one `purchases` row with purchaser B exists for that item
- **And** B, on opening the item, is shown as the already-recorded purchaser rather than an error

### Flow: A claim against a fully-claimed item is refused

- **Given** an item with `quantity_limit = 1` that already carries one `purchases` row
- **When** a signed-in viewer POSTs to `createPurchase` for that item
- **Then** the action returns `{ success: false, error: 'Fully claimed' }`
- **And** no new `purchases` row is inserted

### Flow: A signed-in viewer revokes their own claim

- **Given** a signed-in viewer A holding a claim on an item
- **When** A POSTs to `removePurchase` with that item's id
- **Then** the row whose `profile_id` is A's self-profile and whose `item_id` is that item is deleted
- **And** the action returns `{ success: true }`

### Flow: A guest revokes their own claim with the purchase row id

- **Given** a signed-out guest holding a claim their browser recorded
- **When** the guest POSTs to `removePurchase` with the `purchase_id` surfaced for their own claim and the matching `guest_name`
- **Then** that row is deleted and the action returns `{ success: true }`

### Flow: Blocking a mutual clears both follow edges

- **Given** a signed-in viewer whose account follows target profile T, and whose profile T's account follows back
- **When** the viewer clicks `Block`
- **Then** the `user_blocks` row naming the viewer's profile as blocker and T as blocked is the mutation's first database statement
- **And** both follow edges between the two parties are deleted, the reverse one resolved through T's `self` membership by the `selfMemberships` join in `lib/data/profile.identity.ts`
- **And** `updateTag('user_follows')` and `updateTag('user_blocks')` are each invoked exactly once
- **And** T no longer appears in the viewer's Following feed

### Flow: A duplicate follow or block edge is rejected

- **Given** a `user_follows` row for one (follower account, followee profile) pair and a `user_blocks` row for one (blocker profile, blocked profile) pair
- **When** a second insert of each pair is attempted without an `ON CONFLICT` clause
- **Then** the database raises a unique-violation error (SQLSTATE 23505) for both

### Flow: Owner-only affordances resolve for the owning account and no other

- **Given** two signed-in accounts, one owning a list and one not
- **When** each opens that list
- **Then** the owner's request resolves every owner-only affordance and authorization, its `profile_id` matching the profile the request acts as
- **And** the other account's request resolves none of them
