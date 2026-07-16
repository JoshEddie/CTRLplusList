## Context

The workflow constitution is two-layered. The **definition layer** (`map-workflow`) governs how work gets defined: `/map` is the mandatory intake, and nothing else creates worked issues. The **execution layer** (`trunk-workflow`) governs everything after departure. The layers are deliberately isolated — neither governs the other.

That isolation has a hole. A mid-voyage discovery has exactly one exit today: log it `OFF THE MAP` and return to the voyage. That is correct for work outside any open map's Destination. It is wrong for a discovery that sits **inside an open map's Destination and blocks its release** — landed cargo found broken, say, whose fix gates the map's own verification. Routed `OFF THE MAP`, such a discovery waits for a `/map` invocation that, fed it cold, compiles a wrong new single-chunk map with its own milestone — violating the map ⇔ milestone atomicity invariant for work that must ship with the map already in flight.

Voyage #214 on map #203 hit this live. The right answer was two `CHARTED` chunks on the open map (#246, #247). The session got the routing right and the mechanics wrong: it cut the chunks inside `/anchor`, breaching the definition layer's worked-issue-creation monopoly. The routing instinct was sound; the constitution had no legal way to express it.

## Goals / Non-Goals

**Goals:**

- Give a release-blocking, in-Destination discovery a legal route onto its open map, cut at the moment of discovery.
- Preserve the worked-issue-creation monopoly: `/map`'s exit mechanics remain the only thing that cuts a chunk.
- Keep the map ⇔ milestone invariant intact — a chartered chunk carries no milestone.
- Leave the active voyage undisturbed. Charter is not a mirage.

**Non-Goals:**

- Mirage handling and the park/discard/patch triage — untouched.
- `/split-map` boundary mechanics — untouched; it remains the only boundary cutter and the only answer to a map that won't finish.
- The `/port-inspection` sibling chunk of map #249.
- Any app code, DB, or UI surface. Prose, skill, and spec only.

## Decisions

### Charter is exit re-entered, not a new requirement

The `map-workflow` exit requirement already owns chunk-cutting end to end: owner-approved chunking, distilled bodies, sub-issue wiring, blocked-by sequencing, birth labels, no milestone on chunks. Charter needs every one of those, identically. Amending exit to be **re-enterable per-discovery on an open map** keeps those mechanics in exactly one normative home.

The clause "Implementation issues SHALL be created only at exit, never incrementally during the decision phase" is what currently forbids charter. Read precisely, it bars cutting chunks *during the decision phase* — its purpose is to stop a map from dribbling out implementation issues while fog is still being cleared, not to freeze the chunk set for the map's life. Charter is strictly post-exit, so amending the clause to say so preserves its intent rather than weakening it.

**Alternatives rejected:**

- *Standalone charter requirement.* Smaller diff, but chunk-cutting mechanics would live in two requirements that must be kept in sync forever — the exact drift hazard the DRY rule names.
- *Fold into `/anchor`'s bearing-moves requirement.* Matches the skill layout, but puts worked-issue creation inside a requirement scoped to decision state. `/anchor`'s requirement gains a pointer to charter; it does not gain the mechanics.

### The wrapper is transparent — `/map` stays the sole origin of a birth label

The label machine says each transition is "stamped by the skill that causes it" and names `/map` for `CHARTED`/`UNCHARTED`. A chartered chunk is born `CHARTED` through `/anchor`, which invites naming `/anchor` a stamper.

It shouldn't be — but **not on a `/split-map` precedent**, which does not exist. `/split-map` cuts no chunks: it *migrates* existing ones by re-parenting, and it is named a stamper for exactly that (`UNCHARTED` (migrate), `MAP` (successor)). Charter is the first skill to birth a `CHARTED` issue outside `/map`, so no prior wrapper has tested this.

