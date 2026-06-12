# Tasks: tighten-file-size-red-band

## 1. Threshold change

- [x] 1.1 In `eslint.config.mjs`, change the production-source `max-lines` rule from `max: 500` to `max: 400` (leave `skipBlankLines`/`skipComments` and the `sonarjs/max-lines` rule untouched)

## 2. Documentation sync

- [x] 2.1 Update the active spec `openspec/specs/testing-foundation/spec.md` band requirement per this change's delta (red >400, yellow 300–400; scenarios "Red file blocks at lint" → 401+ and "Yellow file warns without blocking" → 300–400)
- [x] 2.2 Update CLAUDE.md "File size (red / yellow / green)" section: red >400, yellow 300–400
- [x] 2.3 Confirm no other doc or spec states the 500 red threshold (search repo docs for "500"; the test-exemption scenario's illustrative 500 stays)
- [x] 2.4 Update the active spec `openspec/specs/data-layer-organization/spec.md` module-size requirement per this change's delta (band restatement → red >400, yellow 300–400; the two band scenarios → 400)

## 3. Verification

- [x] 3.1 Confirm `npm run lint` output is unchanged from before the edit: zero errors, same two yellow `sonarjs/max-lines` warnings (`app/api/image-search/route.ts`, `useItemForm.ts`)

## 4. Pre-merge

- [x] 4.1 `npm run lint` — zero errors, zero warnings outside the yellow band
- [x] 4.2 `npx tsc --noEmit` — zero errors
- [x] 4.3 `npm run build` — completes successfully
- [x] 4.4 `npm run test:coverage` — zero failing tests, coverage reported (2104/2104 passed)
- [x] 4.5 `npm run test:e2e` — zero failing tests (18/18 passed)
