# Protection follows the human, not the acting profile

**Touching**: `DAL`, `DB Queries`

**Context**: `2026-08-25-the-active-profile-is-the-authorization-context` made ownership an equality against the acting profile, which correctly gates writes but leaves a human viewing a list owned by a profile they run — while acting as another — indistinguishable from a stranger. Spoiler hiding keyed off that same comparison, so the viewer's own household's claims rendered. Widening authorization to close it was rejected, because authorization by ambient attachment would make switching gate nothing.

**Decision**: Spoiler protection resolves from the viewer's **membership on the content's owning profile**, whatever profile the request acts as; authorization continues to resolve from equality against the acting profile. A person cannot be un-spoiled after the fact, so protection is a property of the human and travels with them across every switch. "May I write this?" and "may I see this?" take different keys and are answered separately.

**Consequences**: A viewer can be protected on content they hold no authority to write, and authorized over content they are protected from — both are correct, and neither implies the other. Any surface asking what a viewer may see must resolve membership rather than reuse the ownership comparison it already holds.
