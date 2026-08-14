# Map body

The map-body template and edit discipline — followed by citation by every skill that creates or edits a map body (`/map`, `/anchor`, `/split-map`). Creation is editing from blank: a new map's body is written by these same rules.

## The template — exactly these five sections

    ## Destination
    <what done looks like — one or two lines; every session orients
    to it before choosing a ticket>

    ## Notes
    <domain context; standing preferences for this effort. Always
    read first: CLAUDE.md and any capability specs the effort
    touches — same read-first discipline as openspec/config.yaml>

    ## Decisions so far
    - [<closed ticket title>](link) — <one-line gist>
    - [<closed scouting ticket title>](link) — <gist> *(unreviewed)*
    - <unlinked gist line — an answer that never waited for a ticket>

    ## Not yet specified
    <in-scope fog too dim to ticket yet; demoted decisions appear
    here marked *reopened*; manual prerequisites appear as fog
    lines naming what they wait on>

    ## Out of scope
    <consciously ruled out; never graduates>

## Edit discipline

- **Index, not store.** A decision lives in exactly one place — its ticket — and the map gists and links it. Gist lines and links only, never restated content.
- **Title-wrapped links.** Refer to every map and ticket by its title wrapping the link, never a bare number.

### Section moves

- **Fog → decision:** when a fog line resolves (ticket closed, or answered inline), remove it from Not yet specified and append the gist to Decisions so far — linked to its ticket, or unlinked when the answer never waited for one. Closed `SCOUTING` gists carry the *unreviewed* marker until an owner-present session clears it.
- **Decision → fog:** a demoted decision's gist moves from Decisions so far back to Not yet specified, marked *reopened* (full demotion procedure in [demotion.md](demotion.md)).
- **Out of scope never graduates.** A ticket found to sit past the destination closes into Out of scope with one line of why — never into Decisions so far.

### Re-sync

When a map body has drifted from ticket reality (anchors may have run outside map sessions), re-sync it: walk the sub-issues, and make the body's gist lines and section placement match ticket state. The index-not-store discipline keeps the diff small — gist lines and links move; content is never restated.
