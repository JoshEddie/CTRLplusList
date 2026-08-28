## ADDED Requirements

### Requirement: A self-profile SHALL be minted by onboarding, not by account creation

Creating an account SHALL NOT create a profile. The account's self-profile and its `self` membership row SHALL be written by the onboarding submit `onboarding-gate` owns, which is the first point at which a human can supply the name a profile cannot exist without.

Between sign-in and that submit an account holds no profile, and actor resolution SHALL yield nothing for it. This is the whole of the enforcement: with no profile there is nothing to own a list or an item, so no endpoint carries an onboarding check and none is to be added.

Minting SHALL be idempotent, resting on the self-role uniqueness constraint rather than on an id a caller can re-derive, so a repeated submit neither duplicates nor fails. The profile id SHALL be minted opaquely.

Minting SHALL be atomic across both rows. Because the profile row must exist before the membership row that references it, and no interactive transaction is available, a mint that loses the uniqueness race SHALL leave no profile row behind — an unreferenced profile is unreachable and permanent, and nothing would later collect it.

The phase-1 backfill remains the sole source of self-profiles for accounts that existed when it ran; it is a point-in-time pass, and every account created after it reaches its profile through onboarding.

#### Scenario: A new account holds no profile until it onboards

- **WHEN** an account is created through the authentication provider
- **THEN** no profile row and no membership row exist for it

#### Scenario: An account with no profile resolves no actor

- **WHEN** an authenticated request is made by an account holding no `self` membership
- **THEN** actor resolution yields nothing, and no profile-scoped read or write can proceed

#### Scenario: The onboarding submit mints both rows

- **WHEN** an account with no profile completes the onboarding submit with a name
- **THEN** a profile row carrying that name exists
- **AND** a membership row with role `self` links the account to it

#### Scenario: Minting is idempotent against an existing self-profile

- **WHEN** the mint runs for an account that already holds a self-profile
- **THEN** no duplicate profile or membership row is created and no error surfaces

#### Scenario: A losing mint attempt leaves no orphan profile

- **WHEN** two mint attempts for the same account race, and one loses the self-role uniqueness constraint
- **THEN** the losing attempt leaves no profile row behind, and exactly one profile with one `self` membership exists

## MODIFIED Requirements

### Requirement: Each account has exactly one self-profile

The database SHALL enforce that an account holds at most one `self` membership, and that a profile is the subject of at most one `self` membership — partial unique constraints over the membership table restricted to the `self` role, one in each direction. The phase-1 migration SHALL backfill one self-profile per existing account, named from the account's name — or `UNTITLED` when the account carries no name — idempotently, so re-running the backfill creates no duplicates. The constraints SHALL NOT bound how many managed profiles an account can own or manage.

Both directions are load-bearing. The account-side constraint is the "one self-profile per account" invariant; the profile-side constraint is what makes a self-profile resolve back to exactly one human, which `claim-attribution` relies on when it recovers the person behind a claim asserter.

`UNTITLED` is a placeholder sentinel, not a display name: no code reads it, and no sweep replaces it. It is retired one account at a time by `onboarding-gate`, which every account holding one passes through before it can use the app and which requires a real name to leave.

#### Scenario: Backfill is idempotent

- **WHEN** the self-profile backfill runs against a database where some or all accounts already have self-profiles
- **THEN** every account ends with exactly one self-profile and no run fails or duplicates

#### Scenario: Nameless account gets the placeholder sentinel

- **WHEN** the backfill runs for an account whose `name` is null
- **THEN** its self-profile is created with the name `UNTITLED`

#### Scenario: The sentinel is replaced by onboarding, not by a sweep

- **WHEN** an account whose self-profile is named `UNTITLED` completes onboarding with a name
- **THEN** that profile carries the submitted name
- **AND** no migration or background pass rewrote it

#### Scenario: Second self-profile rejected

- **WHEN** an insert attempts a second `self` membership row for an account that already holds one
- **THEN** the database rejects it

#### Scenario: Second account claiming one self-profile rejected

- **WHEN** an insert attempts a `self` membership row naming a profile that is already some account's self-profile
- **THEN** the database rejects it

### Requirement: Managed-profile creation SHALL mint the profile and its creator's owner membership together

Creating a managed profile SHALL write a `profiles` row and a membership row giving the creating account the `owner` role on it, and SHALL NOT write a `self` membership — the absence of a `self` membership is what makes the profile managed.

Creation SHALL be atomic across both rows: because the profile row must exist before the membership row that references it, and no interactive transaction is available, a creation that fails to write the membership SHALL leave no profile row behind — an unreferenced managed profile is unreachable and permanent, since membership is the only handle onto a profile.

Unlike self-profile creation, managed-profile creation SHALL NOT be idempotent and SHALL NOT swallow a uniqueness violation: nothing constrains how many managed profiles an account may own, and two creations with the same name are two distinct profiles.

