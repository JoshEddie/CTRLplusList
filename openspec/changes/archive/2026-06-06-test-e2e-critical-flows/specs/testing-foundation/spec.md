## ADDED Requirements

### Requirement: The critical-flow e2e specs SHALL be authored against the foundation harness and recorded as Tier 2 bookkeeping

This carve-out (sub-proposal 6.1) SHALL author the critical-flow `e2e/*.spec.ts` specs (sign-in surface + bypass session, create list, add items, set visibility, share, friend claim with spoiler hiding, owner sees claim, and the REQUIRED logged-out guest claim on a public list) against the e2e execution harness owned by `test-e2e-foundation` (sub-proposal 6.0). The flow-level contract lives in the `e2e-critical-flows` capability spec; the e2e *execution* model (local DB target, `next start` server mode, the two session modes, CI tiers) is `test-e2e-foundation`'s Tier-1 contribution to `testing-foundation`, NOT this carve-out's. THIS requirement is archive-only carve-out bookkeeping (Tier 2 per `test-coverage` design D13) and SHALL NOT roll into the parent `testing-foundation` accumulator.

This carve-out SHALL NOT reshape `playwright.config.ts`'s execution-model design, choose the DB driver/target, or define new e2e CI jobs (all owned by 6.0). Operational hardening of the existing CI/harness jobs (e.g. CI retries, failure-artifact upload, the location of the type gate) is distinct from that execution-model design and is not precluded. It SHALL contribute NO per-file unit coverage and SHALL NOT alter `vitest.config.ts` thresholds (e2e is the integration tier). The sign-in surface SHALL be asserted at the affordance level only — no real Google OAuth handshake.

The seed negative-case audit for THIS carve-out's fixtures SHALL be recorded with its disposition: for each required fixture (a viewer-owned list carrying a claim; a friend-owned Shared list with a claimable item; a public Shared list with a guest-claimable item), the audit SHALL state whether the flow builds its own state, selects defensively against seeded data, or required a `scripts/seed-dev-users.ts` extension carrying the seed-as-fixture review-coupling note.

#### Scenario: Critical-flow specs exist and run under the foundation harness

- **WHEN** this change archives
- **THEN** `e2e/` contains the critical-flow specs (sign-in surface + bypass, list lifecycle, owner spoiler, friend claim, guest claim)
- **AND** each spec runs under the foundation harness session mode (authenticated or logged-out) its flow requires
- **AND** this carve-out did NOT reshape the harness execution-model design or DB target, nor define new e2e CI jobs (operational hardening of the existing CI/harness jobs is folded in by owner decision — distinct from that design)

#### Scenario: Guest-claim pin runs unauthenticated

- **WHEN** the guest-claim spec executes
- **THEN** it runs under the logged-out session mode with no injected session
- **AND** a regression re-blocking unauthenticated claims on public lists fails the spec

#### Scenario: No unit-coverage change

- **WHEN** this carve-out validates at archive time
- **THEN** `vitest.config.ts` per-file thresholds are unchanged by it

#### Scenario: Seed negative-case audit disposition is recorded

- **WHEN** this carve-out's `tasks.md` records the four-audit findings
- **THEN** the seed negative-case audit names each required fixture and its disposition (build-own-state, defensive selection, or seed extension)
- **AND** any seed extension is accompanied by the seed-as-fixture review-coupling note
