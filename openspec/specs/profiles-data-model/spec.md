# profiles-data-model Specification

## Purpose

Defines the relational home for profiles — first-class list-owning identities that may be account-backed (self) or account-less (managed: child, couple, household) — including membership roles, normalized per-profile preferences, actor-audit columns on content tables, and the deletion semantics that keep profiles independent of account lifecycle.

## Requirements

### Requirement: Profiles are first-class rows independent of accounts

The database SHALL hold profiles in their own table, keyed by their own id, with `name` (required), `created_at`, `updated_at`, and a nullable `user_id` reference to the accounts table. A non-null `user_id` marks the profile as that account's self-profile; a null `user_id` marks a managed profile. Deleting a user account SHALL NOT delete or cascade into any profile: the profile row survives with `user_id` set to null.

#### Scenario: Managed profile exists without any account

- **WHEN** a profile row is created with `user_id` null
- **THEN** the row is valid and persists with no corresponding account

#### Scenario: Account deletion detaches, never deletes, the self-profile

- **WHEN** a user account is deleted
- **THEN** the account's self-profile row remains, with `user_id` now null

### Requirement: Each account has exactly one self-profile

The database SHALL enforce at most one self-profile per account (a partial unique constraint over non-null `user_id`), and the phase-1 migration SHALL backfill one self-profile per existing account, named from the account's name — or `UNTITLED` when the account carries no name — idempotently, so re-running the backfill creates no duplicates. The constraint SHALL NOT bound how many managed profiles an account can own or manage.

`UNTITLED` is a placeholder sentinel, not a display name: no code reads it this phase, and a later change plans to replace it with a generated name.

#### Scenario: Backfill is idempotent

- **WHEN** the self-profile backfill runs against a database where some or all accounts already have self-profiles
- **THEN** every account ends with exactly one self-profile and no run fails or duplicates

#### Scenario: Nameless account gets the placeholder sentinel

- **WHEN** the backfill runs for an account whose `name` is null
- **THEN** its self-profile is created with the name `UNTITLED`

#### Scenario: Second self-profile rejected

- **WHEN** an insert attempts a second profile row carrying the same non-null `user_id`
- **THEN** the database rejects it

### Requirement: Every new account gets a self-profile at creation

Account creation SHALL create the account's self-profile and its `self` membership row, by the same invariant and the same deterministic identity the phase-1 backfill uses, idempotently — so an account created after the migration is indistinguishable from one the backfill covered. The backfill SHALL NOT be the sole source of self-profiles: it is a point-in-time pass over accounts that already exist, and an account created after it would otherwise hold no profile at all.

#### Scenario: New account gets a self-profile

- **WHEN** a new account is created
- **THEN** a profile row exists carrying that account's id in `user_id` and the account's name in `name`
- **AND** a membership row with role `self` links the account to that profile

#### Scenario: Nameless new account gets the placeholder sentinel

- **WHEN** a new account is created carrying no name
- **THEN** its self-profile is created with the name `UNTITLED`

#### Scenario: Creation is idempotent against an existing self-profile

- **WHEN** account creation runs for an account that already holds a self-profile
- **THEN** no duplicate profile or membership row is created and no error surfaces

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

The `items` and `lists` tables SHALL each carry `updated_by_user_id`: nullable, referencing the accounts table, set to null when the referenced account is deleted. The phase-1 migration SHALL backfill it from each row's current `user_id`, idempotently. No application code SHALL read or write the column this phase — stamping on content-bearing writes and the first reader arrive in later changes.

#### Scenario: Backfill copies the current owner

- **WHEN** the phase-1 migration completes
- **THEN** every existing `items` and `lists` row has `updated_by_user_id` equal to its `user_id`

#### Scenario: Mutator's account deleted

- **WHEN** an account referenced by some row's `updated_by_user_id` is deleted
- **THEN** that row survives with `updated_by_user_id` null

### Requirement: Phase 1 is additive only

The phase-1 migration SHALL be forward-only and additive: it SHALL NOT drop, rename, or retype any existing table or column, SHALL NOT change any existing foreign key or index, and SHALL NOT alter any application-observable behavior. Existing reads and writes SHALL behave identically before and after the migration.

#### Scenario: Existing schema untouched

- **WHEN** the phase-1 migration completes
- **THEN** every pre-existing table, column, constraint, and index is unchanged

### Requirement: Local-mode seed covers both profile kinds

The dev seed SHALL produce, idempotently: a self-profile with `self` membership for every seeded user (via the same invariant the backfill guarantees), one managed profile with the primary test viewer as `owner` and one other seeded user as `manager`, and no preference rows. `db:reset:dev` SHALL wipe every profile reachable from a seeded user — those carrying a seeded user's `user_id`, and those a seeded user holds any membership on — before reseeding, with membership and preference rows following by cascade. The wipe SHALL precede the seeded-user delete, which detaches both handles. The local-mode session layer SHALL read a `BYPASS_ACTIVE_PROFILE` environment variable as a dormant seam — accepted and exposed, consumed by nothing until active-profile resolution exists.

#### Scenario: Seeded managed profile with both roles

- **WHEN** the dev seed completes
- **THEN** one managed profile exists with an `owner` membership for the test viewer and a `manager` membership for another seeded user

#### Scenario: Reset wipes profile state

- **WHEN** `db:reset:dev` runs against a database holding seeded self-profiles, the seeded managed profile, and a profile created by hand under a seeded user
- **THEN** all three are gone, along with their membership and preference rows
- **AND** the seed's own profile fixtures are recreated deterministically
