## ADDED ADRs

### 2026-08-31-protection-follows-the-human-not-the-acting-profile

**Touching**: `DAL`, `DB Queries`

**Context**: `2026-08-25-the-active-profile-is-the-authorization-context` made ownership an equality against the acting profile, which correctly gates writes but leaves a human viewing a list owned by a profile they run — while acting as another — indistinguishable from a stranger. Spoiler hiding keyed off that same comparison, so the viewer's own household's claims rendered. Widening authorization to close it was rejected, because authorization by ambient attachment would make switching gate nothing.

**Decision**: Spoiler protection resolves from the viewer's **membership on the content's owning profile**, whatever profile the request acts as; authorization continues to resolve from equality against the acting profile. A person cannot be un-spoiled after the fact, so protection is a property of the human and travels with them across every switch. "May I write this?" and "may I see this?" take different keys and are answered separately.

**Consequences**: A viewer can be protected on content they hold no authority to write, and authorized over content they are protected from — both are correct, and neither implies the other. Any surface asking what a viewer may see must resolve membership rather than reuse the ownership comparison it already holds.

### 2026-08-31-passive-surfaces-protect-operated-surfaces-expose

**Touching**: `openspec/specs/spoiler-visibility/spec.md`

**Context**: Spoiler visibility reads as an access-control problem, and treating it as one turns every channel into a leak to be closed — a filter that narrows to claimed items, an action label that names claim state, a modal that lists claims. But the protected viewer is the same person operating those controls, and they can always reveal to themselves.

**Decision**: Spoiler protection guards against being spoiled **by accident**, not against a viewer who chooses to look. Passive surfaces — anything that renders without being asked for — respect the resolved state; anything the viewer deliberately operates may expose, and is owed no gate. An action-row label that states claim state is passive and governed even though it sits on a control, because the viewer did not ask for it by reading it.

**Consequences**: The purchase modal and the per-list spoiler control need no gating, and any future claim surface is classified by whether the viewer asked for it. A viewer can spoil themselves in a single deliberate act, which is intended behaviour rather than a defect.

### 2026-08-31-a-viewer-scoped-projection-lives-outside-the-cache

**Touching**: `DAL`, `DB Queries`

**Context**: The item reads project claim attribution inside `'use cache'`, which keys correctly only while the viewer-scoped input is a pure URL value — sourcing it from the database would key the cache on an input that can go stale without the read's tags firing. Moving the projection out collided with the requirement that rows be sanitized before escaping the data layer, and aggregates over the rows the projection strips cannot be computed after it has run.

**Decision**: A viewer-scoped projection runs **outside** the cache boundary, as an uncached exported read wrapping a cached raw one. The data-layer boundary, not the cached function, is what the projection must precede. The cached read holds one raw variant serving every viewer, and anything derived from un-projected rows is computed in the wrapper.

**Consequences**: Per-viewer cache fragmentation disappears wherever a read was keyed on viewer identity, and aggregates over data the viewer may not see become possible. Raw rows carrying names and ids now sit in the cache where projected ones did, so the cache store holds more than any single viewer is entitled to.

### 2026-08-31-a-per-membership-setting-is-seeded-not-inherited

**Touching**: `DB Schema`, `DAL`

**Context**: A per-member setting with a profile-level default can either leave the member value absent and inherit live, or write a concrete value when the membership is created. Live inheritance cannot distinguish a member who never chose from one who deliberately accepted the value offered to them, so an owner changing the default silently moves the second.

**Decision**: A per-membership setting is written **concretely when the membership is created**, seeded from the profile-level default as it stands at that moment. The default is a seed and never a parent: changing it moves nobody already a member, and existing members are changed one row at a time. A member value written under this capability is concrete; a value **absent** — a membership predating the capability — resolves to the fully protected default rather than falling through to the live profile value, so absence still never inherits.

**Consequences**: The profile-level control is honest about its own scope, and "what did this member actually choose" stays answerable. A profile-wide correction costs one write per member instead of one write. No backfill is owed for pre-existing members: an absent value resolves to the protected default until a row is written, which is the safe state for every membership.

### 2026-09-01-a-per-member-preference-is-an-account-keyed-preference-row

**Touching**: `DB Schema`, `DAL`

**Context**: A per-member value with a profile-level default needs a home. A column on `profile_members` holds it beside `role` and `ride_along`, but every future per-member preference would then cost another membership column, and the profile-level default would live in a different table (`profile_preferences`) from the member values it seeds — two shapes for one concept.

**Decision**: A per-member preference is stored in `profile_preferences`, whose key gains a **nullable account**: a row with a null account is the profile-wide value, a row with an account set is that member's value. The profile default and every member baseline are then the same row shape, and a new per-member preference is a new catalog id rather than a new column. This is orthogonal to seeding: `2026-08-31-a-per-membership-setting-is-seeded-not-inherited` still holds — the null-account row is read only to seed a written member row and never governs a member at resolution time.

**Consequences**: `profile_preferences` is no longer keyed by profile alone; a reader must qualify by account, and the profile-wide value is the null-account row rather than "the profile's only row for that key". A member's preference rows must be discarded when their membership is revoked — a `profile_members` cascade did this for free, but an account-keyed preference row does not cascade with the membership, so the revocation action deletes them explicitly.

### 2026-08-31-a-member-preference-is-a-setting-not-a-permission

**Touching**: `openspec/specs/profiles-surface/spec.md`

**Context**: A per-member value that an owner may also write looks at first as though it belongs with the roster in Permissions, which already carries per-member rows and an owner floor. Placing it there conflates what a member is allowed to do with what they have asked to see.

**Decision**: A member-scoped **preference** lives in the profile space's Settings panel, alongside the profile-level default that seeds it; Permissions carries roles, admission and removal only. Who may write a preference is a separate question from where it lives — an owner setting another member's preference does so from Settings.

**Consequences**: Settings holds controls governed by different rules than the name-and-tagline form beside them, so its role-gating is per control rather than per panel. Permissions stays readable as one subject.

## MODIFIED ADRs

_None._ `2026-08-25-the-active-profile-is-the-authorization-context` is unchanged: a reader following it still authorizes by equality against the acting profile, and the first entry above adds a sibling key for a different question rather than moving that one.

## REMOVED ADRs

_None._
