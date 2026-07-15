<!--
review: spec-review
target: build-by-hand-text-link
anchor: 5194965
diff-source: git diff --staged
round: 1
-->

# Review — build-by-hand-text-link

## Round 1 — spec-review (2026-07-15)

A tight, well-scoped rename + affordance change: the failure screen's manual escape now mirrors the URL-entry idiom exactly. Contract audit is clean — `openspec validate --strict` passes, all 11 tasks are `[x]`, and every spec delta is satisfied by the code. One Minor diff-hygiene finding.

**Scope:** `git diff --staged` (10 files, +201/−19) · change `build-by-hand-text-link` (active)

## Findings

### Standard

_none_

### Convention

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Minor | `app/(main)/items/ui/components/itemform/deck/__tests__/FetchFailure.test.tsx:121` | Stray blank line added before the closing `});` of the top-level `describe` — a leftover edit artifact, not deliberate separation (no other block in the file is padded this way). | Fix now | CLAUDE.md § minimal, single-source fixes — the diff should carry only the rename and the affordance change |

### Contract

_none_

## What looks good

- **The design's central claim verifies.** `UrlEntryStep.tsx:59` really is `variant="link"`, default size, identical string, last child of a column-flex actions div; `FetchFailure.tsx:59` now matches it byte-for-byte. One idiom, two screens.
- **Decision 3 (no shared constant) is correctly reasoned.** Two copies, one line, no structure, and divergence fails loudly across six test files that assert the string — CLAUDE.md's DRY rule says stay inline, and it does.
- **`expectManualEntryIsLinkBelowStack()` asserts the actual contract**, not the rename: `link` class present, `secondary` absent, and last in DOM order. It tests de-emphasis (the point of the change), so a regression to a stacked peer button fails loudly. Applied uniformly across all three states, matching the spec's uniformity scenario.
- **The one comment in the diff earns its place** — it states the non-obvious WHY (de-emphasis is the whole point), not the WHAT.
- **Task notes are honest.** 1.3 records the owner's live verification and why no `deck.css` change followed; 2.3 flags itself as beyond the authored list with the reason (3.5 fails without it); 3.1 names the pre-existing size warning as untouched.
- **Copy stays truthful to the UI** — the capped-state sub-copy follows the rename, so no state names an action it doesn't show.

## Verdict

Request changes — not yet clear to archive (blockers: C1 open; CI unverified — a staged-diff invocation has no PR checks to read, so the local gate notes in tasks 3.1–3.5 are the only evidence).

C1 is a one-line deletion. Once it's gone, the archive gate rests on CI alone.
