# The active profile is the authorization context

**Touching**: `DAL`, `DB Queries`

**Context**: Once one account can act as several profiles, "is this row mine?" has two possible readings: does it belong to the profile I have declared myself to be, or to any profile I hold a membership on. The map had settled on the second — ownership comparisons as membership containment over profiles the actor owns or manages — and applying it revealed that it makes the act of switching gate nothing at all.

**Decision**: A profile-scoped write is authorized by **equality against the active profile**: the row's owning profile must equal the profile the request declares it acts as. Holding a membership on a profile is a precondition for selecting it, never authorization on its own, so reaching another profile's content requires switching to it first. Membership on the target is re-checked server-side on every resolution, and a selection that fails the check resolves to the self-profile rather than to nothing. This supersedes membership containment for ownership comparisons.

**Consequences**: The switcher becomes a real security boundary rather than a display preference, and authorization can never be widened by accumulating memberships. Acting on several profiles in one sitting costs a switch each time, and any surface that offers to create content for a profile other than the active one is a hole in this rule rather than a convenience.
