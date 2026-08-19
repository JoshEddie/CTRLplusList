# profiles-data-model Specification

## Purpose

Defines the relational home for profiles — first-class list-owning identities that may be account-backed (self) or account-less (managed: child, couple, household) — including membership roles, normalized per-profile preferences, actor-audit columns on content tables, and the deletion semantics that keep profiles independent of account lifecycle.

## Requirements

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

### Requirement: Profile membership carries role and ride-along

The database SHALL record who runs each profile in a membership table keyed by (user, profile), where each row carries a role — exactly one of `self`, `owner`, or `manager` (database-enforced) — a ride-along flag defaulting to false, and `created_at`. Membership rows SHALL cascade away when their user or their profile is deleted. The phase-1 backfill SHALL create a `self`-role membership row linking each account to its self-profile, so "profiles this user runs" is answerable from membership containment alone.

#### Scenario: Invalid role rejected

- **WHEN** an insert attempts a membership row with a role outside `self`/`owner`/`manager`
- **THEN** the database rejects it

#### Scenario: User deletion removes their memberships but not the profiles

- **WHEN** a user with memberships in managed profiles is deleted
- **THEN** those membership rows are gone and the managed-profile rows remain

#### Scenario: Backfilled self membership

- **WHEN** the phase-1 backfill completes
- **THEN** every account has a membership row with role `self` on its own self-profile

### Requirement: Profile preferences are normalized against a catalog

The database SHALL hold a preferences catalog (stable text identifier as key, plus name and type) and a per-profile values table keyed by (profile, preference) referencing the catalog, with values stored as text. Phase 1 SHALL ship both tables empty — no catalog rows are defined by this capability; features that introduce a preference own its catalog row. Per-profile value rows SHALL cascade away when their profile or their catalog entry is deleted.

#### Scenario: Tables exist and are empty after migration

- **WHEN** the phase-1 migration completes on a fresh or existing database
- **THEN** the preferences catalog and per-profile values tables exist and contain no rows

### Requirement: Items and lists carry a last-mutator audit column

The `items` and `lists` tables SHALL each carry `updated_by_user_id`: nullable, referencing the accounts table, set to null when the referenced account is deleted. The phase-1 migration SHALL backfill it from each row's current `user_id`, idempotently.

The column SHALL be stamped with the acting account's id on the four content-bearing writes — creating an item, updating an item, creating a list, and updating a list — and SHALL NOT be stamped on any other write. Archiving, deleting, reordering, touching a list's recency, and changing a list's visibility SHALL leave it as it stands, because none of them changes the content a reader would attribute to a mutator. The column remains write-only: no application code reads it, and the first reader arrives in a later change.

#### Scenario: Backfill copies the current owner

- **WHEN** the phase-1 migration completes
- **THEN** every existing `items` and `lists` row has `updated_by_user_id` equal to its `user_id`

#### Scenario: Mutator's account deleted

- **WHEN** an account referenced by some row's `updated_by_user_id` is deleted
- **THEN** that row survives with `updated_by_user_id` null

#### Scenario: Content-bearing write stamps the actor

- **WHEN** an authenticated account creates or updates an item, or creates or updates a list
- **THEN** the written row's `updated_by_user_id` is that account's id

#### Scenario: Non-content writes leave the column alone

- **WHEN** an item is archived or deleted, list items are reordered, a list's recency is touched, or a list's visibility is changed
- **THEN** the affected row's `updated_by_user_id` is unchanged

### Requirement: Phase 1 is additive only

The phase-1 migration SHALL be forward-only and additive: it SHALL NOT drop, rename, or retype any existing table or column, SHALL NOT change any existing foreign key or index, and SHALL NOT alter any application-observable behavior. Existing reads and writes SHALL behave identically before and after the migration.

#### Scenario: Existing schema untouched

- **WHEN** the phase-1 migration completes
- **THEN** every pre-existing table, column, constraint, and index is unchanged

### Requirement: Local-mode seed covers both profile kinds

The dev seed SHALL produce, idempotently: a self-profile with `self` membership for every seeded user (via the same invariant the backfill guarantees), one managed profile with the primary test viewer as `owner` and one other seeded user as `manager`, and no preference rows. `db:reset:dev` SHALL wipe every profile a seeded user holds any membership on — membership is the sole handle, because a profile carries no account reference — before reseeding, with membership and preference rows following by cascade. The wipe SHALL precede the seeded-user delete, which cascades those memberships away and would otherwise strand every profile behind them. The local-mode session layer SHALL read a `BYPASS_ACTIVE_PROFILE` environment variable as a dormant seam — accepted and exposed, consumed by nothing until active-profile resolution exists.

#### Scenario: Seeded managed profile with both roles

- **WHEN** the dev seed completes
- **THEN** one managed profile exists with an `owner` membership for the test viewer and a `manager` membership for another seeded user

#### Scenario: Reset wipes profile state

- **WHEN** `db:reset:dev` runs against a database holding seeded self-profiles, the seeded managed profile, and a profile created by hand carrying a seeded user's membership
- **THEN** all three are gone, along with their membership and preference rows
- **AND** the seed's own profile fixtures are recreated deterministically

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
