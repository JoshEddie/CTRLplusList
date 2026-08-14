## Context

`/spec-review`'s Phase orchestration section invokes the Workflow tool with `scriptPath: fanout.workflow.js`, passing Phase-0-resolved `args` (`diffCmd`, `changeName`, `archiveState`, `briefs`). The script builds a per-phase prompt, runs 2–3 agents via `parallel()`, and returns `{findings, deferredToCI}` validated by a structured-output schema (`FINDINGS_SCHEMA`). The spec (`openspec/specs/spec-review/spec.md` § Multi-agent orchestration) mandates this shape. Map #269 / #272 decided to switch to direct Agent-tool subagents; #274 will later restructure the lanes (A/B/C), so this conversion keeps the current phase names to stay engine-only.

## Goals / Non-Goals

**Goals:**

- Engine swap only: Workflow invocation → parallel Agent-tool calls, identical review semantics and consolidation contract.
- Findings validation moves into the skill as a parse + single-retry + abort convention.
- The Workflow tool becomes unreferenced by the repo, so it can be denied machine-globally.

**Non-Goals:**

- Lane restructure (A Alignment / B Boundary / C Convention) — #274.
- Any change to briefs' review content, the report/round format, verdict logic, CI read, or persistence.
- Shipping a settings file — the deny lives in the owner's `~/.claude/settings.json`, outside the repo.

## Decisions

### Fan-out mechanics

SKILL.md § Phase orchestration instructs the orchestrating session to issue all phase agents (3, or 2 when no change resolved) as Agent-tool calls **in a single message** so they run concurrently — replacing the workflow's `parallel()`. Each prompt is the same content the workflow's `auditPrompt()` built: identity line, Read-your-brief-first pointer, `diffCmd` to produce the diff, phase key; the contract agent additionally receives `changeName`, `archiveState`, the reconciliation-latitude framing, and the deferredToCI instruction. *Why over sequential calls:* preserves the existing wall-clock shape and the spec's "parallel sub-agents" requirement.

### Reply convention (replaces the schema)

Each prompt ends: reply with **only** a JSON object `{"findings": [...], "deferredToCI": [...]}` — no prose, no code fence required (a fenced JSON block is tolerated at parse time) — where each finding carries exactly the six fields of `finding-format.md` § Finding shape (`phase`, `location`, `description`, `severity`, `citation`, `disposition`) with `phase` set to the agent's own key. `deferredToCI` is meaningful only from the contract agent; absent arrays default to empty. *Why prompt-carried over brief-carried:* briefs stay review-content-only and the shape stays single-sourced in `finding-format.md` (its § Finding shape sentence is updated from "the workflow's structured-output schema validates it" to describe this convention). Alternative rejected: adding an output section to each of the three briefs — states the shape in four places, drift-prone.

### Parse, retry, abort

The skill parses each reply (strip an optional code fence, `JSON.parse`-equivalent read, check: object, `findings` array, each finding has the six fields with the enumerated `phase`/`severity`/`disposition` values). On failure: **one** follow-up message to the same agent — "reply was not valid findings JSON; resend only the JSON object" — reusing the agent's existing review context rather than re-running the phase (*why over a fresh Agent call:* the review work is done; only formatting failed). Still malformed after the retry: **abort the review** — name the failed phase, show the raw reply, persist no round. *Why abort over a partial round:* a round missing an arena is not a valid round; rerunning is cheap. Both behaviors become spec scenarios.

### Consolidation unchanged

The skill concatenates the per-agent `findings` and `deferredToCI` exactly as the workflow's return did; everything downstream (CI read, report skeleton, verdict, persistence, adjudication handoff) is untouched.

### Workflow-tool disable is out-of-repo

`permissions.deny: ["Workflow"]` (fact-checked as the sole settings lever; it removes the tool schema from context and blocks invocation — no `disallowedTools` settings key exists) goes in the owner's machine-global `~/.claude/settings.json`, applied by the owner outside this change. The repo ships no settings file; `.claude/settings.local.json` is untouched. This refines #279's charted "project settings" wording — within-promise, recorded on map #269 by the boarding session's bookkeeping.

## Risks / Trade-offs

- [Prompt-level JSON convention is weaker than tool-layer schema validation — an agent can return subtly wrong field values that parse] → the parse check enforces the enums and required fields, which is what the schema enforced; content quality was never schema-guaranteed.
- [Retry via follow-up message depends on the harness's agent-continuation mechanism] → on a continuation failure (agent unreachable), treat as still-malformed and abort per the same rule; the abort path is the designed fallback.
- [Denying Workflow machine-globally affects other repos on the owner's machine] → owner's explicit choice; no other project of theirs consumes Workflow, and the deny is reversible in one settings line.
- [#274 restructures lanes on top of this engine] → conversion keeps phase names and brief filenames untouched, so #274's diff stays lane-content-shaped, not engine-shaped.
