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

The database SHALL record who runs each profile in a membership table keyed by (user, profile), where each row carries a role — exactly one of `self`, `owner`, or `manager` (database-enforced) — a ride-along flag defaulting to false, a nullable timestamp recording when that account last acted as that profile, and `created_at`. Membership rows SHALL cascade away when their user or their profile is deleted, taking the last-acted-as timestamp with them, so no record of a revoked membership's use survives it. The phase-1 backfill SHALL create a `self`-role membership row linking each account to its self-profile, so "profiles this user runs" is answerable from membership containment alone.

The last-acted-as timestamp SHALL be added without a backfill: NULL is the correct value for a membership never acted as, and `active-profile` defines when it is written and how it orders. It is a property of the (account, profile) pair rather than of the profile, so it is a membership column rather than a per-profile preference.

#### Scenario: Invalid role rejected

- **WHEN** an insert attempts a membership row with a role outside `self`/`owner`/`manager`
- **THEN** the database rejects it

#### Scenario: User deletion removes their memberships but not the profiles

- **WHEN** a user with memberships in managed profiles is deleted
- **THEN** those membership rows are gone and the managed-profile rows remain

#### Scenario: Backfilled self membership

- **WHEN** the phase-1 backfill completes
- **THEN** every account has a membership row with role `self` on its own self-profile

#### Scenario: A new membership has never been acted as

- **WHEN** a membership row is created
- **THEN** its last-acted-as timestamp is NULL

#### Scenario: Revoking a membership discards its use record

- **WHEN** a membership carrying a last-acted-as timestamp is deleted
- **THEN** no row records that account's use of that profile

### Requirement: Per-profile preference values SHALL be normalized against a catalog

The database SHALL hold a preferences catalog (stable text identifier as key, plus name and type) and a per-profile values table keyed by (profile, preference) referencing the catalog, with values stored as text. Per-profile value rows SHALL cascade away when their profile or their catalog entry is deleted.

A catalog row is owned by the feature that introduces the preference it names: no capability defines a catalog row for a preference it does not consume, and a feature adding one adds it as part of its own migration. This capability owns exactly one catalog row — `accent`, name "Accent color", type `text` — introduced by the profile accent. Its per-profile value is the NAME of a palette preset; what that name renders as is owned by `profiles-surface`. A name rather than colours: the palette holds what each name paints, so re-branding is a palette edit and no stored row is rewritten.

A catalog row SHALL NOT be deleted once shipped: per-profile values reference it, and removing it discards them by cascade.

#### Scenario: An accent value stores against its catalog entry and reads back

- **WHEN** an accent is stored for a profile
- **THEN** the per-profile values table holds one row for that profile keyed to `accent`, and reads return the stored preset name

#### Scenario: A value naming no catalog entry is rejected

- **WHEN** a per-profile value row is written naming a preference identifier the catalog does not carry
- **THEN** the database rejects it

#### Scenario: Deleting a profile discards its preference values

- **WHEN** a profile holding preference values is deleted
- **THEN** its rows in the per-profile values table are gone

#### Scenario: Value rows follow their catalog entry

- **WHEN** a catalog entry is deleted
- **THEN** every per-profile value row referencing it is gone

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

The dev seed SHALL produce, idempotently: a self-profile with `self` membership for every seeded user (via the same invariant the backfill guarantees), one managed profile with the primary test viewer as `owner` and one other seeded user as `manager`, a second managed profile on which the primary test viewer is `manager` rather than `owner`, every shipped preferences catalog row, and no per-profile preference values. The primary test viewer therefore runs three profiles across all three roles, so a switchable set exists and the `manager` role — the one the membership floor admits and a later change narrows — is covered by a fixture rather than only by a unit test. The catalog rows are seeded rather than inherited: the local and e2e databases are provisioned by `drizzle-kit push` straight from the schema, which creates tables and replays no migration data, so a catalog row a migration inserts on Neon reaches them only through the seed. Every seeded profile therefore renders the accent fallback.

The seeded memberships SHALL carry deterministic, distinct last-acted-as timestamps, far enough apart to order unambiguously, with at least one left NULL — so a switcher ordered most-recently-acted-as first is testable against a fixture that can distinguish a correct ordering from a broken one, and the never-acted-as branch has a fixture too.

`db:reset:dev` SHALL wipe every profile a seeded user holds any membership on — membership is the sole handle, because a profile carries no account reference — before reseeding, with membership and preference rows following by cascade. The wipe SHALL precede the seeded-user delete, which cascades those memberships away and would otherwise strand every profile behind them.

#### Scenario: Seeded managed profile with both roles

- **WHEN** the dev seed completes
- **THEN** one managed profile exists with an `owner` membership for the test viewer and a `manager` membership for another seeded user

#### Scenario: The test viewer holds every role

- **WHEN** the dev seed completes
- **THEN** the primary test viewer holds a `self`, an `owner`, and a `manager` membership, on three distinct profiles

#### Scenario: Seeded memberships order unambiguously

