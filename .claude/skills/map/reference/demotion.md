# Demotion

The demotion procedure — what happens on the map when a settled decision is revealed as a mirage. Followed by citation: `/anchor`'s demote move runs it directly; `/run-aground` runs it as its first step (the map-side truth update happens regardless of blast radius). Mechanics only; deciding *that* a decision is a mirage stays with the citing skill.

1. **Reopen the original ticket** — one thread holds the decision's whole history; refer-by-name keeps working. Never open a superseding ticket.
2. **Post the invalidation evidence** as a comment on it.
3. **Edit the map body** per [map-body.md](map-body.md): move the gist line from Decisions so far back to Not yet specified, marked *reopened*.
4. **Flip dependent chunks:** any implementation chunk that builds on the demoted decision flips `CHARTED` → `UNCHARTED`, and the reopened ticket is wired blocked-by onto it (endpoint in [issue-cut.md](issue-cut.md)).
