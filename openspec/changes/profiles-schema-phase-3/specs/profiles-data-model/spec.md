## ADDED Requirements

### Requirement: Deleting a profile SHALL cascade its content and edges

Deleting a profile SHALL delete the lists, items, follow edges, block edges, and purchase rows that name it as owner or purchaser, and SHALL leave any purchase row naming it as asserter in place with the asserter reference cleared. Content and social rows hang off profiles, so a profile's deletion takes its content with it; a claim someone else holds is not that profile's content, and survives with its provenance lost rather than the row.

#### Scenario: Deleting a profile cascades exactly as deleting its account did

- **WHEN** a profile referenced by lists, items, follow edges, block edges, and purchases is deleted
- **THEN** the lists, items, follow edges, block edges, and purchaser rows referencing it are deleted, and any purchase row naming it as asserter survives with `claimed_by_profile_id` set to NULL

### Requirement: Follow and block edges SHALL be unique per pair

The database SHALL reject a duplicate follow edge for a given (follower account, followee profile) pair and a duplicate block edge for a given (blocker profile, blocked profile) pair. Under a driver with no interactive transactions, this database-layer guarantee is the only backstop against two concurrent requests both inserting the same edge.

#### Scenario: Duplicate follow edge is rejected

- **WHEN** a second `INSERT INTO user_follows` with the same `(follower_id, followee_profile_id)` pair is attempted without an `ON CONFLICT` clause
- **THEN** the database raises a unique-violation error (SQLSTATE 23505)

#### Scenario: Duplicate block edge is rejected

- **WHEN** a second `INSERT INTO user_blocks` with the same `(blocker_profile_id, blocked_profile_id)` pair is attempted without an `ON CONFLICT` clause
- **THEN** the database raises a unique-violation error (SQLSTATE 23505)

### Requirement: Ownership comparisons SHALL be profile-valued on both sides

Every check of the form "does this row belong to the acting party" SHALL compare the row's profile column against the profile id the request acts as. It SHALL NOT compare a profile column against an account id — such a comparison is silently always false, because the two id spaces never overlap and both are strings, so a cross-kind mistake type-checks and evaluates false for every row rather than failing loudly.

#### Scenario: Owner is recognized through the profile comparison

- **WHEN** the account that owns a list renders that list
- **THEN** the list's `profile_id` equals the profile id the request acts as, and every owner-only affordance and authorization resolves

#### Scenario: Non-owner is not recognized

- **WHEN** an account that does not own a list renders that list
- **THEN** the list's `profile_id` differs from the profile id the request acts as, and no owner-only affordance or authorization resolves

### Requirement: Minted profile ids SHALL carry no account id

A profile id minted by the migration backfill or by account creation SHALL be opaque and SHALL NOT derive from the id of any account: profiles are not one-to-one with accounts, so a key derived from an account id asserts a relationship the model denies and outlives the account it names.

The rule binds the two minting paths that run against a real database, not every string that can occupy the column. The dev seed and test fixtures mint ids from a deterministic `self-<account id>` helper, whose shape is irrelevant to the behavior under test and whose output no production path produces.

#### Scenario: Profile id carries no account id

- **WHEN** any profile is created, whether by the migration backfill or by account creation
- **THEN** its id is opaque and contains no account's id

## MODIFIED Requirements

### Requirement: Profiles are first-class rows independent of accounts

The database SHALL hold profiles in their own table, keyed by their own id, with `name` (required), `created_at`, and `updated_at`.

The profiles table SHALL hold no reference to the accounts table. A profile's link to an account lives entirely in the membership table, whose `self` role marks the profile as that account's own identity; a profile no account holds a `self` membership on is a managed profile. Deleting a user account SHALL NOT delete or cascade into any profile: the profile row survives, and only its membership rows go.

#### Scenario: Managed profile exists without any account

- **WHEN** a profile row is created with no membership rows
- **THEN** the row is valid and persists with no corresponding account

#### Scenario: Account deletion detaches, never deletes, the self-profile

- **WHEN** a user account is deleted
- **THEN** the account's self-profile row remains, and its `self` membership row is gone

### Requirement: Each account has exactly one self-profile

