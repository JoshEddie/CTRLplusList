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

The dev seed SHALL produce, idempotently: a self-profile with `self` membership for every seeded user (via the same invariant the backfill guarantees), one managed profile with the primary test viewer as `owner` and one other seeded user as `manager`, and no preference rows. `db:reset:dev` SHALL wipe every profile reachable from a seeded user — those carrying a seeded user's `user_id`, and those a seeded user holds any membership on — before reseeding, with membership and preference rows following by cascade. The wipe SHALL precede the seeded-user delete, which detaches both handles. The local-mode session layer SHALL read a `BYPASS_ACTIVE_PROFILE` environment variable as a dormant seam — accepted and exposed, consumed by nothing until active-profile resolution exists.

#### Scenario: Seeded managed profile with both roles

- **WHEN** the dev seed completes
- **THEN** one managed profile exists with an `owner` membership for the test viewer and a `manager` membership for another seeded user

#### Scenario: Reset wipes profile state

- **WHEN** `db:reset:dev` runs against a database holding seeded self-profiles, the seeded managed profile, and a profile created by hand under a seeded user
- **THEN** all three are gone, along with their membership and preference rows
- **AND** the seed's own profile fixtures are recreated deterministically

### Requirement: Content and social rows SHALL carry a profile reference beside their account reference

Seven columns SHALL be added, each naming a profile beside the account column it will eventually replace:

| table | existing account column (kept) | new profile column |
| --- | --- | --- |
| `lists` | `user_id` | `profile_id` |
| `items` | `user_id` | `profile_id` |
| `user_follows` | `followee_id` | `followee_profile_id` |
| `user_blocks` | `blocker_id` | `blocker_profile_id` |
| `user_blocks` | `blocked_id` | `blocked_profile_id` |
| `purchases` | `user_id` | `profile_id` |
| `purchases` | `claimed_by` | `claimed_by_profile_id` |

Each new column SHALL mirror its predecessor's nullability and delete behavior exactly: cascade on the six content and edge columns, `SET NULL` on `purchases.claimed_by_profile_id`, and nullable on both `purchases` columns so the guest claim path is expressible. Each SHALL be added nullable, backfilled through the owning account's self-profile, then set `NOT NULL` wherever its predecessor is `NOT NULL`.

The migration SHALL be forward-only and idempotent: re-running it SHALL leave the same result and SHALL NOT fail. It SHALL NOT use an interactive transaction; any assertion spanning statements SHALL live inside a single `DO $$` block. `user_follows.follower_id` SHALL NOT gain a profile counterpart — profiles are followed and never follow.

The account columns SHALL keep their names and their data through this phase; a later change drops them.

#### Scenario: Backfill routes every row through its account's self-profile

- **WHEN** the migration completes against a database holding pre-existing lists, items, follow edges, block edges, and purchases
- **THEN** every row's new profile column names the self-profile of the account its existing account column names
- **AND** a row whose account column is NULL has a NULL profile column

#### Scenario: Backfill is idempotent

- **WHEN** the migration runs a second time against a database it has already migrated
- **THEN** it completes without error and no column value changes

#### Scenario: Follower side stays account-valued

- **WHEN** the `user_follows` table is inspected after the migration
- **THEN** `follower_id` still references the accounts table and no profile-valued follower column exists

#### Scenario: Deleting a profile cascades exactly as deleting its account did

- **WHEN** a profile referenced by lists, items, follow edges, block edges, and purchases is deleted
- **THEN** the lists, items, follow edges, block edges, and purchaser rows referencing it are deleted, and any purchase row naming it as asserter survives with `claimed_by_profile_id` set to NULL

### Requirement: The vacated account columns SHALL lose NOT NULL, and two composite primary keys SHALL be recreated over profile columns

`lists.user_id` and `items.user_id` SHALL be given `DROP NOT NULL`, because nothing writes them after this change and a managed profile carries no account id to put there. `purchases.user_id` and `purchases.claimed_by` are already nullable and SHALL be left as they are.

`user_follows` and `user_blocks` are the exception to the rule that this phase only relaxes constraints on the vacated columns: their account columns sit inside composite primary keys, and a primary key implies `NOT NULL`, so the constraint cannot be relaxed while the key stands. Both primary keys SHALL therefore be dropped and recreated over the profile columns — `user_follows` keyed `(follower_id, followee_profile_id)` and `user_blocks` keyed `(blocker_profile_id, blocked_profile_id)` — and the vacated columns SHALL then be given an explicit `DROP NOT NULL`, because Postgres does not remove the implicit one when a primary key goes. This is breaking at the schema level and invisible at the application level.

The recreated keys SHALL carry forward the de-duplication guarantee the dropped keys held: they are the database-layer backstop against duplicate follow and block rows under a driver with no interactive transactions.

#### Scenario: Vacated content columns become nullable

- **WHEN** a row is inserted into `lists` or `items` with `user_id` NULL and `profile_id` set
- **THEN** the database accepts it

