# Acceptance — profiles-page-and-creation

<!-- Given/When/(And…)/Then user-journey flows for this change.
     One atom per row: a single action or a single assertion. A When is one
     action by the chain's root actor, carrying that actor's literal handle;
     a Then asserts what the execution emitted. Stages in strict order of
     appearance — any stage recurring after a later one (When after Then,
     Given after When) = a new flow; split it.
     Drafted at propose time by chaining the change's scenarios onto
     pre-existing canonical-spec links; refined at apply time with literal
     handles (real button text, real routes) — refine, not rewrite.
     While any finding stands, no flows are written and this file does not
     exist.
     Contract: the acceptance artifact instruction in schema.yaml. -->

## Flows

### Flow: A viewer reaches Profiles from the avatar popover

- **Given** an authenticated viewer
- **And** six profiles exist
- **And** the viewer holds `self` on one of them
- **And** the viewer holds `owner` on two of them
- **And** the viewer holds `manager` on two of them
- **And** the viewer holds no membership on the sixth
- **When** the viewer clicks the `User menu` avatar trigger in the app frame
- **And** clicks `Profiles` in the popover
- **Then** the browser navigates to `/profiles`
- **And** five cards render, one for each membership the viewer holds
- **And** no card renders for the sixth profile
- **And** the `self` profile's card is first
- **And** the two `owner` profiles' cards follow, in ascending name order
- **And** the two `manager` profiles' cards are last, in ascending name order
- **And** no empty state is rendered

### Flow: A viewer who runs no managed profiles still lands on a populated page

- **Given** an authenticated viewer
- **And** three profiles exist
- **And** the viewer holds `self` on one of them
- **And** the viewer holds no membership on the other two
- **When** the viewer opens `/profiles`
- **Then** exactly one card renders, for the profile the viewer holds `self` on
- **And** no card renders for the other two profiles
- **And** no empty state is rendered

### Flow: A viewer reads the role each card names

- **Given** an authenticated viewer
- **And** three profiles exist
- **And** the viewer holds `self` on the first
- **And** the viewer holds `owner` on the second
- **And** the viewer holds `manager` on the third
- **When** the viewer opens `/profiles`
- **Then** three cards render
- **And** the first profile's card labels the role `You`
- **And** the second profile's card labels the role `Owner`
- **And** the third profile's card labels the role `Manager`

### Flow: A viewer reads a card's counts

- **Given** an authenticated viewer
- **And** the viewer holds a membership on a profile
- **And** that profile owns three lists — one private, one unlisted, one shared
- **And** that profile owns five items, two of which carry an archive timestamp
- **When** the viewer opens `/profiles`
- **Then** that profile's card reports 3 lists
- **And** that profile's card reports 3 items

### Flow: A viewer tells two faceless cards apart

- **Given** an authenticated viewer
- **And** the viewer holds a membership on two profiles
- **And** the first profile's `tagline` column holds text
- **And** the second profile's `tagline` column is NULL
- **When** the viewer opens `/profiles`
- **Then** the first profile's card renders its tagline text
- **And** the second profile's card renders an empty tagline line, holding the row's baseline
- **And** the second profile's card renders no placeholder element beside it
- **And** each card renders its profile's name
- **And** each card renders its profile's avatar slot, filled with its initials
- **And** each card renders its profile's accent
- **And** the viewer's own card is marked as the active profile
- **And** no other card is marked active

### Flow: A viewer clicks a card and nothing happens

- **Given** an authenticated viewer
- **And** the viewer is on `/profiles`
- **When** the viewer clicks a card anywhere outside its `⋯` menu
- **Then** no navigation occurs

### Flow: An owner opens a profile's space from its card

- **Given** an authenticated viewer
- **And** the viewer holds `owner` on a profile
- **And** that profile's `tagline` column holds text
- **When** the viewer opens that profile's card `⋯` menu and activates its `Edit <name>` row
- **Then** the browser navigates to `/profiles/<id>`
- **And** the identity header renders the profile's name
- **And** the identity header renders the profile's avatar slot, filled with its initials
- **And** the identity header renders the profile's tagline
- **And** the identity header renders the profile's accent
- **And** the Settings form's `Name` field is editable
- **And** the Settings form's `Tagline` field is editable
- **And** the Settings form's `Accent` swatches are editable
- **And** the `Save Changes` control is present

### Flow: An owner changes a profile's identity

- **Given** an authenticated viewer
- **And** the viewer holds `owner` on a profile
- **And** that profile's `tagline` column holds text
- **And** that profile has a stored accent
- **When** the viewer opens `/profiles/<id>`
- **And** changes the `Name` field
- **And** changes the `Tagline` field
- **And** selects a different `Accent` swatch
- **And** activates `Save Changes`
- **Then** the profile's `name` column holds the submitted name
- **And** the profile's `tagline` column holds the submitted tagline
- **And** the profile's `accent` preference value holds the selected preset name
- **And** a subsequent read of the profile returns the submitted values, not the previous ones

### Flow: A member renames their own self-profile

- **Given** an authenticated viewer
- **And** the viewer holds `self` on their own profile
- **When** the viewer submits a changed `Name` on `/profiles/<id>` via `Save Changes`
- **Then** the profile's `name` column holds the submitted name
- **And** no account record is written

### Flow: A viewer clears a tagline

- **Given** an authenticated viewer
- **And** the viewer holds `owner` on a profile
- **And** that profile's `tagline` column holds text
- **When** the viewer activates `Save Changes` with a whitespace-only `Tagline`
- **Then** the persisted `tagline` column is SQL `NULL`, not an empty string
- **And** that profile's card renders an empty tagline line, holding the row's baseline
- **And** that profile's card renders no placeholder element beside it
- **And** that profile's identity header renders no tagline node

