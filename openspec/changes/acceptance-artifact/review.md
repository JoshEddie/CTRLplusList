---
review: spec-review
target: acceptance-artifact
anchor: 18ffd1ad3d39f9a25d591f6782dce76e0eb6d2f2
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-07-23)

Artifact-only change; no executable source touched. Structure and prose solid, but three delta/canonical-corpus disagreements and one no-op validate command block the archive gate.

**Scope:** `git diff --staged` @ `18ffd1a` · acceptance-artifact (active)

### Alignment
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1 | Minor | `specs/review-artifact/spec.md:5-8` ↔ `openspec/specs/review-artifact/spec.md:58-63` | MODIFIED requirement rewrites the scaffold requirement to assert both the `apply.requires` listing AND that `/opsx:apply` auto-loads `review.md`; canonical `review-artifact` already owns the auto-load contract in its own requirement, so after sync the corpus holds the same SHALL twice under two headings. Only the stale "SHALL NOT be listed" sentence needed replacing. Reconcile by narrowing the MODIFIED requirement to the `apply.requires` listing + non-blocking claim, or by adding a MODIFIED/REMOVED delta for the existing auto-load requirement. | Fix now | canonical `review-artifact` "Requirement: review.md is auto-loaded into apply context" |

### Boundary
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B2 | Major | `specs/acceptance-artifact/spec.md:363-370` | New SHALL adds a third input to the map-wide e2e scout, but the requirement owning the scout's inputs (`openspec/specs/map-workflow/spec.md:266`) still enumerates only summary comments and landed code, and no MODIFIED delta updates it. The SKILL.md edit lands the behavior while the owning capability spec stays stale. | Fix now | `openspec/config.yaml` rules.specs — "Cross-capability constraints belong in the capability that owns the behavior"; `.claude/skills/port-inspection/SKILL.md:43` |
| B3 | Minor | `specs/acceptance-artifact/spec.md:372-376` | Scenario asserts the scout reads archived `acceptance.md` "instead of reconstructing behavior from commits and summaries", contradicting map-workflow's standing scenario (spec:275-276) and the SKILL.md text this change writes — both keep both paths. Archived flows are an additive hint, not a replacement input. | Fix now | `openspec/specs/map-workflow/spec.md:275-276`; `.claude/skills/port-inspection/SKILL.md:43` |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C4 | Minor | `tasks.md:462` | Task 4.2 is checked off asserting `openspec validate --strict` ran clean, but that command as written validates nothing — it exits with "Nothing to validate. Try one of: --all / --changes / --specs" in a non-interactive shell, so the fork-integrity check was never exercised. `npx openspec validate --changes --strict` does pass; the fix is the command text, not the artifacts. | Fix now | CLAUDE.md trunk workflow — "`openspec validate --strict` in the pre-merge gate catches a structurally broken fork" |

### What looks good
- Fork rename rationale (`spec-driven-review`) and the non-shadowing argument carried through `schema.yaml` cleanly.
- `acceptance.md` template mirrors the existing artifact templates; no parallel conventions invented.
- Change scaffolded through the real workflow (review.md `round: 0` scaffold present, 12/12 tasks), `openspec validate acceptance-artifact --strict` passes.
- No executable source touched, so the test/coverage gates are legitimately out of scope.

**Deferred to CI:** lint · tsc · build (tasks 5.1–5.3). CI unverified — non-PR invocation.

**Verdict:** findings remain — A1, B2, B3, C4 open `Fix now`; CI unverified.

### Adjudications (2026-07-23)

| # | Old → New | Rationale |
|---|-----------|-----------|
| B3 | Fix now → Fix now (direction reversed) | Owner settled scout semantics as replacement-with-fallback: archived `acceptance.md` is per-chunk truth at land time (spec-review catches drift and updates it before archive; staleness comes only from later voyages, adjudicated against canonical specs). The delta scenario's "instead of reconstructing" wording stands; the fix targets `.claude/skills/port-inspection/SKILL.md:43` — replace "also reads… hint, not truth" with archived flows as the primary walk source, summary comments/commits reconstruction only as fallback for chunks lacking an archived `acceptance.md` (legacy). |
| B2 | Fix now → Fix now (shape amended) | Still owes a MODIFIED `map-workflow` delta, but per B3's settled semantics it rewrites the scout's input enumeration to replacement-with-fallback rather than appending archived `acceptance.md` as a third co-equal input; the legacy-sub-issue scenario (map-workflow spec:275-276) survives as the no-archive fallback path. |

