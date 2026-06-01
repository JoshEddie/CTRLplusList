## ADDED Requirements

### Requirement: pwa-shell capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `pwa-shell` capability carve-out — comprising the two executable source files `app/manifest.ts` and `app/ui/components/ServiceWorkerRegistration.tsx` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `__tests__/` directories mirroring their source locations: `app/__tests__/manifest.test.ts` (node project — `manifest.ts` is a DOM-free pure factory) and `app/ui/components/__tests__/ServiceWorkerRegistration.test.tsx` (jsdom project). `app/manifest.ts` SHALL be removed from `vitest.config.ts`'s `coverage.exclude` list (its R1 field-value contract is substantive, testable behavior — not a no-executable-behavior constant table). `app/sw.ts` SHALL remain in `coverage.exclude` (out of carve-out; covered at the e2e layer by sub-proposal 6.2 `test-e2e-pwa-offline`). The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for both carve-out files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import `manifest` or `<ServiceWorkerRegistration />` SHALL inherit the assumption that those modules are tested and complexity-locked.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `app/manifest.ts` and `app/ui/components/ServiceWorkerRegistration.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** both per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Manifest is no longer coverage-excluded

- **WHEN** a contributor inspects `vitest.config.ts`'s `coverage.exclude` after this change archives
- **THEN** `app/manifest.ts` is absent from the exclude list and present in the `thresholds` map
- **AND** `app/sw.ts` remains in the exclude list

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits either carve-out file to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/__tests__/manifest.test.ts` and `app/ui/components/__tests__/ServiceWorkerRegistration.test.tsx`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `app/ui/components/ServiceWorkerRegistration.tsx` changes the registration path away from `/sw.js`, drops the `{ scope: '/' }` option, removes the `'serviceWorker' in navigator` feature-detection guard, or stops swallowing the registration rejection
- **THEN** the corresponding colocated test in `ServiceWorkerRegistration.test.tsx` fails with an assertion naming the specific contract break
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change to `app/manifest.ts` alters a declared field value (name, short_name, display, theme/background color, or the four-entry icon matrix) or references an icon `src` that does not exist under `public/icons/`
- **THEN** the corresponding colocated test in `manifest.test.ts` fails with an assertion naming the specific field or missing file
- **AND** the `test` pre-merge gate fails