The argument stands on its own without the precedent. A **birth label is a property of the cut**, and the cut is exit's: exit alone decides `CHARTED` vs `UNCHARTED` from the chunk's blocked-by state, by the same rule whether it runs at the original exit or re-entered via charter. `/anchor` supplies the discovery and the trigger; it makes no labelling decision and could not make a different one. Naming it a stamper would imply a decision it does not own. Relabelling an *existing* chunk is the opposite case — a genuine decision by the calling skill — which is why `/anchor` (demote/discard) and `/split-map` (migrate) are named normally. The carve-out is therefore scoped to birth labels, not to wrappers in general.

**Alternative rejected:** *Name `/anchor` explicitly.* Literally true to "the skill that causes it," but it credits `/anchor` with a labelling decision exit owns, and the table already carries multiple stampers per label without harm. The cost is a scoped carve-out sentence in the label-machine requirement — the delta amends it rather than leaving the table silently overbroad.

### Charter fires at the moment of discovery; the voyage continues

`/anchor` already establishes that "any session MAY anchor at the moment of discovery" and that "no session carries a proactive detection duty." Charter inherits both. It writes only GitHub issues, so an occupied tree is irrelevant — the one-change-mid-apply gate protects the tree, and charter never touches it.

This is the seam that separates charter from mirage triage. A mirage stops work because it invalidates the *active* change's premise. A charter-worthy discovery is orthogonal to the active change: it is cut onto the map and left for a future voyage. The rescoped `/set-sail` line carries this explicitly — "never folded into the active change" is the load-bearing half.

**Alternatives rejected:**

- *Log now, charter at landfall.* Reintroduces the `OFF THE MAP` round-trip this change exists to kill, and risks the map's release cutting before anyone converts it.
- *Charter now, pause the voyage.* Conflates charter with mirage triage, which map #249 scoped out. If a discovery genuinely undercuts the active chunk, it **is** a mirage and the existing triage already owns it.

### Charter is silent on release pressure

Chartering onto a milestoned map grows that release's scope — by design, since the criterion *is* release-blocking. `release-review` gates on every milestoned map being closed, so the pressure is real, but the criteria already made the call: if it's release-blocking it ships with the map; if it isn't, the criteria routed it to fog or `OFF THE MAP`. A scope warning at charter time would invite re-litigating a settled criterion, and `/split-map` already owns the map-won't-finish case.

### `trunk-workflow` needs a delta after all

Issue #250 predicted `trunk-workflow` was untouched, on the theory that the `/set-sail` discipline line was skill prose. The terrain check falsified this: `trunk-workflow`'s `/set-sail` requirement carries the discipline normatively — "state the mid-voyage disciplines — discoveries are logged as rich `OFF THE MAP` issues without charting." Rescoping the skill line without the delta would leave the spec mandating the round-trip charter exists to replace. Owner approved the widened scope.

The same check found a second `map-workflow` clause the issue didn't list: the label machine's scenario "Discovery mid-voyage is logged, not charted," whose **THEN** mandates `OFF THE MAP` and "returns to its voyage without invoking map." It contradicts charter outright and sits under the label-machine requirement, not either requirement the issue named.

## Risks / Trade-offs

- **Charter becomes the path of least resistance for any mid-voyage discovery, quietly inflating every release.** → The criteria are conjunctive and narrow: in-Destination **and** release-blocking. The nice-to-have branch explicitly routes to an owner choice between fog and `OFF THE MAP`, so the common case still leaves the map. `OFF THE MAP` remains the default for everything outside an open Destination.
- **A discovery is misdiagnosed as charter-worthy when it is really a mirage against the active chunk.** → The two are distinguished by target: a mirage invalidates a *settled decision* the active change builds on; charter cuts *new work* onto the map. `/anchor` owns both, so the diagnosis happens in one place with both moves in view.
- **Three deltas across two capabilities risk a partial edit leaving the constitution self-contradictory** — e.g. the exit requirement permitting charter while the label-machine scenario still mandates the round-trip. → The label-machine scenario and the `trunk-workflow` line are the contradiction surface; both are named explicitly in tasks, and `openspec validate --strict` plus `/spec-review` gate the seal.
- **Amending "only at exit, never incrementally" could be read as licensing incremental chunk-cutting during the decision phase.** → The amendment is scoped to *post-exit charter on an open map*; the decision-phase bar is restated, not relaxed.
