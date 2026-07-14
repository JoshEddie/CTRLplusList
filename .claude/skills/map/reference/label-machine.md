# The label machine

The routing-label vocabulary shared by both layers of the workflow constitution. Neither layer owns it: map stamps the definition-side transitions, `/set-sail` and `/landfall` stamp the execution-side ones. This file is the single home — skills reference it rather than restating it.

Routing labels are **ALL CAPS** and are the only labels skills route on. Each lifecycle transition is stamped by the skill that causes it:

| Label | Meaning | Stamped by |
| --- | --- | --- |
| `OFF THE MAP` | Logged, not yet charted — map's intake queue | Any session logging a discovery |
| `CHARTED` | Cleared for work — `/embark`'s only accepted target | `/map` (chart or exit) |
| `UNCHARTED` | A map chunk not cleared — born gated at exit, or demoted | `/map` (exit), `/anchor` (demote/discard) |
| `UNDER SAIL` | An OpenSpec change occupies the tree | `/set-sail` |
| `IN PORT` | Landed and sealed, awaiting inspection | `/landfall` |
| `ADRIFT` | Voyage interrupted with recoverable work | `/anchor` (park) |
| `MAP` | Index issue for an epic | `/map` (chart) |
| `PLOTTING` | Decision ticket, HITL | `/map`, `/anchor` (promote) |
| `SCOUTING` | Decision ticket, AFK | `/map`, `/anchor` (promote) |

Lowercase labels (`bug`, `idea`, `debt`, `hold`, …) are **human triage only** — no skill routes on them, with one carve-out: when map's intake recharts an issue carrying `hold`, surface its parked findings comment to the owner before any charting proceeds.

There is no separate not-cleared marker: `/embark` acts only on `CHARTED` and stops on everything else.

Every label above must already exist in the repo. Skills stamp them and never create them — creation is a one-time repo-setup step (deliberately not documented here: this file is read on every routing decision, and setup happened once, at adoption), so a missing label surfaces as a loud `gh` failure rather than being silently repaired. Repair by recreating the label from the table above (`gh label create`).