### Flow: A viewer overruns the tagline cap

- **Given** an authenticated viewer
- **And** the viewer holds `owner` on a profile
- **And** that profile's `tagline` column holds text
- **When** the viewer activates `Save Changes` with a 41-character `Tagline`
- **Then** validation fails with a field error on `tagline`
- **And** the `tagline` column still holds its previous value

### Flow: A manager opens a profile's space

- **Given** an authenticated viewer
- **And** the viewer holds `manager` on a profile
- **When** the viewer opens `/profiles/<id>`
- **Then** the space renders its identity header
- **And** the Settings form's `Name` field is disabled
- **And** the Settings form's `Tagline` field is disabled
- **And** the Settings form's `Accent` swatches are disabled
- **And** no `Save Changes` control is present

### Flow: A manager submits the update action anyway

- **Given** an authenticated viewer
- **And** the viewer holds `manager` on a profile
- **When** the viewer POSTs a changed name for that profile to the profile-update action
- **Then** the action returns `Unauthorized`
- **And** no column is written
- **And** no preference row is written

### Flow: A non-member reaches for a profile they do not run

- **Given** an authenticated viewer
- **And** the viewer holds no membership on a profile
- **When** the viewer requests `/profiles/<id>`
- **And** POSTs a changed name for that profile to the profile-update action
- **Then** the request for the space redirects to `/profiles`
- **And** the action returns `Unauthorized`
- **And** no write occurs

### Flow: A viewer requests a profile id that does not exist

- **Given** an authenticated viewer
- **And** a profile id that no row carries
- **When** the viewer requests `/profiles/<id>` for that id
- **Then** the response is identical to the one the same viewer receives for a profile they hold no membership on

### Flow: A signed-out visitor requests the Profiles page

- **Given** a request carrying no session
- **When** it requests `/profiles`
- **Then** the request redirects to `/`
- **And** no profile is rendered

### Flow: A signed-out visitor requests a profile's space

- **Given** a request carrying no session
- **When** it requests `/profiles/<id>`
- **Then** the request redirects to `/`
- **And** no profile is rendered

### Flow: A viewer gives birth to a managed profile

- **Given** an authenticated viewer
- **And** the viewer is on `/profiles`
- **When** the viewer activates `New Profile` in the page header
- **And** enters a `Name`
- **And** enters a `Tagline`
- **And** selects an `Accent` swatch
- **And** activates `Create Profile`
- **Then** a `profiles` row exists carrying the submitted name
- **And** that row's `tagline` column holds the submitted tagline
- **And** exactly one membership row references that profile
- **And** that membership row's role is `owner`
- **And** that membership row is held by the creating account
- **And** no `self` membership references that profile
- **And** a preference row holds the selected accent
- **And** the browser navigates to `/profiles/<new id>`
- **And** no success toast is raised

### Flow: A viewer accepts the accent the form offers

- **Given** an authenticated viewer
- **And** the birth overlay is open
- **And** one preset is preselected
- **When** the viewer enters a valid name
- **And** activates `Create Profile` without changing the accent
- **Then** a preference row holds the preselected accent
- **And** the new profile's card on `/profiles` renders it

### Flow: An owner gives their self-profile an accent

- **Given** an authenticated viewer
- **And** their self-profile carries no stored accent
- **When** the viewer opens `/profiles/<id>`
- **Then** one preset is selected in the Settings form's `Accent` swatches
- **And** no preference row exists for the profile

### Flow: A viewer submits a name outside the accepted length

- **Given** an authenticated viewer
- **And** the birth overlay is open
- **When** the viewer activates `Create Profile` with a whitespace-only `Name`
- **And** re-activates it with a 61-character `Name`
- **Then** each submission fails validation with a field error on `name`
- **And** no `profiles` row is written

### Flow: A creation fails while the viewer is watching

- **Given** an authenticated viewer
- **And** the birth overlay is open
- **And** the creation action returns a failure
- **When** the viewer activates `Create Profile` with a valid `Name`
- **Then** the overlay stays mounted
- **And** the returned message renders inline in the overlay
- **And** a failure toast is raised
- **And** no navigation occurs

### Flow: An account creates two profiles with the same name

- **Given** an authenticated account
- **And** the account already owns a managed profile
- **When** the account creates a second managed profile carrying that same name
- **Then** two distinct `profiles` rows carry that name
- **And** each carries its own `owner` membership held by that account

### Flow: A creation loses its membership write

- **Given** an authenticated account
- **And** a managed-profile creation whose membership row is not written
- **When** the account activates `Create Profile`
- **Then** no `profiles` row for the submitted name remains

### Flow: The owner migrates the database

- **Given** a database at the migration head preceding this change
- **And** `profiles` has no `tagline` column
- **And** the preferences catalog carries no `accent` row
- **When** the owner runs `npm run db:migrate`
- **Then** the command exits 0
- **And** `profiles.tagline` exists as a nullable text column
- **And** every pre-existing `profiles` row's `tagline` is NULL
- **And** the preferences catalog holds one row with id `accent`, name `Accent color` and type `text`
- **And** the per-profile preference values table holds no rows

### Flow: A value is written for a preference no feature introduced

- **Given** a preferences catalog whose only row is `accent`
- **When** a per-profile value row is written naming a preference identifier the catalog does not carry
- **Then** the database rejects the write

### Flow: A profile holding preference values is deleted

- **Given** a profile holding a stored `accent` value
- **When** that profile row is deleted
- **Then** the per-profile preference values table holds no row for that profile
