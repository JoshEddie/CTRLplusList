# Tasks: adopt-trunk-flow

## 1. Shared review-report format

- [x] 1.1 Extend `.claude/skills/spec-review/reference/finding-format.md` with the persisted-report contract: the machine-readable header (`review:` type, `target:`, `anchor:` sha, `diff-source:`, `round:`), round-append structure, and the round-verdict vocabulary (`clear to land` / `findings remain` / `outgrew recheck`; release: `ready to cut` / `not ready`)

## 2. spec-review update

- [x] 2.1 Update `.claude/skills/spec-review/SKILL.md`: no-arg scope is `--staged` unconditionally (branch review takes an explicit PR reference or ref range), keeping PR/change-name/diff forms and the PR CI read unchanged
- [x] 2.2 Add report persistence to `SKILL.md`: write the consolidated report to `openspec/changes/<name>/review.md` with the shared header, append-on-repeat, no file when contract audit was skipped
- [x] 2.3 Retire the "reviewed once, never re-reviewed" framing in favor of the round model (full review → recheck rounds → optional escalated full review)

## 3. recheck-review skill (new)

- [x] 3.1 Create `.claude/skills/recheck-review/SKILL.md`: header-driven target resolution (auto-select single open report; ask when ambiguous), delta lookup (spec-review → unstaged diff; release-review → `git diff <anchor>..dev`), inline single-pass finding verification (resolved / still open / new-issue), append-only rounds, escalation tells (files outside original diff, delta rivals original), verdict vocabulary from the shared reference

## 4. start-change skill (new)

- [x] 4.1 Create `.claude/skills/start-change/SKILL.md`: preconditions (on `dev`, clean tree, up to date with origin — hard stop otherwise), `gh issue view` read, label routing (`IDEA`/`EXPLORE NEEDED` → explore; `HOLD` → surface hold comment + confirm; none → propose from issue body), explore write-back (distilled outcome into issue body, strip label), negative-IDEA path (findings comment, swap to `HOLD`, stop), no commits ever
- [x] 4.2 Create the `HOLD` label (`gh label create HOLD --description "Explored and parked: not viable now; see hold comment. Revisit deliberately." --color <pick>`)

## 5. land-change skill (new)

- [x] 5.1 Create `.claude/skills/land-change/SKILL.md` as a state-driven two-phase command. Land phase (gated, unpushed): gate checks (latest `review.md` round verdict clear, all tasks `[x]`, `openspec validate <name> --strict`, local `npm run lint` + `npx tsc --noEmit`), stage the `issue-<N>:` work commit and hand off for signing (NEVER run `git commit`, never retry a blocked signature — stage, report, stop), after the owner signs: push to `dev` and report the CI run (`gh run list --branch dev`). Seal phase (pushed, CI green, change still active): confirm the owner's live dev click-test, archive via the OpenSpec archive flow, stage the `issue-<N>: archive <change>` commit, and after signed push run `/finalize-spec-purposes` + milestone-assign + `gh issue close`. Red CI / failed live check → fix-forward commit under the same prefix. Resumable: re-invocation detects phase from repo state

## 6. release-review skill (new)

- [x] 6.1 Create `.claude/skills/release-review/SKILL.md` (ported from the budget repo, adapted): preflight hard gates (release-branch base pattern, milestone present), five inline dimensions (milestone completeness, cross-feature interaction risk, migration ordering, OpenSpec state clean, version bump vs milestone title), bump drafting (stage + owner commits, never auto-commit), CI rollup read with red-blocks/pending-unverified semantics, report persisted to `openspec/reviews/<version>.md` with the shared header, verdict `ready to cut`/`not ready`, no changelog phase, no re-litigating per-change findings
- [x] 6.2 Create `openspec/reviews/` with a short README stating the directory convention (one persisted release-review report per version; doubles as the release record)

## 7. CI and dead code

- [x] 7.1 Add `push: branches: [dev]` to `.github/workflows/ci.yml` triggers and update the stale "trunk branches always flow through PRs" comment
- [x] 7.2 Delete `app/changelog/` (`releases.ts`; zero importers — verify again before deleting)
- [x] 7.3 Remove the `app/changelog/releases.ts` carve-outs: eslint file-size exemption in `eslint.config.mjs` and the coverage exclude (vitest config), matching the testing-foundation delta

## 8. Docs

- [x] 8.1 Rewrite the CLAUDE.md workflow sections: trunk-flow lifecycle (start-change → apply → staged spec-review → recheck rounds → two-phase land-change with live-dev verification before archive), the one-change-at-a-time and skills-never-commit rules, review-report persistence, release-cut flow (PR to `x.y.x`, release-review, plain merge to `main`), branch+PR escape hatch; drop council/release-check references
- [x] 8.2 Update the hard-rules digest and read-first table in CLAUDE.md if the rewrite moved their anchors

## 9. Pre-merge

- [x] 9.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 9.2 `npx tsc --noEmit` — zero errors
- [x] 9.3 `npm run build` — completes clean
- [x] 9.4 `npm run test:coverage` — zero failing tests
- [~] 9.5 `npm run test:e2e` — deferred to PR CI (nothing in this change touches runtime the e2e suite exercises)
