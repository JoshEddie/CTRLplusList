## MODIFIED Requirements

### Requirement: Auth bypass SHALL be governed by `USE_PG_DRIVER`, with session identity selected independently

Real Google OAuth and the existence of a session are separate concerns. Whether auth is **bypassed** (real OAuth off, sessions synthesized) SHALL be governed by `USE_PG_DRIVER === '1'` — the same flag that selects the local DB — and SHALL NOT depend on `NODE_ENV` (so a production build via `next start` can still run bypassed locally). The previous `AUTH_BYPASS` flag and the `NODE_ENV !== 'production'` condition SHALL be removed. **Which** session a zero-argument `auth()` returns SHALL be chosen by a separate identity selector (a seeded user id, or the literal value meaning "no session"); the selector SHALL accept any seeded user id rather than being fixed to one identity. When the selector is unset the default identity SHALL be the seeded test viewer (`dev-test-viewer`), preserving the prior preview behavior. The production safety guarantee SHALL be the `USE_PG_DRIVER` localhost boot guard (above), NOT a `NODE_ENV` check. Route-handler / middleware `auth(req, ctx)` overloads SHALL continue to pass through to real NextAuth. This complements — and does not restate — the existing "NextAuth is not invoked against real Google" requirement, which remains the owner of the no-real-OAuth constraint.

A synthesized session SHALL carry every field the application's own actor resolution reads, for **every** seeded identity and not only the default. A session that resolves to no actor is indistinguishable from being logged out, so an identity synthesized without those fields would silently fail the promise above rather than serve a different seeded user. Display fields beyond that minimum remain the concern of the flow that introduces an identity.

#### Scenario: Bypass active, identity unset, yields the default viewer session

- **WHEN** a server component calls zero-argument `auth()` with `USE_PG_DRIVER=1` and the identity selector unset
- **THEN** the returned session is the synthesized `dev-test-viewer` session
- **AND** no Google OAuth handshake occurs

#### Scenario: Bypass active, identity set to guest, yields no session

- **WHEN** a server component calls zero-argument `auth()` with `USE_PG_DRIVER=1` and the identity selector set to the guest value
- **THEN** `auth()` resolves to `null` (a logged-out request)

#### Scenario: Identity selector is not fixed to a single user

- **WHEN** the identity selector names a seeded user id other than the default
- **THEN** the synthesized session represents that user id
- **AND** the harness does not require code changes to support an additional seeded identity

#### Scenario: A non-default identity resolves an actor

- **WHEN** the identity selector names a seeded user id other than the default, and a server component resolves the acting account from that session
- **THEN** it resolves to that seeded account rather than to nothing

#### Scenario: Deployed configuration keeps real auth

- **WHEN** the app runs with `USE_PG_DRIVER` unset
- **THEN** zero-argument `auth()` delegates to real NextAuth and the bypass is inert
- **AND** this holds regardless of any other environment variable
