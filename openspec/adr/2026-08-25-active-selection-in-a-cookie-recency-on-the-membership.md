# Active selection in a cookie, recency on the membership

**Touching**: `DB Schema`, `DAL`

**Context**: Two per-viewer facts needed homes: which profile is active now, and which profiles a viewer actually uses, the latter being what orders a switcher that must survive a viewer running many profiles. A single store for both was considered — an ordered list of profile ids in one cookie — and rejected.

**Decision**: The active selection lives in a per-browser cookie, and the recency signal lives on the membership row as a nullable last-active timestamp, stamped when a profile is switched to and when it is written as. Each store holds the fact whose lifetime matches it: the mode a viewer is in at one keyboard, and how that human uses their profiles over time. The timestamp is coarsened so repeated writes cannot hammer the row, and NULL means never acted as. This is not a `profile_preferences` candidate — it describes an (account, profile) pair rather than a profile, so the profile-attributes rule does not reach it.

**Consequences**: Revoking a membership removes its recency entry by cascade, so no client-supplied list of profile ids has to be filtered and none can be forged. Ordering survives sign-out and follows the human across devices while the selection deliberately does not, so a viewer signing in on a new device lands on their self-profile with their ordering intact.
