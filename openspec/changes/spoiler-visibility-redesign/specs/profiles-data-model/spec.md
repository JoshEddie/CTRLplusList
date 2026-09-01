## MODIFIED Requirements

### Requirement: Profile membership carries role and ride-along

The database SHALL record who runs each profile in a membership table keyed by (user, profile), where each row carries a role — exactly one of `self`, `owner`, or `manager` (database-enforced) — a ride-along flag defaulting to false, a nullable timestamp recording when that account last acted as that profile, and `created_at`. Membership rows SHALL cascade away when their user or their profile is deleted, taking the last-acted-as timestamp with them, so no record of a revoked membership's use survives it. The phase-1 backfill SHALL create a `self`-role membership row linking each account to its self-profile, so "profiles this user runs" is answerable from membership containment alone.

The last-acted-as timestamp SHALL be added without a backfill: NULL is the correct value for a membership never acted as, and `active-profile` defines when it is written and how it orders. It is a property of the (account, profile) pair rather than of the profile, so it is a membership column rather than a per-profile preference.

The membership row SHALL NOT carry the account's spoiler baseline. The baseline is a per-member **preference**, stored in the preferences values table keyed by (profile, account) per the requirement below, so that it shares one home and one shape with the profile-wide default that seeds it and with any future per-member preference.

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

The database SHALL hold a preferences catalog (stable text identifier as key, plus name and type) and a values table keyed by (profile, **account**, preference) referencing the catalog, where **account is nullable**: a row with a null account is the **profile-wide** value for that preference, and a row with an account set is **that account's own** value, meaningful only for an account holding a membership on the profile. Values are stored as text.

Value rows SHALL cascade away when their profile or their catalog entry is deleted, and an account-keyed row SHALL additionally cascade when its account is deleted. An account-keyed row SHALL be deleted when that account's membership on the profile is **revoked**: unlike a `profile_members` column it does not cascade with the membership, so the revocation action SHALL delete the account's value rows on that profile explicitly, leaving no record of a revoked member's preferences.

A catalog row is owned by the feature that introduces the preference it names: no capability defines a catalog row for a preference it does not consume, and a feature adding one adds it as part of its own migration. This capability owns exactly one catalog row — `accent`, name "Accent color", type `text` — introduced by the profile accent. Its per-profile value is the NAME of a palette preset; what that name renders as is owned by `profiles-surface`. A name rather than colours: the palette holds what each name paints, so re-branding is a palette edit and no stored row is rewritten. A per-member preference such as the spoiler tier is owned by its own capability (`spoiler-visibility`) and reaches per-member scope through the account key this requirement adds, not through a new column.

A catalog row SHALL NOT be deleted once shipped: value rows reference it, and removing it discards them by cascade.

#### Scenario: An accent value stores against its catalog entry and reads back

- **WHEN** an accent is stored for a profile
- **THEN** the values table holds one row for that profile keyed to `accent` with a null account, and reads return the stored preset name

#### Scenario: A profile-wide value uses a null account

- **WHEN** a preference's profile-wide value is stored
- **THEN** its row carries a null account, and it is read as the value governing the profile absent any member-specific row

#### Scenario: A per-member value stores against its account

- **WHEN** an account holding a membership stores its own value for a per-member preference
- **THEN** the values table holds a row keyed to that (profile, account, preference), distinct from the profile-wide null-account row

#### Scenario: A value naming no catalog entry is rejected

- **WHEN** a value row is written naming a preference identifier the catalog does not carry
- **THEN** the database rejects it

#### Scenario: Deleting a profile discards its preference values

- **WHEN** a profile holding preference values is deleted
- **THEN** its rows in the values table are gone, both profile-wide and per-member

#### Scenario: Revoking a membership discards that account's preference values

- **WHEN** an account's membership on a profile is revoked
- **THEN** that account's account-keyed value rows on that profile are gone
- **AND** the profile-wide null-account rows are unchanged

#### Scenario: Value rows follow their catalog entry

- **WHEN** a catalog entry is deleted
- **THEN** every value row referencing it is gone
