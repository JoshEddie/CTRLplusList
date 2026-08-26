# Actor resolution names both profiles

**Touching**: `DAL`

**Context**: The session seam returned one `profile`, documented as "the profile this request acts as" and in practice always the self-profile, read by roughly thirty-eight call sites. Making it mean the active profile would have silently changed every one of them, including the paths that must stay the human's — claims, the Following / Bookmarks / Recently visited rails, the feed, connections, visit history.

**Decision**: Actor resolution names both profiles explicitly — the **self** profile and the **active** profile — and carries no single unqualified `profile`. Each call site states which one it means. Content and ownership take the active profile; anything naming or acting for the human takes the self profile.

**Consequences**: The distinction cannot be defaulted into, because there is no field to inherit — a new call site must choose, and a rename that removes the old field turns every existing site into a compile error rather than a silent behaviour change. The cost is a slightly wordier seam and two names a reader must hold apart.
