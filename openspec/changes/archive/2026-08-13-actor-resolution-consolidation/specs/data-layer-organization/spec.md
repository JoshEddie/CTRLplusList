## MODIFIED Requirements

### Requirement: `lib/data/` SHALL NOT import from `app/**`

Dependency direction SHALL stay unidirectional: modules under `lib/data/` SHALL NOT import from `app/**`. Within `lib/data/`, `*.actions.ts` modules MAY import any domain's read or internal module (e.g. `item.actions.ts` importing `getUserIdByEmail` from `user.ts`, `ItemSchema` from `item.schema.ts`, and the sync helpers from `item.associations.ts`), and read modules MAY import each other (e.g. `item.ts` importing `sanitizePurchases` from `purchase.ts`, `visit.ts` importing `withVisibility` from `list.ts`); the shared session-resolution helper `authedUserId` is exported from the internal module `lib/data/user.session.ts` for **server-side callers generally** — the action modules and their private helpers, and route handlers under `app/api/**` (it imports `@/lib/auth`, which initializes NextAuth at module scope — keeping it out of `user.ts` keeps read modules free of that side effect).

A route handler importing `authedUserId` runs the permitted direction (`app/**` → `lib/data/**`) and is not an exception to the dependency rule, which constrains only the reverse. The requirement that identity-gating endpoints use this helper rather than reimplementing the lookup is owned by `server-endpoint-authorization`; this requirement owns only where the helper lives and who may import it.

#### Scenario: No app imports inside the data layer

- **WHEN** the import specifiers of every module under `lib/data/` are inspected
- **THEN** none resolves into `app/**`

#### Scenario: Cross-domain read import is permitted

- **WHEN** `lib/data/item.actions.ts` needs the session user's id, or `lib/data/item.ts` needs the purchase-spoiler projection
- **THEN** the former imports `getUserIdByEmail` from `@/lib/data/user` (or `authedUserId` from `@/lib/data/user.session`) and the latter imports `sanitizePurchases` from `@/lib/data/purchase`, rather than duplicating the logic

#### Scenario: Route handler imports the session-resolution helper

- **WHEN** a route handler under `app/api/**` needs the acting user's id
- **THEN** it imports `authedUserId` from `@/lib/data/user.session` rather than duplicating the lookup, and this import is not flagged as a dependency-direction violation