#### Scenario: Recreated key rejects a duplicate follow edge

- **WHEN** a second `INSERT INTO user_follows` with the same `(follower_id, followee_profile_id)` pair is attempted without an `ON CONFLICT` clause
- **THEN** the database raises a unique-violation error (SQLSTATE 23505) from the recreated composite primary key

#### Scenario: Recreated key rejects a duplicate block edge

- **WHEN** a second `INSERT INTO user_blocks` with the same `(blocker_profile_id, blocked_profile_id)` pair is attempted without an `ON CONFLICT` clause
- **THEN** the database raises a unique-violation error (SQLSTATE 23505) from the recreated composite primary key

#### Scenario: Vacated edge columns become nullable once their key is gone

- **WHEN** the migration completes
- **THEN** `user_follows.followee_id`, `user_blocks.blocker_id`, and `user_blocks.blocked_id` accept NULL

### Requirement: The profile-valued purchaser uniqueness index SHALL be created alongside the account-valued one, never swapped for it

A partial unique index over `purchases (item_id, profile_id) WHERE profile_id IS NOT NULL` SHALL be created while the existing partial unique over `(item_id, user_id)` remains in place. Both SHALL coexist for this phase; a later change drops the account-valued one together with its column.

The index SHALL NOT be created by dropping the existing one first. Under a driver with no interactive transactions, a drop-then-create sequence leaves a window in which no partial unique protects the concurrent-claim path, and a claim recorded in that window would double-record a purchaser permanently. Adding rather than swapping removes the window; two coexisting indexes for one phase is the entire cost.

#### Scenario: Both indexes exist after the migration

- **WHEN** the `purchases` table's indexes are inspected after the migration
- **THEN** a partial unique over `(item_id, user_id)` and a partial unique over `(item_id, profile_id)` are both present

#### Scenario: Duplicate profile-valued purchaser is rejected

- **WHEN** two requests race to record the same profile as purchaser of the same item
- **THEN** exactly one `purchases` row with that `(item_id, profile_id)` pair exists

#### Scenario: No window without a purchaser uniqueness guarantee

- **WHEN** the migration's statements are inspected in order
- **THEN** no point in the sequence leaves `purchases` with neither partial unique index in place

### Requirement: Ownership SHALL be a strict profile-id comparison, and `profile_members` SHALL gain no readers

Every check of the form "does this row belong to the acting party" SHALL compare the row's profile column against the profile id the request acts as. It SHALL NOT compare a profile column against an account id — such a comparison is silently always false, because the two id spaces never overlap.

Because an account owns exactly one profile in this phase, the comparison SHALL be strict equality and SHALL NOT be a membership search. The `profile_members` table SHALL gain no reader in this phase: no containment helper, no cache tag, and no invalidation obligation. Machinery for an account acting as a profile it does not own has no reachable caller here and belongs to the change that makes that case real.

#### Scenario: Owner is recognized through the profile comparison

- **WHEN** the account that owns a list renders that list
- **THEN** the list's `profile_id` equals the profile id the request acts as, and every owner-only affordance and authorization resolves as it did before this change

#### Scenario: Non-owner is not recognized

- **WHEN** an account that does not own a list renders that list
- **THEN** the list's `profile_id` differs from the profile id the request acts as, and no owner-only affordance or authorization resolves

#### Scenario: No membership read is introduced

- **WHEN** the application source is inspected after this change
- **THEN** no read of `profile_members` exists, and no cache tag or invalidation call names it

### Requirement: The claim asserter and a self-claim's purchaser SHALL always be the acting account's self-profile

`purchases.claimed_by_profile_id` records who asserted a claim. A claim is a human act, so it SHALL always store the acting account's own self-profile and SHALL NOT store any other profile, even once a surface exists for an account to act as another profile. For the same reason, a self-claim's purchaser (`purchases.profile_id`) SHALL be the acting account's self-profile.

This rule keeps the mapping from a profile in these two columns back to a human injective, since an account has exactly one self-profile and the database enforces it. The human behind an asserter is therefore recoverable through the profile's `user_id`, and no separate account-valued actor column is owed. A NULL there means the account was deleted.

An attributed claim's purchaser is not bound by this rule: it names the profile attributed as the buyer, which is a target rather than an actor.

#### Scenario: Asserter is the actor's own self-profile

- **WHEN** an authenticated caller records any claim
- **THEN** the inserted row's `claimed_by_profile_id` is the caller's own self-profile

#### Scenario: Self-claim's purchaser is the actor's own self-profile

- **WHEN** an authenticated caller records a claim naming themselves as the purchaser
- **THEN** the inserted row's `profile_id` and `claimed_by_profile_id` are both the caller's own self-profile

#### Scenario: Asserter resolves back to a human

- **WHEN** a claim's asserter profile is resolved through `profiles.user_id`
- **THEN** it yields exactly one account, or NULL when that account has been deleted
