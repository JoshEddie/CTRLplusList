# A per-member preference is an account-keyed preference row

**Touching**: `DB Schema`, `DAL`

**Context**: A per-member value with a profile-level default needs a home. A column on `profile_members` holds it beside `role` and `ride_along`, but every future per-member preference would then cost another membership column, and the profile-level default would live in a different table (`profile_preferences`) from the member values it seeds — two shapes for one concept.

**Decision**: A per-member preference is stored in `profile_preferences`, whose key gains a **nullable account**: a row with a null account is the profile-wide value, a row with an account set is that member's value. The profile default and every member baseline are then the same row shape, and a new per-member preference is a new catalog id rather than a new column. This is orthogonal to seeding: `2026-08-31-a-per-membership-setting-is-seeded-not-inherited` still holds — the null-account row is read only to seed a written member row and never governs a member at resolution time.

**Consequences**: `profile_preferences` is no longer keyed by profile alone; a reader must qualify by account, and the profile-wide value is the null-account row rather than "the profile's only row for that key". A member's preference rows must be discarded when their membership is revoked — a `profile_members` cascade did this for free, but an account-keyed preference row does not cascade with the membership, so the revocation action deletes them explicitly.