- **WHEN** the dev seed completes
- **THEN** the test viewer's memberships carry distinct last-acted-as timestamps, with at least one NULL

#### Scenario: Seeded profiles carry no accent

- **WHEN** the dev seed completes
- **THEN** the preferences catalog holds the `accent` row
- **AND** the per-profile values table holds no rows, so every seeded profile renders the fallback

#### Scenario: Reset wipes profile state

- **WHEN** `db:reset:dev` runs against a database holding seeded self-profiles, the seeded managed profiles, and a profile created by hand carrying a seeded user's membership
- **THEN** all of them are gone, along with their membership and preference rows
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

### Requirement: Profiles SHALL carry an optional tagline

The `profiles` table SHALL include a nullable `tagline` text column. A tagline submitted as an empty string, a whitespace-only string, or omitted entirely SHALL be persisted as SQL `NULL`, never as `''` or a whitespace string. A tagline SHALL be at most 40 characters — shorter than `lists.subtitle`'s 120 because a profile card shares one line between name, role and counts.

Both rules SHALL be enforced server-side at the validation boundary, which is the sole authority: the trim-to-null is the submission schema's own transform and SHALL NOT be restated client-side, because a client copy changes no persisted outcome and can fall out of step with the schema silently. The length cap SHALL additionally carry a `maxLength` on the input — that one is a typing affordance, stopping the character before it is typed rather than reporting it after, which no server rule can do.

A profile that has never been given a tagline SHALL read as NULL, never as an empty string — there is no value from which a tagline is derived. How an absent tagline renders is owned by `profiles-surface`.

#### Scenario: Tagline persists

- **WHEN** a profile is created or updated with tagline "Loves dinosaurs"
- **THEN** the row's `tagline` column stores "Loves dinosaurs" and subsequent reads return it

#### Scenario: Blank tagline stores NULL

- **WHEN** a create or update payload carries a tagline that is empty or whitespace-only
- **THEN** the validated value is `null` and the persisted column is SQL `NULL`, not an empty string

#### Scenario: Over-length tagline is rejected

- **WHEN** a create or update payload carries a tagline longer than 40 characters
- **THEN** validation fails with a field error on `tagline`, and no row is inserted or updated with the over-length value

#### Scenario: A profile that was never given a tagline has none

- **WHEN** a profile created without a tagline is read
- **THEN** its `tagline` is NULL, and no value is derived from its name or any other field

### Requirement: Managed-profile creation SHALL mint the profile and its creator's owner membership together

Creating a managed profile SHALL write a `profiles` row and a membership row giving the creating account the `owner` role on it, and SHALL NOT write a `self` membership — the absence of a `self` membership is what makes the profile managed.

Creation SHALL be atomic across both rows: because the profile row must exist before the membership row that references it, and no interactive transaction is available, a creation that fails to write the membership SHALL leave no profile row behind — an unreferenced managed profile is unreachable and permanent, since membership is the only handle onto a profile.

Unlike self-profile creation, managed-profile creation SHALL NOT be idempotent and SHALL NOT swallow a uniqueness violation: nothing constrains how many managed profiles an account may own, and two creations with the same name are two distinct profiles.

Creation SHALL also write the profile's accent preference value. That write is NOT atomic with the other two: a profile written without its membership row is unreachable by anyone and permanent, while a profile written without its accent simply carries none — a state this capability's siblings already define, and one an owner corrects by editing the profile.

#### Scenario: Created profile is managed and owned by its creator

- **WHEN** an authenticated account creates a managed profile
- **THEN** a `profiles` row exists carrying the submitted name
- **AND** exactly one membership row references it, with role `owner`, held by the creating account
- **AND** no `self` membership references it

#### Scenario: A failed membership write leaves no profile row

- **WHEN** managed-profile creation writes the profile row but its membership row is not written
- **THEN** no profile row remains

#### Scenario: Two profiles may share a name

- **WHEN** one account creates two managed profiles with the same name
- **THEN** both exist as distinct rows, each with its own `owner` membership

#### Scenario: A created managed profile carries a stored accent

- **WHEN** an account creates a managed profile
- **THEN** a preference row holding an accent exists for it

#### Scenario: A failed accent write still leaves the profile

- **WHEN** the profile and membership rows are written
- **AND** the accent write fails
- **THEN** the profile is created

### Requirement: A cached read SHALL be invalidated when any table it holds is written

A cached read holds every table it reads, including tables it only joins. When any table it holds is written, that read SHALL be invalidated.

One table is enough. A read holding several tables SHALL be invalidated by a write to any one of them, and a failed write to another SHALL NOT prevent it: the question is whether anything the read holds changed, not whether the operation around it completed.

A write that lands no row invalidates nothing — no read went stale, and discarding an entry anyway throws away a valid one.

#### Scenario: A table's write invalidates every cache holding it

- **WHEN** a table is written
- **AND** a cached read holds that table
- **THEN** that cached read is invalidated

#### Scenario: Nothing written, nothing invalidated

- **WHEN** a write raises
- **AND** no row it targeted was written
- **THEN** no cached read is invalidated
