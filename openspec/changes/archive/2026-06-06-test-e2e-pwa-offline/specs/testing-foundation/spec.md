## ADDED Requirements

### Requirement: The PWA/offline e2e specs SHALL be authored against the foundation harness and recorded as Tier 2 bookkeeping

This carve-out (sub-proposal 6.2) SHALL author the PWA/offline `e2e/*.spec.ts` specs (service worker registration, install-detection surface, offline never-cache-HTML + precache behavior, kill-switch, and the safe-area/top-bar regression set) against the e2e execution harness owned by `test-e2e-foundation` (sub-proposal 6.0), in the authenticated session mode. The flow-level contract lives in the `e2e-pwa-offline` capability spec; the drift corrections and latent-invariant elevations live in the `pwa-shell` delta. The e2e *execution* model (local DB target, `next start` server mode, the two session modes, CI tiers) is `test-e2e-foundation`'s Tier-1 contribution to `testing-foundation`, NOT this carve-out's. THIS requirement is archive-only carve-out bookkeeping (Tier 2 per `test-coverage` design D13) and SHALL NOT roll into the parent `testing-foundation` accumulator.

This carve-out SHALL NOT reshape `playwright.config.ts`'s execution-model design, choose the DB driver/target, or define new e2e CI jobs (all owned by 6.0). It SHALL contribute NO per-file unit coverage and SHALL NOT alter `vitest.config.ts` thresholds (e2e is the integration tier). Install detection SHALL be asserted at the criteria level only — no `beforeinstallprompt` synthesis and no external service calls.

The seed negative-case audit for THIS carve-out's fixtures SHALL be recorded with its disposition: for each required fixture (any route rendering for the seeded viewer; a seeded list page to visit before going offline; a page where the floating items-pagination overlay renders), the audit SHALL state whether the spec builds its own state, selects defensively against seeded data, or required a `scripts/seed-dev-users.ts` extension carrying the seed-as-fixture review-coupling note.

#### Scenario: PWA/offline specs exist and run under the foundation harness

- **WHEN** this change archives
- **THEN** `e2e/` contains the PWA/offline specs (registration, install surface, offline, kill-switch, safe-area regression set)
- **AND** each runs under the foundation harness's authenticated session mode
- **AND** this carve-out did NOT reshape the harness execution-model design or DB target, nor define new e2e CI jobs

#### Scenario: No unit-coverage change

- **WHEN** this carve-out validates at archive time
- **THEN** `vitest.config.ts` per-file thresholds are unchanged by it

#### Scenario: Seed negative-case audit disposition is recorded

- **WHEN** this carve-out's `tasks.md` records the audit findings
- **THEN** the seed negative-case audit names each required fixture and its disposition (build-own-state, defensive selection, or seed extension)
- **AND** any seed extension is accompanied by the seed-as-fixture review-coupling note
