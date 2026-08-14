# Tasks

## 1. Canonical label machine

- [x] 1.1 Reword the `UNCHARTED` row in `.claude/skills/map/reference/label-machine.md`: fog only — "scope not settled — born gated by an open decision ticket at exit, demoted, or migrated"; explicitly not a blocked marker
- [x] 1.2 Adjust the `CHARTED` row to note scope-settled-even-while-blocked, and add the sequencing invariant: chunk ordering lives exclusively in blocked-by relationships; a blocker landing moves no label and fires no skill
- [x] 1.3 Replace the closing "no separate not-cleared marker" line: `/embark` gates on both label `CHARTED` AND zero open blockers

## 2. /embark gate

- [x] 2.1 In `.claude/skills/embark/SKILL.md`, extend the boarding check to two conditions: label `CHARTED` AND zero open blockers, with the verified query `gh api --paginate repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by --jq '.[] | {number, state, title}'`
- [x] 2.2 Specify stop behaviors: open blocker → stop naming the blocking issue(s); closed blockers don't gate; a failed query stops loudly, never reads as "no blockers"
- [x] 2.3 Update the skill's frontmatter description to mention the blocker condition

## 3. /map exit rule

- [x] 3.1 In `.claude/skills/map/SKILL.md` § Exit, split the birth-label rule by gate type: chunks gated by residual open decision tickets born `UNCHARTED`; chunks merely sequenced behind other chunks born `CHARTED` with blocked-by wired; unblocked settled chunks `CHARTED` as before (update both the intro paragraph and step 3's "per its blocking" wording)

## 4. /anchor audit

- [x] 4.1 Audit `.claude/skills/anchor/SKILL.md` for any flip-on-blocking-chunk-landing duty and remove it if found (design audit found none); confirm promote reads as fog graduation only (decision resolved → chunk `CHARTED`)

## 5. CLAUDE.md audit

- [x] 5.1 Verify the § Trunk workflow label-machine sentence doesn't contradict the new semantics; edit only if it does (audit says the transition diagram stands)

## 6. One-time sweep of map #181

- [x] 6.1 Re-verify the live graph (`gh api …/dependencies/blocked_by` per open chunk of #181) against design Decision 6's classification; report any drift to the owner before flipping
- [x] 6.2 Flip chunk-only-gated chunks `UNCHARTED` → `CHARTED` (as of charting read: #191–#199); leave decision-gated chunks (#190 gated by #202, #200 gated by #201) `UNCHARTED`
- [x] 6.3 Comment on map #181 recording the sweep (rule applied, chunks flipped, chunks left, link to #203's semantics note)

## 7. Spec sync + validation

- [x] 7.1 Confirm delta specs under `openspec/changes/uncharted-fog-only/specs/` match the final skill wording (map-workflow label vocabulary + exit; trunk-workflow embark gate)
- [x] 7.2 Run `openspec validate --strict` clean
- [x] 7.3 Test gates: markdown/skills/specs-only change (sweep is `gh` label ops, no executable change) — mark test gates skipped with rationale; run `npm run lint` and `npx tsc --noEmit` locally
