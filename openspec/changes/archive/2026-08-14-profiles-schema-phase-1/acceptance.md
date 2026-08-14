# Acceptance — profiles-schema-phase-1

<!-- Given/When/(And…)/Then user-journey flows for this change.
     One atom per row: a single action or a single assertion. Stages in
     strict order of appearance — any stage recurring after a later one
     (When after Then, Given after When) = a new flow; split it.
     Drafted at propose time from the change's scenarios + pre-existing
     canonical-spec links; refined at apply time with literal handles
     (real button text, real routes) — refine, not rewrite.
     Contract: the acceptance artifact instruction in schema.yaml. -->

## Flows

### Flow: Owner applies phase 1 to a database holding existing data

- **Given** the Neon database on the pre-change schema, holding accounts, lists, and items
- **When** the owner runs `npm run db:migrate`
- **Then** the run completes with no error
- **And** every account has exactly one `profiles` row carrying its id in `user_id`
- **And** each of those rows carries its account's name in `profiles.name`
- **And** each of those rows has a `profile_members` row with role `self` on it
- **And** every pre-existing `items` row's `updated_by_user_id` equals its `user_id`
- **And** every pre-existing `lists` row's `updated_by_user_id` equals its `user_id`
- **And** `preferences` holds no rows
- **And** `profile_preferences` holds no rows
- **And** no pre-existing table, column, constraint, or index differs from before the run

### Flow: Owner re-runs the backfill

- **Given** the phase-1 migration already applied to the database
- **When** the owner executes the migration's backfill statements again
- **Then** the run completes with no error
- **And** every account still has exactly one self-profile
- **And** every account still has exactly one `self` membership row on it
- **And** no `items` or `lists` row's `updated_by_user_id` value changed

### Flow: A new account signs in for the first time

- **Given** the phase-1 migration applied to the database
- **And** a Google account that has never signed in to the app
- **When** that account completes Google sign-in
- **Then** the sign-in completes and lands on the app
- **And** one `profiles` row exists carrying that account's id in `user_id`
- **And** that row's `name` equals the account's name
- **And** one `profile_members` row with role `self` links that account to that profile
- **And** no profile name, profile switcher, or other profile control appears on the page

### Flow: An existing account signs in again

- **Given** an account that already holds its self-profile and `self` membership
- **When** that account signs out and signs in again
- **Then** the sign-in completes with no error
- **And** the account still holds exactly one self-profile
- **And** the account still holds exactly one `self` membership row on it

### Flow: Owner confirms the app is unchanged after migrating

- **Given** a local database brought up on the phase-1 schema
- **And** the dev server restarted
- **When** the owner opens `/lists/dev-list-viewer-birthday`
- **And** adds an item to the list
- **Then** the list and the new item render exactly as they did before the migration
- **And** no profile name, profile switcher, or other profile control appears on the page

### Flow: Owner seeds profile fixtures in local mode

- **Given** a local database on the phase-1 schema
- **When** the owner runs `npm run db:seed:dev`
- **Then** each of the 12 seeded users has one self-profile
- **And** each of those self-profiles has a `self` membership row for its user
- **And** the managed profile `dev-profile-kiddo` exists with `user_id` null
- **And** `dev-test-viewer` holds an `owner` membership on `dev-profile-kiddo`
- **And** `dev-friend-alice` holds a `manager` membership on `dev-profile-kiddo`
- **And** `profile_preferences` holds no rows

### Flow: Owner resets local profile state

- **Given** the seeded self-profiles and `dev-profile-kiddo` present in the local database
- **And** a hand-created profile carrying a `dev-test-viewer` membership
- **When** the owner runs `npm run db:reset:dev`
- **Then** the hand-created profile is gone
- **And** its membership rows are gone
- **And** `dev-profile-kiddo` exists again with `user_id` null and both its memberships
- **And** each seeded user has one self-profile again with its `self` membership
- **And** no profile with a null `user_id` other than `dev-profile-kiddo` remains

### Flow: Owner sets the dormant active-profile seam

- **Given** a local database holding the seeded profile fixtures
- **When** the owner sets `BYPASS_ACTIVE_PROFILE` to `dev-profile-kiddo` in the environment
- **And** starts the app with `npm run dev:local`
- **And** opens `/`
- **Then** the home digest renders as `dev-test-viewer`, identical to a run with the variable unset
- **And** no profile name and no profile switcher appears on the page

## No manual path — fully automated

- **Account deletion detaches, never deletes, the self-profile** — the app exposes no account-deletion surface, and no canonical spec defines one; the only account delete is `db:reset:dev`, which by design wipes profiles first.
- **User deletion removes their memberships but not the profiles** — same: no account-deletion surface to walk.
- **Mutator's account deleted nulls `updated_by_user_id`** — same, and no code writes the column this phase.
- **Second self-profile rejected** — database constraint; no UI path inserts a profile row.
- **Invalid role rejected** — database constraint; no UI path inserts a membership row.
- **Nameless account gets the `UNTITLED` sentinel** — for the backfill and for account creation alike: accounts are created only by the Google adapter, which always supplies a name, so no reachable path produces a null-name account.
- **Creation is idempotent against an existing self-profile** — `events.createUser` fires once per account by construction; no sign-in path re-runs it. Pinned by `db/__tests__/profiles.test.ts` driving the exported handler twice.
