## Why

`/anchor` holds five moves (promote, demote, charter, re-sync, mid-voyage triage) and hedges on which applies at every invocation, while the shared issue-creation mechanics live inside `/map`'s narrative so every other consumer (`/split-map`, anchor's charter, the coming `/port-inspection` e2e cut in #277) reuses them only through "thin wrapper" framings. Issue #275 settled the decomposition: mechanics extract into map-owned reference docs, judgment stays with each caller, and triage — the one move that touches the working tree — leaves the definition layer entirely for a new execution-layer skill, `/run-aground`. Inherited constraints: `map-workflow` spec's guardrails requirement (definition layer writes only GitHub issues, with the park exception this change deletes), its bearing-moves requirement ("/anchor SHALL own all bearing moves, including mid-voyage triage") which this change splits, and `trunk-workflow`'s mirage scenario ("a mirage stops work and fires `/anchor`") which repoints.

## What Changes

- Three map-owned reference docs under `.claude/skills/map/reference/` (label-machine model — followed by citation, never invocable), holding mechanics only; judgment stays with each caller:
  - `issue-cut.md` — issue birth on a map, kind-driven: id lookup, sub-issue POST, blocked-by wiring, owner-approved body, no milestone; per-kind rules for chunk (birth label `CHARTED`/`UNCHARTED`), `PLOTTING`, `SCOUTING` (fires at creation) and the deferred-`SCOUTING` variant (created unfired; fires when all blockers close — spec'd here, consumed by #277). Becomes the sole birth-label rule-set; cites `label-machine.md` for vocabulary, never restates it.
  - `map-body.md` — the five-section template (moves out of map SKILL.md) + edit discipline: index-not-store, gist lines with title-wrapped links, section moves, re-sync procedure; creation = editing from blank.
  - `demotion.md` — reopen the original ticket, post invalidation evidence, move gist → Not yet specified marked *reopened*, flip dependent chunks `CHARTED`→`UNCHARTED`, wire the reopened ticket blocked-by onto them.
- `/map` SKILL.md — § GitHub mechanics deleted (lives in `issue-cut.md`); the five-section template moves to `map-body.md`; chart, exit, work, and re-enterable-exit sections cite the docs.
- `/anchor` SKILL.md rewritten — dispatch table at top (observable state → move), four moves (promote, demote, charter, re-sync) as judgment kernel + doc citation; triage section removed; guardrails collapse to "GitHub issue writes only, never the tree" — the tree-exception clause deleted.
- **New skill `/run-aground`** (execution layer) — dark mirror of `/landfall`; trigger: mirage strikes an `UNDER SAIL` issue. Executes `demotion.md`, then the blast-radius call (AskUserQuestion): patch at sea (change amended in place, stays `UNDER SAIL`) / park → `ADRIFT` (`adrift/issue-<N>` branch, one WIP commit staged never signed, dev restored clean) / discard → `UNCHARTED` (tree cleaned, fresh proposal later). Owns the tree exception, stage-never-sign, and the resume path.
- `/split-map` — "permanent thin wrapper" framing dropped → peer consumer of the reference docs; "resolve via `/landfall` or `/anchor`" → "`/landfall` or `/run-aground`".
- `/set-sail` — mid-voyage mirage discipline repoints from anchor's triage to `/run-aground`; charter routing through `/anchor` stays.
- `reference/label-machine.md` — stamper column reworked: transparent-wrapper paragraph replaced by the cut-doc rule; `ADRIFT` and discard-`UNCHARTED` stamped by `/run-aground`.
- CLAUDE.md § Trunk workflow — fleet-route line splits "`/anchor` for discoveries" into anchor (map bearing moves) + `/run-aground` (mid-voyage mirages).
- No changes: `/embark` (its anchor citations are demote/bearing-change routing), `/close-map`, `/landfall`, `/adjudicate-review` (negative citation stays valid), `/port-inspection` (cross-reference check only; e2e-cut consumption is #277's scope).

## Capabilities

### New Capabilities

- `anchor-and-run-aground`: one capability spec for both skills (owner-settled — heavy overlap: run-aground's first step executes anchor's demotion doc). Anchor's four bearing moves extracted from `map-workflow` as definition-layer requirements (GitHub-writes-only, no tree exception); run-aground's mirage response as execution-layer requirements (triage, patch/park/discard, `ADRIFT` stamping, tree exception, stage-never-sign, resume path). Layer seam visible as separate requirements.

### Modified Capabilities

- `map-workflow`: bearing-moves requirement and its triage scenarios removed (moved to `anchor-and-run-aground`); label-stamping scenario reassigns `ADRIFT`/discard-`UNCHARTED` to `/run-aground`; thin-wrapper carve-outs rephrased to the cut-doc rule; guardrails requirement drops the park exception and the `/anchor` listing (its contract now lives in the new spec) — map-side skills become pure GitHub-writes; split-map requirement reframed as peer consumer resolving via `/landfall` or `/run-aground`; map-body requirement's "template inline in SKILL.md" → template lives in `map-body.md`.
- `trunk-workflow`: "a mirage stops work and fires `/anchor`" → `/run-aground`; departure-time anchor fire (embark terrain check) stays — that's demote.

## Impact

Skill/doc-only change — no app code, no DB, no tests affected. Touched: `.claude/skills/map/` (SKILL.md + three new reference docs + `reference/label-machine.md`), `.claude/skills/anchor/SKILL.md` (rewrite), `.claude/skills/run-aground/` (new), `.claude/skills/split-map/SKILL.md`, `.claude/skills/set-sail/SKILL.md`, `CLAUDE.md`, `openspec/specs/map-workflow/`, `openspec/specs/trunk-workflow/`, new `openspec/specs/anchor-and-run-aground/`. Constraints: half-finished work never merges to `dev`; stage-never-sign survives in `/run-aground`'s park; `label-machine.md` stays the vocabulary home; `issue-cut.md` becomes the sole birth-label rule-set.