Creation SHALL also write the profile's accent preference and its Altvatar art. Neither write is atomic with the other two: a profile written without its membership row is unreachable by anyone and permanent, while a profile written without its accent or its art simply renders the fallback each of those has — a state this capability's siblings already define, and one an owner corrects by editing the profile.

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

#### Scenario: A created managed profile carries stored Altvatar art

- **WHEN** an account creates a managed profile
- **THEN** an Altvatar row exists for it

#### Scenario: A failed accent write still leaves the profile

- **WHEN** the profile and membership rows are written
- **AND** the accent write fails
- **THEN** the profile is created

#### Scenario: A failed art write still leaves the profile

- **WHEN** the profile and membership rows are written
- **AND** the Altvatar write fails
- **THEN** the profile is created

### Requirement: Local-mode seed covers both profile kinds

The dev seed SHALL produce, idempotently: a self-profile with `self` membership for every seeded user that is meant to be onboarded, one managed profile with the primary test viewer as `owner` and one other seeded user as `manager`, a second managed profile on which the primary test viewer is `manager` rather than `owner`, and every shipped preferences catalog row. The primary test viewer therefore runs three profiles across all three roles, so a switchable set exists and the `manager` role — the one the membership floor admits and a later change narrows — is covered by a fixture rather than only by a unit test. The catalog rows are seeded rather than inherited: the local and e2e databases are provisioned by `drizzle-kit push` straight from the schema, which creates tables and replays no migration data, so a catalog row a migration inserts on Neon reaches them only through the seed.

Every seeded profile SHALL carry Altvatar art, except where a fixture below requires its absence. Art is what `onboarding-gate` reads to decide whether an account may use the app, so a seeded viewer whose self-profile had none would meet the gate on every local page instead of rendering it.

The seed SHALL cover every fill of the avatar disc at once: profiles carrying art across each shipped style, profiles carrying an accent and no art, and profiles carrying neither. Accent values SHALL therefore be seeded for the profiles that need one and withheld from the rest — a seed in which every profile has a face hides the fallbacks most real profiles start in, and one in which none does hides the art.

The seed SHALL additionally produce two accounts left deliberately un-onboarded, one for each population `onboarding-gate` distinguishes: one holding no membership at all, and one holding a self-profile whose Altvatar art is absent. Neither SHALL be the primary test viewer. They exist so both arms of the gate are previewable locally and drivable end-to-end without any new flag — the identity selector already accepts any seeded account.

The seeded memberships SHALL carry deterministic, distinct last-acted-as timestamps, far enough apart to order unambiguously, with at least one left NULL — so a switcher ordered most-recently-acted-as first is testable against a fixture that can distinguish a correct ordering from a broken one, and the never-acted-as branch has a fixture too.

`db:reset:dev` SHALL wipe every profile a seeded user holds any membership on — membership is the sole handle, because a profile carries no account reference — before reseeding, with membership, preference and Altvatar rows following by cascade. The wipe SHALL precede the seeded-user delete, which cascades those memberships away and would otherwise strand every profile behind them.

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
- **AND** at least one seeded profile holds no per-profile accent value, so the accent fallback stays reachable

#### Scenario: Every fill of the avatar disc has a seeded fixture

- **WHEN** the dev seed completes
- **THEN** at least one seeded profile carries art in each shipped style
- **AND** at least one carries an accent and no art
- **AND** at least one carries neither

#### Scenario: The primary test viewer is onboarded

- **WHEN** the dev seed completes
- **THEN** the primary test viewer's self-profile carries Altvatar art
- **AND** local pages render normally for it rather than raising the onboarding gate

#### Scenario: Both un-onboarded populations have a fixture

- **WHEN** the dev seed completes
- **THEN** one seeded account holds no membership at all
- **AND** another holds a self-profile carrying no Altvatar art
- **AND** neither is the primary test viewer

#### Scenario: Reset wipes profile state

- **WHEN** `db:reset:dev` runs against a database holding seeded self-profiles, the seeded managed profiles, and a profile created by hand carrying a seeded user's membership
- **THEN** all of them are gone, along with their membership, preference and Altvatar rows
- **AND** the seed's own profile fixtures are recreated deterministically, including both un-onboarded fixtures

## REMOVED Requirements

### Requirement: Every new account gets a self-profile at creation

**Reason**: A profile cannot exist without a name, and account creation is a point at which no human can be asked for one — which is why the requirement had to invent the `UNTITLED` sentinel it also declared was not a display name. Minting moves to the onboarding submit, where a name is supplied, and enforcement becomes structural: between sign-in and submit there is no profile, so nothing can own content and no per-endpoint guard is owed.

**Migration**: Replaced by **A self-profile SHALL be minted by onboarding, not by account creation**, added in this same delta, which carries forward the idempotency and no-orphan guarantees unchanged. Accounts that already hold a backfilled self-profile are unaffected; accounts created after this change hold none until they pass `onboarding-gate`, which every account must pass before it can use the app.
