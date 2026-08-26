# A block belongs to the human

**Touching**: `DAL`, `DB Queries`

**Context**: Blocks are stored profile → profile, and once a human runs several profiles it stops being obvious which of theirs a block is made by, or which of theirs it protects. A cascade materializing a row per owned profile was settled earlier and never implemented; the follow-on question of whether a block should also hide the blocker's other profiles from the blocked party was weighed and declined.

**Decision**: A block belongs to the **human**, named by their self-profile: the blocker end is always the actor's self-profile whatever profile they are acting as, and block checks resolve the viewer by their self-profile too. A block filters what that human sees, in every profile they act as; it does not fan out across the profiles they run, and no block row is materialized or inherited at profile creation.

**Consequences**: Blocking behaves identically before and after a switch, and needs no cascade, no birth inheritance, and no schema change. A party a human has blocked can still see lists owned by the managed profiles that human runs, which is accepted until consent-gated association replaces blocking's access-control job.
