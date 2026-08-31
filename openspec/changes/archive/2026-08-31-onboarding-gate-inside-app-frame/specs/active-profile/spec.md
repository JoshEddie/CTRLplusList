## MODIFIED Requirements

### Requirement: The active profile SHALL be a membership the viewer holds, re-verified on every resolution

Every authenticated request that can resolve an active profile SHALL resolve one — the profile that request acts as. The active profile SHALL be one the viewer holds a `self`, `owner`, or `manager` membership on. Membership SHALL be re-verified server-side on every resolution, against the viewer's current memberships, rather than trusted from whatever carried the selection.

A selection that cannot be honoured SHALL resolve to the viewer's self-profile. This SHALL apply to every cause without distinguishing between them: no selection stored, a selection naming a profile the viewer holds no membership on, a selection naming a profile that no longer exists, and a selection naming an id that never existed. A viewer who holds a self-profile therefore always acts as some profile, and never acts as one they do not run.

An account holding no membership at all resolves no active profile, because the self-profile every other cause falls back to does not yet exist. This is the account that has not passed `onboarding-gate`, and it is the only such case: the gate stands in front of every page, so no page renders for it and no content can be created or owned by it. Surfaces that render for such an account regardless — the frame's own chrome — SHALL treat the absence as the absence of a profile, and SHALL NOT substitute the account for one.

Resolution SHALL be request-scoped, so repeated resolution within one request costs no additional query.

#### Scenario: A held membership resolves as the active profile

- **WHEN** a viewer whose stored selection names a profile they hold an `owner` membership on issues a request
- **THEN** the active profile is that profile

#### Scenario: A revoked membership falls back to self

- **WHEN** a viewer's membership on the profile named by their stored selection has been removed, and they issue a request
- **THEN** the active profile is their self-profile, and the request proceeds with no error

#### Scenario: A forged selection grants no reach

- **WHEN** a request arrives carrying a selection naming a profile the viewer holds no membership on
- **THEN** the active profile is their self-profile, and no read or write is performed against the named profile

#### Scenario: An absent selection resolves to self

- **WHEN** a viewer who has never switched issues a request
- **THEN** the active profile is their self-profile

#### Scenario: An account holding no membership resolves no active profile

- **WHEN** an authenticated account holding no membership issues a request
- **THEN** no active profile resolves, and no profile-scoped read or write is performed
