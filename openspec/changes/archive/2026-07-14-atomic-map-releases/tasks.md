# Tasks: Atomic Map Releases

## 1. map-workflow skills

- [x] 1.1 `.claude/skills/map/SKILL.md` — small-input path compiles to a single-chunk map (map + one `CHARTED` chunk, no decision tickets, same session); exit stamps the milestone on the map issue, creates chunks with no milestone, and cuts one release's worth (spillover → successor map or fog per split rules); remove the "map carries no milestone / chunks milestone-assigned individually" lines
- [x] 1.2 `.claude/skills/close-map/SKILL.md` — verification surface pinned to the dev deployment, pre-cut; prod regressions become new bug tickets scoped to a patch release; refuse to close a map holding unstarted chunks or residual fog, pointing at `/split-map`
- [x] 1.3 Create `.claude/skills/split-map/SKILL.md` — permanent thin wrapper over `/map` (migrate-epic pattern): inventory landed vs open chunks, owner-approved successor map on next milestone, migrate unstarted chunks + gating tickets (sub-issue re-parent endpoints copied from migrate-epic), per-line fog dispatch (successor fog or `OFF THE MAP`), copy relevant Decisions-so-far gists with links back, cross-link both bodies, seed one re-orientation `PLOTTING` ticket blocked-by-wired onto every migrated chunk (born `UNCHARTED`), stop on any `UNDER SAIL`/`ADRIFT` chunk, never close anything
- [x] 1.4 `.claude/skills/map/reference/label-machine.md` — reflect milestone-on-map invariant and `/split-map`'s stamping (migrated chunks `UNCHARTED`) if labels/milestones are described there
- [x] 1.5 `.claude/skills/migrate-epic/SKILL.md` — policy 7 rewritten: the map carries the milestone; chunks carry none

## 2. trunk-workflow + release skills

- [x] 2.1 `.claude/skills/landfall/SKILL.md` — bookkeeping is `IN PORT` label only; remove milestone assignment from steps, phase table, sweep, and signals list
- [x] 2.2 `.claude/skills/release-review/SKILL.md` — dimension 1 becomes map closure (every milestoned `MAP` issue closed; open map/chunk/`IN PORT` cargo blocks with finish / re-milestone whole map / `/split-map` options; diff content must have a map home)
- [x] 2.3 `CLAUDE.md` — trunk-workflow section: fleet description updates (map milestone at exit, single-chunk maps, landfall label-only bookkeeping, `/split-map` added to the fleet, close-map dev-deployment inspection, release-review map-closure gate)

## 3. Specs

- [x] 3.1 Delta specs validate: `openspec validate atomic-map-releases --strict`

## 4. Owner reconciliation (manual, post-land)

- [x] 4.1 Owner: assign each existing open map its milestone; strip milestones from sub-issues; wrap or close out standalone milestoned issues

## 5. Pre-merge

- [x] 5.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 5.2 `npx tsc --noEmit` — zero errors
- [x] 5.3 `npm run build` — completes successfully
- [x] 5.4 `npm run test:coverage` — skipped — doc-only change (markdown/skills/specs only)
- [x] 5.5 `npm run test:e2e` — skipped — doc-only change (markdown/skills/specs only)
