<!-- The delta against the ADR library at `openspec/adr/`. Contract: the adr
     artifact instruction in schema.yaml. -->

## ADDED ADRs

### 2026-08-25-the-active-profile-is-the-authorization-context

**Touching**: `DAL`, `DB Queries`

**Context**: Once one account can act as several profiles, "is this row mine?" has two possible readings: does it belong to the profile I have declared myself to be, or to any profile I hold a membership on. The map had settled on the second — ownership comparisons as membership containment over profiles the actor owns or manages — and applying it revealed that it makes the act of switching gate nothing at all.

**Decision**: A profile-scoped write is authorized by **equality against the active profile**: the row's owning profile must equal the profile the request declares it acts as. Holding a membership on a profile is a precondition for selecting it, never authorization on its own, so reaching another profile's content requires switching to it first. Membership on the target is re-checked server-side on every resolution, and a selection that fails the check resolves to the self-profile rather than to nothing. This supersedes membership containment for ownership comparisons.

**Consequences**: The switcher becomes a real security boundary rather than a display preference, and authorization can never be widened by accumulating memberships. Acting on several profiles in one sitting costs a switch each time, and any surface that offers to create content for a profile other than the active one is a hole in this rule rather than a convenience.

### 2026-08-25-actor-resolution-names-both-profiles

**Touching**: `DAL`

**Context**: The session seam returned one `profile`, documented as "the profile this request acts as" and in practice always the self-profile, read by roughly thirty-eight call sites. Making it mean the active profile would have silently changed every one of them, including the paths that must stay the human's — claims, home rails, the feed, connections, visit history.

**Decision**: Actor resolution names both profiles explicitly — the **self** profile and the **active** profile — and carries no single unqualified `profile`. Each call site states which one it means. Content and ownership take the active profile; anything naming or acting for the human takes the self profile.

**Consequences**: The distinction cannot be defaulted into, because there is no field to inherit — a new call site must choose, and a rename that removes the old field turns every existing site into a compile error rather than a silent behaviour change. The cost is a slightly wordier seam and two names a reader must hold apart.

### 2026-08-25-a-block-belongs-to-the-human

**Touching**: `DAL`, `DB Queries`

**Context**: Blocks are stored profile → profile, and once a human runs several profiles it stops being obvious which of theirs a block is made by, or which of theirs it protects. A cascade materializing a row per owned profile was settled earlier and never implemented; the follow-on question of whether a block should also hide the blocker's other profiles from the blocked party was weighed and declined.

**Decision**: A block belongs to the **human**, named by their self-profile: the blocker end is always the actor's self-profile whatever profile they are acting as, and block checks resolve the viewer by their self-profile too. A block filters what that human sees, in every profile they act as; it does not fan out across the profiles they run, and no block row is materialized or inherited at profile creation.

**Consequences**: Blocking behaves identically before and after a switch, and needs no cascade, no birth inheritance, and no schema change. A party a human has blocked can still see lists owned by the managed profiles that human runs, which is accepted until consent-gated association replaces blocking's access-control job.

### 2026-08-25-active-selection-in-a-cookie-recency-on-the-membership

**Touching**: `DB Schema`, `DAL`

**Context**: Two per-viewer facts needed homes: which profile is active now, and which profiles a viewer actually uses, the latter being what orders a switcher that must survive a viewer running many profiles. A single store for both was considered — an ordered list of profile ids in one cookie — and rejected.

**Decision**: The active selection lives in a per-browser cookie, and the recency signal lives on the membership row as a nullable last-active timestamp, stamped when a profile is switched to and when it is written as. Each store holds the fact whose lifetime matches it: the mode a viewer is in at one keyboard, and how that human uses their profiles over time. The timestamp is coarsened so repeated writes cannot hammer the row, and NULL means never acted as. This is not a `profile_preferences` candidate — it describes an (account, profile) pair rather than a profile, so the profile-attributes rule does not reach it.

**Consequences**: Revoking a membership removes its recency entry by cascade, so no client-supplied list of profile ids has to be filtered and none can be forged. Ordering survives sign-out and follows the human across devices while the selection deliberately does not, so a viewer signing in on a new device lands on their self-profile with their ordering intact.

### 2026-08-25-no-environment-override-for-the-acting-profile

**Touching**: `E2E Test`, `Local Dev`

**Context**: An environment variable was cut in advance as the local-mode and e2e override for the active profile, mirroring the session-user override that makes bypassed auth deterministic. Reaching for it revealed the mismatch: the session override pins one process-wide fact, while the acting profile has to differ from one test to the next.

**Decision**: There is no environment override for the acting profile. A test pins its acting profile by setting the same cookie the application sets, per browser context, and local development switches through the real UI. A request carrying no cookie already resolves deterministically to the self-profile, so the un-pinned starting state needs no mechanism of its own.

**Consequences**: Suites can pin different profiles per spec, and the switching path stays exercisable end to end by simply not pinning. The trade is that the cookie mechanism is always in the loop, so a fault in it cannot be isolated away by an override.
