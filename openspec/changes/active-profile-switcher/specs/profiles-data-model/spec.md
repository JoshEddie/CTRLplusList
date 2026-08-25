## MODIFIED Requirements

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
