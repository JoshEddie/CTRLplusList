# A member preference is a setting, not a permission

**Touching**: `openspec/specs/profiles-surface/spec.md`

**Context**: A per-member value that an owner may also write looks at first as though it belongs with the roster in Permissions, which already carries per-member rows and an owner floor. Placing it there conflates what a member is allowed to do with what they have asked to see.

**Decision**: A member-scoped **preference** lives in the profile space's Settings panel, alongside the profile-level default that seeds it; Permissions carries roles, admission and removal only. Who may write a preference is a separate question from where it lives — an owner setting another member's preference does so from Settings.

**Consequences**: Settings holds controls governed by different rules than the name-and-tagline form beside them, so its role-gating is per control rather than per panel. Permissions stays readable as one subject.
