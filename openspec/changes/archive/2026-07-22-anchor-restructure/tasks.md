## 1. Reference docs (targets first, so every citation edit lands on an existing doc)

- [x] 1.1 Write `.claude/skills/map/reference/issue-cut.md` — issue birth on a map: numeric-id lookup, sub-issue POST, blocked-by wiring; common rules (owner-approved body before creation, sub-issue of the map, no milestone); per-kind rules — chunk (distilled body; birth `CHARTED` unless directly gated by an open decision ticket → `UNCHARTED`; blocked-by wired), `PLOTTING` (one sharp question sized to one session), `SCOUTING` (fires background subagent at creation) and the deferred variant (created unfired; fireable when all blockers close; firing skill out of scope). Cites `label-machine.md` for vocabulary, never restates it; sole birth-label rule-set; mechanics only, no judgment
- [x] 1.2 Write `.claude/skills/map/reference/map-body.md` — five-section template (moved verbatim from map SKILL.md) + edit discipline: index-not-store, gist lines with title-wrapped links, section moves (fog → decision; decision → fog marked *reopened*), re-sync procedure, creation = editing from blank
- [x] 1.3 Write `.claude/skills/map/reference/demotion.md` — reopen the original ticket (never a superseding one), post invalidation evidence as a comment, move gist → Not yet specified marked *reopened*, flip dependent chunks `CHARTED` → `UNCHARTED`, wire the reopened ticket blocked-by onto them

## 2. Map skill sheds mechanics

- [x] 2.1 `.claude/skills/map/SKILL.md` — delete § GitHub mechanics (now `issue-cut.md`); move the five-section template out (now `map-body.md`); chart, exit, work, and re-enterable-exit sections cite the reference docs; exit keeps its judgment (release-sized chunking, sequencing, owner approval)
- [x] 2.2 `.claude/skills/map/reference/label-machine.md` — replace the transparent-wrapper paragraph with the cut-doc rule (whichever skill runs `issue-cut.md`, its per-kind rules stamp the birth label); stamper column: `ADRIFT` and discard-`UNCHARTED` stamped by `/run-aground`

## 3. Anchor rewrite

- [x] 3.1 Rewrite `.claude/skills/anchor/SKILL.md` — dispatch table at top (fog sharpened → promote; decision wrong → demote; new discovery → charter diagnosis; body drifted → re-sync; mirage under sail → points at `/run-aground`); four moves as judgment kernel + doc citation (promote keeps its precision test, charter its conjunctive diagnosis; demote cites `demotion.md`, re-sync cites `map-body.md`, charter cites `issue-cut.md`); triage section removed; guardrails collapse to "GitHub issue writes only, never the tree" — tree-exception clause deleted

## 4. New /run-aground skill

- [x] 4.1 Write `.claude/skills/run-aground/SKILL.md` — dark mirror of `/landfall`; trigger: mirage strikes an `UNDER SAIL` issue; step 1 executes `demotion.md`; then blast-radius AskUserQuestion: patch at sea (amend in place, stays `UNDER SAIL`) / park → `ADRIFT` (`adrift/issue-<N>` branch, one WIP commit staged never signed, dev restored clean, `UNDER SAIL` never survives a park) / discard → `UNCHARTED` (tree cleaned, fresh proposal later); owns stage-never-sign (blocked signature never retried, paste-ready message) and the resume path (merge `adrift/issue-<N>` into dev locally, relabel `ADRIFT` → `UNDER SAIL`)

## 5. Consumer rewiring

- [x] 5.1 `.claude/skills/split-map/SKILL.md` — drop "permanent thin wrapper" framing → peer consumer: successor map creation cites `map-body.md`, re-orientation ticket cites `issue-cut.md`; "resolve via `/landfall` or `/anchor`" → "`/landfall` or `/run-aground`"
- [x] 5.2 `.claude/skills/set-sail/SKILL.md` — mid-voyage mirage discipline repoints from anchor's triage to `/run-aground`; charter routing through `/anchor` stays
- [x] 5.3 `CLAUDE.md` § Trunk workflow fleet-route line — split "`/anchor` for discoveries" into `/anchor` (map bearing moves) + `/run-aground` (mid-voyage mirages)
- [x] 5.4 Cross-reference sweep — confirm `/embark`, `/close-map`, `/landfall`, `/adjudicate-review`, `/port-inspection` need no edits (embark's anchor citations are demote routing; adjudicate-review's is a negative citation; port-inspection's cut consumption is #277); grep `.claude/skills/` for any remaining `triage`/thin-wrapper references to anchor

## 6. Pre-merge

- [x] 6.1 `openspec validate --strict` passes for `anchor-restructure`
- [x] 6.2 `npm run lint` — zero errors, zero non-size warnings
- [x] 6.3 `npx tsc --noEmit` — zero errors
- [x] 6.4 `npm run build` — completes successfully
- [x] 6.5 `npm run test:coverage` — SKIPPED under doc-only exemption: verified diff touches only `.claude/**`, `openspec/**`, `CLAUDE.md` (no executable change); CI runs the full battery on push
- [x] 6.6 `npm run test:e2e` — SKIPPED under the same doc-only exemption

## Gates — round 1

- [x] A1 map-workflow Purpose still attributes bearing moves to `/anchor` — resolved
- [x] B2 label-machine UNCHARTED stamper attribution omits `/run-aground` demotion path — resolved
