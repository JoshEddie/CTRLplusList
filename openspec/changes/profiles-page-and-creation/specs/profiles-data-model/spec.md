## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Local-mode seed covers both profile kinds

The dev seed SHALL produce, idempotently: a self-profile with `self` membership for every seeded user (via the same invariant the backfill guarantees), one managed profile with the primary test viewer as `owner` and one other seeded user as `manager`, every shipped preferences catalog row, and no per-profile preference values. The catalog rows are seeded rather than inherited: the local and e2e databases are provisioned by `drizzle-kit push` straight from the schema, which creates tables and replays no migration data, so a catalog row a migration inserts on Neon reaches them only through the seed. Every seeded profile therefore renders the accent fallback. `db:reset:dev` SHALL wipe every profile a seeded user holds any membership on — membership is the sole handle, because a profile carries no account reference — before reseeding, with membership and preference rows following by cascade. The wipe SHALL precede the seeded-user delete, which cascades those memberships away and would otherwise strand every profile behind them. The local-mode session layer SHALL read a `BYPASS_ACTIVE_PROFILE` environment variable as a dormant seam — accepted and exposed, consumed by nothing until active-profile resolution exists.

#### Scenario: Seeded managed profile with both roles

- **WHEN** the dev seed completes
- **THEN** one managed profile exists with an `owner` membership for the test viewer and a `manager` membership for another seeded user

#### Scenario: Seeded profiles carry no accent

- **WHEN** the dev seed completes
- **THEN** the preferences catalog holds the `accent` row
- **AND** the per-profile values table holds no rows, so every seeded profile renders the fallback

#### Scenario: Reset wipes profile state

- **WHEN** `db:reset:dev` runs against a database holding seeded self-profiles, the seeded managed profile, and a profile created by hand carrying a seeded user's membership
- **THEN** all three are gone, along with their membership and preference rows
- **AND** the seed's own profile fixtures are recreated deterministically

## REMOVED Requirements

### Requirement: Minted profile ids SHALL carry no account id

**Reason**: Never spec material. Its scenario asserted a minted id is "opaque" — nothing a caller can observe — and that it "contains no account's id", a negative substring check against a random string that passes for reasons unrelated to correctness. This change makes the requirement's own scoping sentence false by adding a third minting path, so it is ruled rather than carried forward.

**Migration**: Nothing to rehome. "Profiles are first-class rows independent of accounts" already holds that the `profiles` table carries no reference to the accounts table, and an id derived from an account id is such a reference. Beyond that the rule needs no statement. The fixture carve-out for the seed's `self-<account id>` helper goes with it, having existed only to exempt the seed from this requirement.

### Requirement: Profile preferences are normalized against a catalog

**Reason**: Its only scenario asserted a point-in-time migration snapshot — that both preference tables contain no rows once the phase-1 migration completes — rather than behavior any caller can rely on. This change writes the catalog's first row, and once a later migration inserts one, the phase-1 end state is no longer independently observable on a fresh database, so the scenario can never be re-verified. Its durable content (the catalog and values table shapes, the cascade rules, and the rule that a feature introducing a preference owns its catalog row) was never the part that went stale.

**Migration**: Replaced by "Per-profile preference values SHALL be normalized against a catalog", which carries that durable content forward with scenarios asserting cascade behavior, referential rejection of an uncatalogued preference, and an accent value storing and reading back. Nothing that consumed the removed requirement changes: the table shapes and cascade rules are identical, and "ships empty" is now stated where it belongs — as the scope of the phase-1 migration in that change's own history, not as a standing contract.
