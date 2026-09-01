# A per-membership setting is seeded, not inherited

**Touching**: `DB Schema`, `DAL`

**Context**: A per-member setting with a profile-level default can either leave the member value absent and inherit live, or write a concrete value when the membership is created. Live inheritance cannot distinguish a member who never chose from one who deliberately accepted the value offered to them, so an owner changing the default silently moves the second.

**Decision**: A per-membership setting is written **concretely when the membership is created**, seeded from the profile-level default as it stands at that moment. The default is a seed and never a parent: changing it moves nobody already a member, and existing members are changed one row at a time. A member value written under this capability is concrete; a value **absent** — a membership predating the capability — resolves to the fully protected default rather than falling through to the live profile value, so absence still never inherits.

**Consequences**: The profile-level control is honest about its own scope, and "what did this member actually choose" stays answerable. A profile-wide correction costs one write per member instead of one write. No backfill is owed for pre-existing members: an absent value resolves to the protected default until a row is written, which is the safe state for every membership.
