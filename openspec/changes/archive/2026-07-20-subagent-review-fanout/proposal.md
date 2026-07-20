## Why

`/spec-review`'s three-phase fan-out runs through the Workflow tool (`fanout.workflow.js`), whose ~4–5k-token description loads into every request of every session while reviews are its only consumer — and Workflow runs hide agent activity behind `journal.jsonl` where subagent transcripts are inline-inspectable. Decided on map #269 ([#272](https://github.com/JoshEddie/CTRLplusList/issues/272)): switch the fan-out to direct Agent-tool subagents so the Workflow tool can be dropped from the default tool set. Inherited constraint: `openspec/specs/spec-review/spec.md` § Multi-agent orchestration currently **mandates** the bundled-workflow invocation and schema-validated structured output — this change modifies that requirement.

## What Changes

- Retire `.claude/skills/spec-review/fanout.workflow.js`; `/spec-review` fans out its review phases as parallel Agent-tool calls issued in one message, one per bundled brief, under the current phase names (standard / convention / contract — the lane restructure is #274's cargo).
- Replace Workflow-layer schema validation with a reply-only-JSON convention: each agent replies with only a JSON object `{findings, deferredToCI}` whose finding fields match `reference/finding-format.md` § Finding shape. The skill parses each reply; a malformed reply gets exactly one retry via a follow-up message to the same agent; still-malformed aborts the review, naming the failed phase and showing the raw reply — no partial round is persisted.
- Preserve the fan-out return contract (`findings` + `deferredToCI` consolidation) and the skip-contract-phase behavior when no change resolves.
- Update the one `finding-format.md` sentence describing Workflow schema validation to describe the JSON-reply convention.
- No settings file ships in this repo: the Workflow tool disable (`permissions.deny: ["Workflow"]`) lives in the owner's machine-global `~/.claude/settings.json`, applied outside this change — a within-promise refinement of #279's charted "project settings" wording, to be recorded on map #269.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `spec-review`: the Multi-agent orchestration requirement changes from mandating a bundled-workflow invocation with schema-validated structured output to mandating direct parallel Agent-tool sub-agents with a reply-only-JSON convention, single-retry parse enforcement, and abort-on-persistent-malformed; the interactive-steps-stay-in-the-skill and resolved-inputs requirements carry forward unchanged.

## Impact

- `.claude/skills/spec-review/fanout.workflow.js` — deleted.
- `.claude/skills/spec-review/SKILL.md` — § Phase orchestration rewritten (Workflow invocation → parallel Agent-tool calls + parse/retry/abort); Contents entry updated.
- `.claude/skills/spec-review/reference/finding-format.md` — one wording update in § Finding shape.
- `openspec/specs/spec-review/spec.md` — delta to § Multi-agent orchestration.
- Briefs untouched; no app code; `/recheck-review` and `/release-review` specs mandate inline passes and are unaffected.
