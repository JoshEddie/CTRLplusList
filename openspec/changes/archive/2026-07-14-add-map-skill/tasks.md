# Tasks — add-map-skill

## 1. Definition-layer skills

- [x] 1.1 Rework `.claude/skills/map/SKILL.md` to the post-explore constitution: mandatory intake (subsumes explore, preserves the write-back discipline), chart/work/exit phases, scaling law, consumed-never-converted, inline map-body template, wayfinder credit comment retained
- [x] 1.2 Extract the label machine to `.claude/skills/map/reference/label-machine.md` as its one home — routing caps (`OFF THE MAP`, `CHARTED`, `UNCHARTED`, `UNDER SAIL`, `IN PORT`, `ADRIFT`, `MAP`, `PLOTTING`, `SCOUTING`) vs lowercase status labels (`hold` surfacing rule), skill-stamps-its-transition table, labels as a repo-setup prerequisite; map, embark, and CLAUDE.md reference it rather than restating it
- [x] 1.3 Encode tickets: `PLOTTING` (HITL via `/grill-me`) and `SCOUTING` (AFK, auto-fire at creation, auto-close with unreviewed gist markers); task type removed (fog line + anchor); no claiming; frontier two-mode prompt with real tickets, ties by list order; one plotting ticket per session
- [x] 1.4 Keep the verified `gh api` invocations inline (sub-issue add/list with numeric-id lookup, blocked-by wiring); relaxed exit gate with chunks born `CHARTED`/`UNCHARTED` per blocking, owner-approved chunking, individual milestones, map carries none; epic-abort re-validation sweep; guardrails (issues-only, ungated)
- [x] 1.5 Author `.claude/skills/anchor/SKILL.md`: promote, demote (original ticket, evidence comment, gist marked reopened, chunk coin-flip), map-body re-sync, mid-voyage triage (patch at sea / park to `adrift/issue-<N>` WIP branch + `ADRIFT` / discard + `UNCHARTED`), never merge half-finished, no detection duty
- [x] 1.6 Author `.claude/skills/close-map/SKILL.md`: inspection batch-point over `IN PORT` chunks, closes the map only when every chunk is closed

## 2. Execution-layer skills

- [x] 2.1 Rename `.claude/skills/start-change/` → `.claude/skills/embark/` and rewrite as the thin dispatcher: gate (on dev, up to date), `CHARTED` allowlist (every other state stops — no routing table, no delegation into the definition layer), terrain check (anchor on drift), propose with inherited map decisions (unreviewed scouting gists re-validated), epic route-out; explore route removed
- [x] 2.2 Author `.claude/skills/set-sail/SKILL.md`: one-change-mid-apply gate, `CHARTED` → `UNDER SAIL` flip, mid-voyage disciplines (log `OFF THE MAP`, mirage → `/anchor`), delegate to `/opsx:apply`
- [x] 2.3 Rename `.claude/skills/land-change/` → `.claude/skills/landfall/` and rework: verification prompt with fast path (two commits, one push) and verified path, `finalize-spec-purposes` before seal staging, paste-ready commit messages at every hand-off, eager bookkeeping (milestone + `IN PORT`, never close), self-healing phase detection with bookkeeping sweep

## 3. Docs and cross-references

- [x] 3.1 CLAUDE.md § Trunk workflow: rewrite around the two-layer constitution, the fleet (`/map`, `/embark`, `/set-sail`, `/anchor`, `/landfall`, `/close-map`), and the label machine
- [x] 3.2 Sweep cross-references to `/start-change` and `/land-change` in `.claude/skills/**`, CLAUDE.md, and `.github/workflows/ci.yml` (spec-review, recheck-review, release-review, land-change mentions, memory hooks excluded)
- [x] 3.3 Doc-only gate exemption codified: `openspec/config.yaml` `tasks` rule + CLAUDE.md five-gates bullet (already edited this change — verify both survive the rework)
- [x] 3.4 Document the one-time GitHub label migration (create routing + status labels; `IDEA` → `idea`; delete `EXPLORE NEEDED`; `HOLD` → `hold`) and run it — this is the sole creation point; skills stamp labels and never create them
- [x] 3.5 Sweep the same references out of `openspec/specs/**` via deltas, not hand-edits: MODIFIED deltas for `spec-review` (persisted-report requirement) and `recheck-review` (round-verdict requirement); re-point `trunk-workflow`'s Purpose at `/embark` → `/set-sail` → `/landfall` (Purpose is the one section deltas cannot carry — hand-edit is the sanctioned route, per `/finalize-spec-purposes`' guardrail)

## 4. Pre-merge verification

- [x] 4.1 `openspec validate add-map-skill --strict` passes
- [x] 4.2 `npm run lint` — zero errors, zero non-size warnings
- [x] 4.3 `npx tsc --noEmit` — zero errors
- [x] 4.4 `npm run build` — completes successfully
- [x] 4.5 `npm run test:coverage` — skipped — doc-only change (diff is CLAUDE.md, `.claude/**`, `openspec/**`, plus a comment-only edit to `.github/workflows/ci.yml`; no executable change, so the effects-test exemption holds; CI runs the full battery on the dev push)
- [x] 4.6 `npm run test:e2e` — skipped — doc-only change (diff is CLAUDE.md, `.claude/**`, `openspec/**`, plus a comment-only edit to `.github/workflows/ci.yml`; no executable change, so the effects-test exemption holds; CI runs the full battery on the dev push)
