## 1. Label machinery

- [x] 1.1 Add the `MUSTER` row to `.claude/skills/map/reference/label-machine.md`: coverage roll-call chunk cut by the map's e2e scout — plan in ticket body, no spec delta, skips `/embark`; `/set-sail`'s direct-work target; stamped by `/port-inspection` (scout's cut)
- [x] 1.2 Add the birth rule to `.claude/skills/map/reference/issue-cut.md`: the scout's closing e2e chunk kind is born `MUSTER` (not `CHARTED`)
- [x] 1.3 Hand the owner the `gh label create MUSTER` command (label creation is a repo-setup step the owner runs or approves — never run it unasked)

## 2. /set-sail split

- [x] 2.1 Rewrite the gate in `.claude/skills/set-sail/SKILL.md`: hard-stop if ANY issue is labeled `UNDER SAIL` (drop the change-dir+dirty-tree heuristic); identity line becomes "only route into occupying the tree"
- [x] 2.2 Add target resolution: argument resolves to an OpenSpec change (existing lane, flow unchanged) or a `MUSTER`-labeled issue (new lane)
- [x] 2.3 Add the MUSTER lane instructions: add `UNDER SAIL` alongside `MUSTER` (lane marker never comes off); ticket body is the plan; staleness grep of every cited `#### Scenario:` heading against active specs (missing → stop, back to owner); read TESTING.md in full first; every test file carries the citation header (capability + scenario); implement inline, no `/opsx:apply`; never commits or stages unasked — keep the skill lean

## 3. /muster-review skill

- [x] 3.1 Create `.claude/skills/muster-review/SKILL.md`: resolve the MUSTER voyage (arg or single issue labeled both `MUSTER` and `UNDER SAIL`); stop if the diff touches production code; fan out exactly one testing-arena agent briefed by reference to the bundled arena T brief, framing traceability against the active-spec scenarios cited by each test file's header (not degraded, not delta specs) plus the TESTING.md forbidden-pattern sweep; report one findings+verdict round in the session (no issue comment); never writes tree artifacts, never commits/stages/pushes

## 4. /landfall no-seal branch

- [x] 4.1 Add MUSTER detection to `.claude/skills/landfall/SKILL.md` phase detection: an issue labeled both `MUSTER` and `UNDER SAIL` routes to the MUSTER branch
- [x] 4.2 Write the branch: gates = owner confirms latest muster-review verdict clear (no round/non-clear → stop, point at `/muster-review`) + lint + tsc; no verification question (always CI-verified, no live check); stage → single `issue-<N>:` hand-off → push after signature → wait green CI → remove `UNDER SAIL`, add `IN PORT` (`MUSTER` stays); no summary comment, no archive, no seal; red CI fixes forward with a fresh `/muster-review` round

## 5. Spec deltas and docs

- [x] 5.1 Verify the `trunk-workflow` and `map-workflow` delta specs in this change still match the edited skills word-for-word where they cite behavior; adjust deltas if drift crept in during 2–4
- [x] 5.2 Add the one-clause MUSTER-lane mention to CLAUDE.md § Trunk workflow fleet list (set-sail handles both lanes) — no new section
- [x] 5.3 Verify `.claude/skills/port-inspection/SKILL.md` carries no text contradicting the `MUSTER` birth label (the rule lives in issue-cut.md); fix only contradictions

## 6. Cleanup

- [x] 6.1 Delete the untracked `openspec/changes/e2e-map-233-coverage/` directory

## 7. Pre-merge

Diff is markdown/skills/specs-only — nothing in it can affect test outcomes, so the `test:coverage` and `test:e2e` gates are omitted under the doc-only exemption; CI on the dev push still runs the full battery.

- [x] 7.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 7.2 `npx tsc --noEmit` — zero errors
- [x] 7.3 `npm run build` — completes successfully
- [x] 7.4 `openspec validate muster-lane --strict` — passes
