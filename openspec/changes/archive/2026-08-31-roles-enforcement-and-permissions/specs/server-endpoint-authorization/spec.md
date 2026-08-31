## MODIFIED Requirements

### Requirement: A profile-scoped write SHALL re-verify membership on the profile it acts as

Every write that creates or mutates content owned by a profile SHALL confirm, server-side, that the acting account holds a membership on the profile the request acts as **in a role that meets the floor the write declares**, before any row is written. The check SHALL run against current membership rows at the time of the write, not against anything carried with the request.

The check SHALL be a single shared gate rather than re-implemented per endpoint, so that a write added later cannot omit it and so that the acted-as recording `active-profile` requires has one place to happen.

The gate SHALL take the required role floor as an argument with no default value, so a write added later must state where it sits rather than inherit admission from the gate's shape. `profile-permissions` owns which floors exist and which writes take which.

Three kinds of write do not pass this gate. The first two SHALL apply the same floor inside their own authorization helper instead. A write **unauthenticated callers can also reach** cannot pass it, since the gate has no answer for a caller with no membership at all. A write **addressed to a profile the request names rather than acts as** — the profile's own identity and its membership — SHALL NOT pass it either: the gate's contract is the acting-profile comparison, and these writes are performed from a surface reached without switching to the profile they administer, so that comparison would refuse the profile's own owner. Neither of those two widens anything: both still refuse an actor whose membership on the profile in question is below the floor.

The third is different in kind and SHALL remain the only one of its kind. A write that **admits an account to a profile** cannot re-verify a membership, because the actor holds none on that profile — that is what it is being granted. Such a write SHALL authorize on a single-use capability the request carries instead, whose terms were fixed by an owner-floor act at the time it was minted; `profile-permissions` owns those terms. No other write SHALL authorize on possession of a value carried in the request, and this one SHALL grant nothing beyond a membership row: it SHALL NOT alter a membership that already exists, so it can never be a route to a role its holder is not entitled to.

A failed check SHALL reject with `error: 'Forbidden'` and SHALL perform no database write.

Holding a membership SHALL NOT, by itself, authorize a write against a profile: it makes that profile *selectable* as the active profile. The ownership comparison a mutation must pass is unchanged — the row's owning profile against the profile the request acts as — so reaching another profile's content requires acting as it, and an account's other memberships SHALL NOT widen what the current request may touch. The role floor is consulted after that comparison and narrows it further; it never substitutes for it.

#### Scenario: A write as a held profile passes the gate

- **WHEN** a viewer acting as a profile they hold an `owner` membership on creates content for it
- **THEN** the membership check passes and the row is written with that profile as owner

#### Scenario: A write as an unheld profile is rejected

- **WHEN** the active profile cannot be verified against a current membership at the moment of the write
- **THEN** the action returns `error: 'Forbidden'` and no database write occurs

#### Scenario: Another membership does not widen the current request

- **WHEN** a viewer who holds memberships on profiles A and B, acting as A, attempts to mutate a row owned by B
- **THEN** the ownership comparison fails and the action returns `error: 'Forbidden'`, notwithstanding their membership on B

#### Scenario: The gate is one shared path

- **WHEN** the profile-scoped write endpoints are inspected
- **THEN** each reaches its membership check through the same shared gate, and none re-implements the comparison locally

#### Scenario: A held membership below the declared floor is rejected

- **WHEN** a viewer acting as a profile they hold a `manager` membership on invokes a write whose declared floor is `owner`
- **THEN** the action returns `error: 'Forbidden'` and no database write occurs

#### Scenario: Every gated write names its floor

- **WHEN** the profile-scoped write endpoints are inspected
- **THEN** each passes an explicit role floor to the shared gate, and none relies on a default

#### Scenario: A write addressed to a named profile bypasses the gate but not the floor

- **WHEN** an account holding `owner` on a profile administers that profile's membership while acting as a different profile they hold
- **THEN** the write proceeds without the gate's acting-profile comparison, having checked the `owner` floor against their membership on the named profile

#### Scenario: The named-profile path still refuses a role below the floor

- **WHEN** an account holding `manager` on a profile invokes a membership or identity write against it, whatever profile they are acting as
- **THEN** the action returns `error: 'Forbidden'` and no database write occurs


#### Scenario: An admission write authorizes on a capability, not a membership

- **WHEN** an account holding no membership on a profile redeems a valid single-use invite to it
- **THEN** the write proceeds without any membership check, because the capability the request carries is the authorization

#### Scenario: The capability exemption cannot re-role a sitting member

- **WHEN** an account that already holds a membership on the profile presents a capability naming a different role
- **THEN** the existing membership row is unchanged

#### Scenario: No other write reads authorization off the request

- **WHEN** the profile-scoped write endpoints are inspected
- **THEN** only the admission write authorizes on a value carried in the request, and every other one resolves a current membership row
