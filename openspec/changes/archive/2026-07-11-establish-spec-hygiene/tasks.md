# Tasks — establish-spec-hygiene

## 1. Demote the gate

- [x] 1.1 Revert `lint` script in `package.json` to `eslint .`
- [x] 1.2 Add `check:specs` script running `node scripts/check-spec-purposes.mjs`
- [x] 1.3 Run `npm run check:specs` standalone and confirm it still passes (baseline intact, no behavior change)

## 2. Build the workflow bridge

- [x] 2.1 Add a `rules.specs` rule to `openspec/config.yaml`: a delta introducing a new capability MUST state the capability's Purpose (1–3 sentences) so sync/archive writes it instead of a TBD stub
- [x] 2.2 Revert the tasks-rule gate wording in `openspec/config.yaml` from "eslint + spec-purpose gate" back to plain eslint
- [x] 2.3 Update `CLAUDE.md` hard-rules digest: lint gate is pure eslint; add the Purpose-authorship rule to the OpenSpec workflow paragraph and reframe `check-spec-purposes.mjs` as advisory verifier (not "the lint gate that blocks new stubs")
- [x] 2.4 Reword `.claude/skills/finalize-spec-purposes/SKILL.md`: "pairs with the lint gate" → advisory verifier via `npm run check:specs`; fix the step-5 note that skipping baseline pruning "fails `npm run lint`"

## 3. Verify the demotion end-to-end

- [x] 3.1 Temporarily stub a Purpose to TBD in a scratch copy or via `git stash`-able edit: confirm `npm run check:specs` exits non-zero naming it while `npm run lint` passes; restore
- [x] 3.2 Grep repo for remaining claims that spec-purpose checking rides lint (`grep -ri "spec-purpose" --include="*.md" --include="*.json" --include="*.yaml"`) and fix stragglers

## 4. Pre-merge

- [x] 4.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 4.2 `npx tsc --noEmit` — zero errors
- [x] 4.3 `npm run build` — completes clean
- [x] 4.4 `npm run test:coverage` — zero failing tests
- [x] 4.5 `npm run test:e2e` — zero failing tests