The database SHALL enforce that an account holds at most one `self` membership, and that a profile is the subject of at most one `self` membership — partial unique constraints over the membership table restricted to the `self` role, one in each direction. The phase-1 migration SHALL backfill one self-profile per existing account, named from the account's name — or `UNTITLED` when the account carries no name — idempotently, so re-running the backfill creates no duplicates. The constraints SHALL NOT bound how many managed profiles an account can own or manage.

Both directions are load-bearing. The account-side constraint is the "one self-profile per account" invariant; the profile-side constraint is what makes a self-profile resolve back to exactly one human, which `claim-attribution` relies on when it recovers the person behind a claim asserter.

`UNTITLED` is a placeholder sentinel, not a display name: no code reads it this phase, and a later change plans to replace it with a generated name.

#### Scenario: Backfill is idempotent

- **WHEN** the self-profile backfill runs against a database where some or all accounts already have self-profiles
- **THEN** every account ends with exactly one self-profile and no run fails or duplicates

#### Scenario: Nameless account gets the placeholder sentinel

- **WHEN** the backfill runs for an account whose `name` is null
- **THEN** its self-profile is created with the name `UNTITLED`

#### Scenario: Second self-profile rejected

- **WHEN** an insert attempts a second `self` membership row for an account that already holds one
- **THEN** the database rejects it

#### Scenario: Second account claiming one self-profile rejected

- **WHEN** an insert attempts a `self` membership row naming a profile that is already some account's self-profile
- **THEN** the database rejects it

### Requirement: Every new account gets a self-profile at creation

Account creation SHALL create the account's self-profile and its `self` membership row, by the same invariant the phase-1 backfill uses, idempotently — so an account created after the migration is indistinguishable from one the backfill covered. The profile id SHALL be minted opaquely, and creation idempotency SHALL rest on the self-role uniqueness constraint rather than on an id a caller can re-derive.

Creation SHALL be atomic across both rows. Because the profile row must exist before the membership row that references it, and no interactive transaction is available, a creation that loses the uniqueness race SHALL leave no profile row behind — an unreferenced profile is unreachable and permanent, and nothing would later collect it.

The backfill SHALL NOT be the sole source of self-profiles: it is a point-in-time pass over accounts that already exist, and an account created after it would otherwise hold no profile at all.

#### Scenario: New account gets a self-profile

- **WHEN** a new account is created
- **THEN** a profile row exists carrying the account's name in `name`
- **AND** a membership row with role `self` links the account to that profile

#### Scenario: Nameless new account gets the placeholder sentinel

- **WHEN** a new account is created carrying no name
- **THEN** its self-profile is created with the name `UNTITLED`

#### Scenario: Creation is idempotent against an existing self-profile

- **WHEN** account creation runs for an account that already holds a self-profile
- **THEN** no duplicate profile or membership row is created and no error surfaces

#### Scenario: A losing creation attempt leaves no orphan profile

- **WHEN** two account-creation attempts for the same account race, and one loses the self-role uniqueness constraint
- **THEN** the losing attempt leaves no profile row behind, and exactly one profile with one `self` membership exists

### Requirement: The claim asserter and a self-claim's purchaser SHALL always be the acting account's self-profile

`purchases.claimed_by_profile_id` records who asserted a claim. A claim is a human act, so it SHALL always store the acting account's own self-profile and SHALL NOT store any other profile, even once a surface exists for an account to act as another profile. For the same reason, a self-claim's purchaser (`purchases.profile_id`) SHALL be the acting account's self-profile.

This rule keeps the mapping from a profile in these two columns back to a human injective, since an account has exactly one self-profile and the database enforces it in both directions. The human behind an asserter is therefore recoverable through that profile's `self` membership, and no separate account-valued actor column is owed. No such membership means the account was deleted.

An attributed claim's purchaser is not bound by this rule: it names the profile attributed as the buyer, which is a target rather than an actor.

#### Scenario: Asserter is the actor's own self-profile

- **WHEN** an authenticated caller records any claim
- **THEN** the inserted row's `claimed_by_profile_id` is the caller's own self-profile

#### Scenario: Self-claim's purchaser is the actor's own self-profile

- **WHEN** an authenticated caller records a claim naming themselves as the purchaser
- **THEN** the inserted row's `profile_id` and `claimed_by_profile_id` are both the caller's own self-profile

#### Scenario: Asserter resolves back to a human

- **WHEN** a claim's asserter profile is resolved through its `self` membership
- **THEN** it yields exactly one account, or nothing when that account has been deleted

