# Testing notes

Read this file before adding, modifying, or reviewing any test in this repo.

## Test quality bar

Any test you add MUST assert observable behavior — what the production code returns, renders, throws, persists, or sends over the network. Coverage is not enough; "did the line execute" is not the bar. The bar is "would this test fail if the production code were subtly wrong."

**Do not write:**

- **Execute-for-coverage tests** — calling a function with no `expect(...)` on the result, error, or side effect, written purely to lift the coverage number.
- **Tautological assertions** — assertions that hold for any input: `expect(arr.length).toBeGreaterThanOrEqual(0)`, `expect(true).toBe(true)`, comparisons of a value against itself, lone `expect(x).toBeDefined()` / `expect(x).toBeTruthy()` on a value the test itself constructed.
- **Vague assertions on values your test built** — asserting `expect(result).toBeTruthy()` on something you just created with `createList(...)` proves nothing about `createList`.
- **Assertions on values your mocks just returned** — round-tripping a mock's return value through production code and asserting on it tests the mock, not the production code.
- **Snapshot-only tests against machine-generated snapshots** — if the snapshot is the only assertion AND you authored it by running the test once and accepting whatever came out, you've locked in current behavior without verifying it's correct behavior.

**Do write** assertions that constrain specific properties: exact return values, expected error messages or types, exact rendered text or structure, specific DB rows after a mutation, specific `fetch` call arguments, specific persisted state.

**If you can't write a substantive assertion, the test belongs deleted, not weakened.** A coverage gap is more honest than a tautological green check — the gap shows up in the coverage report; the false-pass hides forever.

This rule applies to every test in the repo. ESLint enforces the mechanical parts where configured (`vitest/expect-expect`, tautology shortlist); the rest is a manual review bar. The normative statement and the per-sub-proposal assertion audit it pairs with live in the `testing-foundation` capability spec — check `openspec list` for its current location (active in `openspec/changes/test-coverage/specs/testing-foundation/spec.md` until archived, then under `openspec/specs/testing-foundation/spec.md`).
