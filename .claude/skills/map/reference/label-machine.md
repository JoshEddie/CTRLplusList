# The label machine

The routing-label vocabulary shared by both layers of the workflow constitution. Neither layer owns it: map stamps the definition-side transitions, `/set-sail` and `/landfall` stamp the execution-side ones. This file is the single home — skills reference it rather than restating it.

Routing labels are **ALL CAPS** and are the only labels skills route on. Each lifecycle transition is stamped by the skill that causes it:

| Label | Meaning | Stamped by |
| --- | --- | --- |
| `OFF THE MAP` | Logged, not yet charted — map's intake queue | Any session logging a discovery |
| `CHARTED` | Scope settled, cleared for work — even while sequenced behind an open blocker; `/embark`'s only accepted target | `/map` (chart or exit) |
| `UNCHARTED` | Fog only: a map chunk whose scope is not settled — born gated by an open decision ticket at exit, demoted, discarded, or migrated. NOT a blocked marker | `/map` (exit), `/anchor` (demote), `/run-aground` (demote + discard), `/split-map` (migrate) |
| `UNDER SAIL` | An OpenSpec change occupies the tree | `/set-sail` |
| `IN PORT` | Landed and sealed, awaiting inspection via `/port-inspection` | `/landfall` |
| `ADRIFT` | Voyage interrupted with recoverable work | `/run-aground` (park) |
| `MAP` | Index issue for an epic — sole milestone carrier (stamped at exit) | `/map` (chart), `/split-map` (successor) |
| `PLOTTING` | Decision ticket, HITL | `/map`, `/anchor` (promote), `/split-map` (re-orientation) |
| `SCOUTING` | Decision ticket, AFK | `/map`, `/anchor` (promote), `/port-inspection` (map-wide e2e scout, created + fired lazily at map close) |

**Birth labels follow the cut doc.** Whichever skill runs [issue-cut.md](issue-cut.md)'s mechanics — `/map`'s chart and exit, `/anchor`'s charter, `/split-map` — its per-kind rules stamp the birth label; the cut doc is the sole birth-label rule-set, and no citing skill carries birth-label rules of its own. Relabelling an existing chunk is a different act and is named normally above — `/anchor` (demote), `/run-aground` (demote via its always-run Step 1, plus discard), and `/split-map` (migrate) each stamp `UNCHARTED` in their own right.

Milestones are not labels but follow one routing invariant: the milestone lives **only on the `MAP` issue** — chunks, tickets, and every other issue carry none. `/map` exit stamps it; `/split-map` stamps the successor's and relabels migrated chunks `UNCHARTED` behind its re-orientation ticket.

Lowercase labels (`bug`, `idea`, `debt`, `hold`, …) are **human triage only** — no skill routes on them, with one carve-out: when map's intake recharts an issue carrying `hold`, surface its parked findings comment to the owner before any charting proceeds.

Sequencing between issues lives exclusively in native blocked-by relationships, never in labels: a blocker landing moves no label and fires no skill — the `CHARTED` chunk behind it becomes frontier automatically. `/embark` gates on both signals: label `CHARTED` AND zero open blockers; anything else stops it.

Every label above must already exist in the repo. Skills stamp them and never create them — creation is a one-time repo-setup step (deliberately not documented here: this file is read on every routing decision, and setup happened once, at adoption), so a missing label surfaces as a loud `gh` failure rather than being silently repaired. Repair by recreating the label from the table above (`gh label create`).