### Requirement: Local-mode seed covers both profile kinds

The dev seed SHALL produce, idempotently: a self-profile with `self` membership for every seeded user (via the same invariant the backfill guarantees), one managed profile with the primary test viewer as `owner` and one other seeded user as `manager`, and no preference rows. `db:reset:dev` SHALL wipe every profile a seeded user holds any membership on — membership is the sole handle, because a profile carries no account reference — before reseeding, with membership and preference rows following by cascade. The wipe SHALL precede the seeded-user delete, which cascades those memberships away and would otherwise strand every profile behind them. The local-mode session layer SHALL read a `BYPASS_ACTIVE_PROFILE` environment variable as a dormant seam — accepted and exposed, consumed by nothing until active-profile resolution exists.

#### Scenario: Seeded managed profile with both roles

- **WHEN** the dev seed completes
- **THEN** one managed profile exists with an `owner` membership for the test viewer and a `manager` membership for another seeded user

#### Scenario: Reset wipes profile state

- **WHEN** `db:reset:dev` runs against a database holding seeded self-profiles, the seeded managed profile, and a profile created by hand carrying a seeded user's membership
- **THEN** all three are gone, along with their membership and preference rows
- **AND** the seed's own profile fixtures are recreated deterministically

## REMOVED Requirements

### Requirement: Content and social rows SHALL carry a profile reference beside their account reference

**Reason**: The requirement was a migration column-mapping table — which new profile column sat beside which kept account column, and in what order they were added, backfilled and tightened. Its closing sentence ("The account columns SHALL keep their names and their data through this phase; a later change drops them") is resolved by this change, and the table describes a schema that no longer exists. Sequencing a migration is not observable behavior; the implementation could have reached the same end state a dozen ways without any of it changing.

**Migration**: The end-state schema is `db/schema.ts`. The migration ordering doctrine it encoded — additive first, backfill, then tighten — belongs to `DATABASE.md`, which already fires whenever a migration is written. Its one behavioral scenario, profile-deletion cascade, is re-added above as *Deleting a profile SHALL cascade its content and edges*. The historical record of the column mapping stays in the archived phase-1 and phase-2 changes.

### Requirement: The vacated account columns SHALL lose NOT NULL, and two composite primary keys SHALL be recreated over profile columns

**Reason**: The vacated columns are dropped by this change, so a requirement that they accept NULL describes columns that no longer exist. The rest was migration mechanics: which primary key was dropped and recreated over which columns, and that Postgres does not remove an implicit NOT NULL when a primary key goes.

**Migration**: The de-duplication guarantee the recreated keys carry is real behavior and is re-added above as *Follow and block edges SHALL be unique per pair*, stated as the guarantee rather than as the migration that produced it.

### Requirement: The profile-valued purchaser uniqueness index SHALL be created alongside the account-valued one, never swapped for it

**Reason**: Entirely a migration sequencing rule — that the new partial unique be added rather than swapped in, so no window exists in which neither protects the concurrent-claim path. This change drops the account-valued index, so the coexistence the requirement mandates is over.

**Migration**: The surviving guarantee — a profile cannot be recorded twice as the purchaser of one item — is already owned by `claim-attribution`'s concurrency-backstop requirement and is not duplicated here. The durable rule behind the sequencing (never replace a uniqueness constraint by drop-then-create under a driver with no interactive transactions; the gap permanently double-records) goes to `DATABASE.md`, the channel that already fires when a migration is written.

### Requirement: Ownership SHALL be a strict profile-id comparison, and `profile_members` SHALL gain no readers

**Reason**: The requirement bundled a durable rule with a phase-scoped implementation constraint. The constraint — that `profile_members` gain no reader, no cache tag, and no invalidation obligation — is falsified by this change, which makes that table the sole profile-to-account link and therefore its first reader. A prohibition that exists only to hold a transition still is not a behavior contract. The "strict equality, not a membership search" clause was likewise an instruction about how to write the comparison, not about what a caller observes.

**Migration**: The durable half — compare a row's profile column against a profile id, never against an account id — is re-added above as *Ownership comparisons SHALL be profile-valued on both sides*, with the two scenarios that survive. Its third scenario, asserting no membership read exists, dies with the prohibition. The silent-mismatch hazard the rule guards against is the standing subject of the residual-cleanup ticket on this map.
