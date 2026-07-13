# Establish spec-hygiene

## Why

Commit f459187 (made outside the OpenSpec pipeline) chained `scripts/check-spec-purposes.mjs` onto `npm run lint`, turning spec-Purpose completeness into a merge-blocking gate with no normative home. The review that followed established the gate is miscategorized: a TBD Purpose stub can only be created by the OpenSpec sync/archive workflow itself (the generated sync instruction says a new capability's Purpose "can be brief, mark as TBD"), never by an ordinary code commit — so a repo-wide merge gate polices thousands of commits that structurally cannot fail it. The invariant belongs to the workflow that births the violation, and the decision to demote it needs a spec home so it doesn't resurface as a gate later.

## What Changes

- Demote the spec-Purpose check from merge gate to advisory verifier: `npm run lint` reverts to `eslint .`; the script is exposed as `npm run check:specs` and remains the verification step of `/finalize-spec-purposes`. The `KNOWN_TBD` ratchet baseline is kept for grandfathered-stub burndown.
- Move enforcement to authorship time: `openspec/config.yaml` (`rules.specs` + context) and CLAUDE.md require a real Purpose to be authored whenever a change introduces a new capability, so the TBD stub is never born; `/finalize-spec-purposes` remains the repair path for legacy and escaped stubs.
- Create the `spec-hygiene` capability spec recording the invariant, the enforcement mechanism, and the rationale for why it is not a merge gate.
- Fix the stale pre-merge gate requirement in `testing-foundation`: four gates including `npm test` (now an interactive menu) → the five real gates (`npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:coverage`, `npm run test:e2e`).
- Align gate wording in `openspec/config.yaml`'s tasks rule (drop "eslint + spec-purpose gate") and CLAUDE.md's hard-rules digest and OpenSpec-workflow paragraph.

## Capabilities

### New Capabilities

- `spec-hygiene`: every capability spec carries a real (non-TBD) Purpose; Purposes are authored when the capability is created, repaired via `/finalize-spec-purposes` when a stub escapes, and verified by an advisory script that is deliberately not a merge gate.

### Modified Capabilities

- `testing-foundation`: the pre-merge gate requirement changes from four tasks (`lint`, `tsc --noEmit`, `build`, `npm test`) to the five actual gates, naming `npm run test:coverage` and `npm run test:e2e` explicitly.

## Impact

- `package.json` — `lint` script reverts to `eslint .`; new `check:specs` script.
- `openspec/config.yaml` — tasks-rule gate wording reverted; specs-rule addition requiring authored Purposes for new capabilities.
- `CLAUDE.md` — hard-rules digest gate line and OpenSpec-workflow paragraph updated.
- `.claude/skills/finalize-spec-purposes/SKILL.md` — reworded from "pairs with the lint gate" to advisory-verifier framing.
- `scripts/check-spec-purposes.mjs` — unchanged in behavior; no longer runs under `npm run lint`.
- No application code, tests, or runtime behavior affected.