**Verdict:** findings remain — A1, B2, B3, C4 open `Fix now` (dispositions unchanged; B2/B3 fix direction amended above); CI unverified.

## Round 2 — recheck (2026-07-23)

All four round-1 findings resolved. The fix delta moved both the implementation
side (`.claude/skills/port-inspection/SKILL.md`) and the spec side (a new
`map-workflow` MODIFIED delta plus edits to the `review-artifact` delta and
proposal), so the delta is mixed and the round escalates.

**Scope:** `git diff` (unstaged, incl. untracked `specs/map-workflow/`) @ `18ffd1a` · acceptance-artifact (active)

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| A1 | MODIFIED `review-artifact` requirement duplicated the auto-load SHALL | resolved | Delta requirement narrowed to the `apply.requires` listing + non-blocking claim; the auto-load SHALL stays solely in canonical `openspec/specs/review-artifact/spec.md:58`. |
| B2 | Scout input change had no owning-capability delta | resolved | `specs/map-workflow/spec.md` adds a MODIFIED delta whose requirement heading matches canonical `openspec/specs/map-workflow/spec.md:264` exactly and carries all four canonical scenarios; proposal's Modified Capabilities lists `map-workflow`. |
| B3 | SKILL.md kept archived flows as an additive hint, contradicting the delta scenario | resolved | `.claude/skills/port-inspection/SKILL.md:43` now makes archived `acceptance.md` the primary walk source with summary/commit reconstruction as fallback, matching the adjudicated replacement-with-fallback semantics. |
| C4 | Task 4.2 asserted a no-op validate command | resolved | Task text now `npx openspec validate --changes --strict`; re-run clean (`1 passed, 0 failed`). |

### Convention
| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C5 | Minor | `tasks.md:56` | The round-1 gate section is malformed against the gate-section contract: heading is `## Gates — round 1` rather than a numbered `## 6. Gates — round 1` continuing the file's sequence, items are unnumbered, the pointer lead-in ("findings by durable ID are in `review.md` Round 1") is absent, and the verification gate set is not restated — lint/tsc/build owe items even under the doc-only exemption, which covers only the two test gates. | Fix now | `.claude/skills/spec-review/reference/finding-format.md` § Gate sections in tasks.md |

### What looks good
- The `map-workflow` MODIFIED requirement is a full restatement, not a fragment — every canonical scenario survives, and the legacy scenario is correctly re-aimed at the missing-`acceptance.md` case rather than deleted.
- Proposal's inherited-constraints line was updated in step with the new delta, so the stated boundary no longer contradicts the change's own footprint.
- Fix delta touched nothing outside the four findings' surface.

**Verdict:** outgrew recheck — the fix delta touched both code (`.claude/skills/port-inspection/SKILL.md`) and spec artifacts (new `map-workflow` delta, `review-artifact` delta, proposal); the contract moved. Run `/incremental-spec-review` for round 3; C5 remains open regardless.

### Adjudications (2026-07-23)

| # | Old → New | Rationale |
|---|-----------|-----------|
| — | outgrew recheck → clear to land | Owner declined the escalation: the "code" side of the mixed delta is `.claude/skills/port-inspection/SKILL.md`, markdown like every other file in this change, so `/incremental-spec-review` buys nothing a recheck did not already cover. The tell is recorded; the routing is overridden by owner call. |
| C5 | Fix now → resolved in-round | Round-1 gate section rewritten to the gate-section contract (`## 6. Gates — round 1`: numbered items, pointer lead-in, doc-only exemption noted, lint/tsc/build restated); round-2 section renumbered to `## 7.`. Gates re-run clean: lint zero errors, `tsc --noEmit` zero errors, `npm run build` succeeds. |

**Verdict:** clear to land
