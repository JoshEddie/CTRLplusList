## 1. Spec deltas (the contract first)

- [x] 1.1 `openspec/changes/charter-move/specs/map-workflow/spec.md` — verify the three MODIFIED requirements carry the ENTIRE original requirement block (header text matching exactly, every original scenario retained) so archive loses no detail
- [x] 1.2 `openspec/changes/charter-move/specs/trunk-workflow/spec.md` — same full-content check on the `/set-sail` requirement
- [x] 1.3 Run `openspec validate --strict charter-move` and fix any delta-format failures (4-hashtag scenarios, header matching)
- [x] 1.4 `specs/map-workflow/spec.md` — MODIFIED the intake requirement: its "No other skill SHALL create issues cleared for work" monopoly gains a pointer naming charter as the sole exception (cut runs under exit's mechanics), so the clause does not read as outlawing charter when read in isolation

## 2. /anchor — the charter move

- [x] 2.1 Add a **Charter** section to `.claude/skills/anchor/SKILL.md` between Demote and Re-sync: the conjunctive criteria (in-Destination AND release-blocking → cut a chunk; in-Destination nice-to-have → owner picks fog line vs `OFF THE MAP`; outside every open Destination → `OFF THE MAP` as today)
- [x] 2.2 State the diagnose/trigger seam explicitly — `/anchor` diagnoses; the cut delegates to `/map`'s exit mechanics as a thin wrapper, following the `/split-map` precedent, so the worked-issue monopoly holds
- [x] 2.3 State the chartered chunk's birth: owner-approved distilled body, sub-issue of the map, **no milestone**, `CHARTED` unless an open decision ticket gates it (then `UNCHARTED`), blocked-by wired onto what it builds on
- [x] 2.4 State that charter does not stop the voyage and leaves `UNDER SAIL` standing — contrast with mirage triage, which does stop work; note charter is silent on release pressure
- [x] 2.5 Update the skill's frontmatter `description` to name charter as a fourth bearing move (it currently enumerates promote/demote/re-sync/triage only)
- [x] 2.6 Confirm the Guardrails section still reads true — charter writes GitHub issues only, so the "sole tree exception is the park move" line stands unchanged

## 3. /map — append-to-open-map clause

- [x] 3.1 Add an explicit append-to-open-map clause under `.claude/skills/map/SKILL.md` § Exit: exit is re-enterable per-discovery via `/anchor`'s charter move, applying only after the original exit has run
- [x] 3.2 Restate the decision-phase bar in the same clause so the amendment cannot be read as licensing incremental chunk-cutting before exit
- [x] 3.3 Verify the existing § GitHub mechanics invocations (sub-issue linking, blocked-by, label stamping) are reusable by charter as-is — no new mechanics; note the reuse rather than duplicating the invocations

## 4. /set-sail — rescoped discipline

- [x] 4.1 Rescope the discipline bullet in `.claude/skills/set-sail/SKILL.md` from "Discoveries are logged, not charted / Never invoke `/map` mid-voyage" to "never folded into the active change; charting onto the map runs through `/anchor`"
- [x] 4.2 Ensure the rescoped line defers routing to `map-workflow`'s charter criteria rather than restating them (execution layer does not own definition-layer rules)

## 5. CLAUDE.md fleet text

- [x] 5.1 Update the `/anchor` fleet entry in § Trunk workflow to name charter alongside promote/demote/re-sync/triage
- [x] 5.2 Update the `/set-sail` fleet entry — its "discoveries logged as rich `OFF THE MAP` issues, never charted mid-voyage" clause now contradicts charter
- [x] 5.3 Grep CLAUDE.md for any other `OFF THE MAP` / mid-voyage discovery claim that the charter move falsifies

## 6. Consistency sweep (the contradiction surface)

- [x] 6.1 Grep `.claude/skills/**`, `CLAUDE.md`, and `openspec/specs/**` for the contradiction surface — "never charted", "without invoking map", "never invoke /map", "logged, not charted", "shall not survive", "mid-voyage" — every hit either routes through charter now or is outside an open Destination and stands
- [x] 6.2 Author the birth-label wrapper-transparency carve-out in `.claude/skills/map/reference/label-machine.md` (canonical mirror of the label-machine delta) and confirm it does not falsify the stamper table above it: `/anchor` (demote/discard) and `/split-map` (migrate) stamp `UNCHARTED` in their own right and stay named
- [x] 6.3 Confirm `/split-map` prose is untouched and still reads coherently — and that no artifact claims `/split-map` cuts chunks or sets a not-a-stamper precedent (it re-parents existing chunks and is a named stamper; charter is the first birth-label wrapper)

## 7. Pre-merge

- [x] 7.1 `npm run lint` — eslint, zero errors and zero non-size warnings
- [x] 7.2 `npx tsc --noEmit` — zero errors
- [x] 7.3 `npm run build` — next build completes
- [x] 7.4 `npm run test:coverage` — **skipped — doc-only change** (verified: diff touches only `.claude/**`, `openspec/**`, CLAUDE.md; no executable file). MAY be marked "skipped — doc-only change" (diff is `.claude/**`, `openspec/**`, and CLAUDE.md only; no executable file touched). Any executable change voids the exemption and this gate must be run.
- [x] 7.5 `npm run test:e2e` — **skipped — doc-only change** (same verified rationale as 7.4). MAY be marked "skipped — doc-only change" (same rationale as 7.4). CI on the `dev` push still runs the full battery.
- [x] 7.6 `openspec validate --strict charter-move` passes
- [x] 7.7 `/spec-review` on the staged diff — verdict clear to land before `/landfall`
