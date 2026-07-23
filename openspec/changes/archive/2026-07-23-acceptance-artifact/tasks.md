# Tasks — acceptance-artifact

## 1. Schema fork

- [x] 1.1 Add `acceptance` artifact block to
      `openspec/schemas/spec-driven-review/schema.yaml`: `generates:
      acceptance.md`, `template: acceptance.md`, `requires: [specs]`,
      instruction encoding the propose-time draft (chain touched scenarios +
      pre-existing canonical-spec links; gaps fold back into delta specs)
- [x] 1.2 Set `apply.requires: [tasks, review, acceptance]` and add an apply
      instruction line framing acceptance.md as the end-state picture to
      implement toward, refining flows with literal handles
- [x] 1.3 Create `openspec/schemas/spec-driven-review/templates/acceptance.md`
      with the uniform Given/When/(And…)/Then flow format and the "no manual
      path — fully automated" exemption
- [x] 1.4 Update the fork-note comment in schema.yaml to name `acceptance` as
      a local addition alongside `review`

## 2. Config rules

- [x] 2.1 Encode the content contract in the acceptance artifact's schema
      instruction (fork is repo-owned; no config.yaml rules override): uniform
      GWT rows, Given carries viewer/precondition state, per-flow granularity,
      fully-automated exemption, propose-draft vs apply-refine lifecycle, no
      test-plan content

## 3. Consumers and docs

- [x] 3.1 Edit `.claude/skills/port-inspection/SKILL.md`: map-wide e2e scout
      reads archived acceptance.md files newest-first as walk scripts —
      hint-not-truth caveat, canonical specs adjudicate mismatches
- [x] 3.2 Update CLAUDE.md trunk-workflow fork-reconciliation sentence to
      preserve the `acceptance` addition alongside `review`

## 4. Dogfood

- [x] 4.1 Draft `openspec/changes/acceptance-artifact/acceptance.md` for this
      change itself (schema now requires it for apply), flows covering the
      artifact-registration and scout-consumer requirements or marked "no
      manual path" where fully automated
- [x] 4.2 Verify `openspec status --change acceptance-artifact --json` shows
      `acceptance` resolved and `applyRequires` = tasks, review, acceptance;
      run `npx openspec validate --changes --strict` clean

## 5. Pre-merge

Doc-only change — every file in the diff is markdown/`openspec/**`/`.claude/**`
skills, none can affect test outcomes, so the `test:coverage` and `test:e2e`
gates are omitted per the doc-only exemption.

- [x] 5.1 `npm run lint` — zero errors, zero warnings
- [x] 5.2 `npx tsc --noEmit` — zero errors
- [x] 5.3 `npm run build` — completes successfully

## 6. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.
>
> `npm run test:coverage` and `npm run test:e2e` are omitted per the doc-only
> exemption — this change touches no executable source.

- [x] 6.1 A1 reconcile the MODIFIED `review-artifact` requirement against canonical's existing auto-load requirement (one home for the auto-load SHALL) — resolved
- [x] 6.2 B2 add a MODIFIED delta to `map-workflow` rewriting the e2e scout's input enumeration to replacement-with-fallback: archived `acceptance.md` primary, summary/commit reconstruction only for chunks lacking one — resolved
- [x] 6.3 B3 make `.claude/skills/port-inspection/SKILL.md:43` treat archived flows as the primary walk source, summaries/commits as fallback only — resolved
- [x] 6.4 C4 fix task 4.2's command text to `npx openspec validate --changes --strict` and re-run it — resolved
- [x] 6.5 `npm run lint` — zero errors, zero non-size warnings
- [x] 6.6 `npx tsc --noEmit` — zero errors
- [x] 6.7 `npm run build` — completes successfully

## 7. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.
>
> `npm run test:coverage` and `npm run test:e2e` are omitted per the doc-only
> exemption — this change touches no executable source.

- [x] 7.1 C5 rewrite the round-1 gate section to the gate-section contract (numbered section + items, pointer lead-in, verification gates restated) — resolved
- [x] 7.2 `npm run lint` — zero errors, zero non-size warnings
- [x] 7.3 `npx tsc --noEmit` — zero errors
- [x] 7.4 `npm run build` — completes successfully
