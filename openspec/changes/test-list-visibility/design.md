## Context

Sub-proposal 4.11 of `test-coverage`, HIGH-stakes (privacy-leak class). The parent scopes it as "three-state visibility enforcement in DAL and server actions," but the DAL half is already discharged by §2.1 `test-pure-libs` (`lib/listAccess.ts` + `lib/visibility.ts`, both at the universal `COVERAGE_FLOOR` and enumerated in `vitest.config.ts`). The residual is two untested server-side surfaces:

- `setListVisibility` (`app/actions/lists.ts`) — the visibility write: owner authorization, fail-closed enum re-validation, the `shared_at` transition state machine (`private → non-private` sets, `→ private` clears, `unlisted ↔ public` preserves), the legacy-`shared` dual-write, and `updateTag('lists')`.
- `generateMetadata` (`app/(main)/lists/[id]/page.tsx`) — the metadata leak-prevention surface: universal `noindex`, and name-leak suppression for non-owners of non-`public` lists, failing closed on not-found / fetch error.

Both functions sit in **multi-owner files**. `app/actions/lists.ts` also exports `createList` / `updateList` / `deleteList` / `setListItems` / `updatePriority` (owned by §4.9 `test-list-item-management`) and `bookmarkList` / `unbookmarkList` / `clearVisitHistory` / `removeVisit` (owned by §4.14 `test-visit-history`). `page.tsx` also exports the default `ListPage` component (owned by the list-page render carve-out). The established harness for server-side integration tests is `lib/__tests__/listAccess.test.ts`: boot pglite in `beforeAll`, `vi.mock('@/db')` through a getter holder, `vi.mock('next/cache')`, `vi.mock('next/navigation')`; the node vitest project picks up `*.test.ts`.

## Goals / Non-Goals

**Goals**

- Lock `setListVisibility`'s authorization, fail-closed validation, `shared_at` state machine, dual-write, and cache-revalidation behavior against a real pglite-backed row.
- Lock `generateMetadata`'s `{visibility} × {owner, auth-non-owner, anon}` leak-prevention matrix plus the two fail-closed fallbacks.
- Elevate the one latent non-obvious invariant (fail-closed re-validation) to the `list-visibility` spec; record every already-specced invariant as a deliberate non-elevation.
- Establish and document the **deferred per-file-threshold-enumeration convention** for multi-owner files — the first time the initiative hits one.

**Non-Goals**

- Re-testing `lib/listAccess.ts` / `lib/visibility.ts` (done in §2.1).
- Testing the visibility UI (`VisibilityPicker`, `visibility-rows`, `ShareButton`) — UI, not "DAL and server actions"; covered E2E by §6.1.
- Testing `lib/dal.ts` reads (`getList` decode is the already-tested `fromDb`; FOLLOWERS feed filters owned by §4.2/§4.3; `getListsSharedByUser` is dead code at HEAD).
- Testing the visibility migration (R4) — one-time SQL, not unit-testable code.
- Adding `vitest.config.ts` thresholds / `eslint.config.mjs` overrides for the two multi-owner files (D1).
- Building the cross-action authorization matrix — that is §4.13's job (D5).

## Decisions

### Decision 1: Multi-owner files get function-scoped tests now, deferred per-file config-enumeration later. This carve-out establishes the convention.

The universal `COVERAGE_FLOOR` is enforced **per file** by vitest (`thresholds.perFile = true`); `eslint.config.mjs`'s `sonarjs/cognitive-complexity = error` override is likewise **per file glob**. Every prior carve-out (primitive families, app-frame) owned **whole files**, so "enumerate the file at the floor" and "promote the file to complexity-error" were lossless. 4.11 is the first carve-out whose natural unit is a **single function inside a file co-owned by other sub-proposals**. Adding `app/actions/lists.ts` to `vitest.config.ts` thresholds would impose the `functions:100 / lines:98` floor on `createList`, `updateList`, … (un-written, owned by §4.9/§4.14) — failing the gate or forcing 4.11 to test code outside its carve-out. Promoting the whole file to complexity-error would lock sibling functions this carve-out never reviewed.

The two rejected alternatives and why:

- **Extract `setListVisibility` / `generateMetadata` to their own files** so each becomes a single-owner file. Rejected: that is a **cross-file refactor** (new file + edit the original + update callers), which the `testing-foundation` "refactor only within the carve-out" rule explicitly defers to a new sibling sub-proposal. It is also gratuitous churn on a `'use server'` action surface.
- **Enumerate the file but `/* v8 ignore */` the sibling functions.** Rejected: that would suppress the coverage obligation the sibling sub-proposals exist to satisfy — a backdoor the no-backdoor rule forbids.

**Chosen:** 4.11 writes substantive integration tests for exactly its two functions (importing only those exports), and **does not** add either file to `vitest.config.ts` thresholds or `eslint.config.mjs` overrides. The durable lock for 4.11's behavior is twofold: (a) the integration tests (which run in the `test` gate and fail on regression regardless of whether the file is enumerated), and (b) the already-comprehensive `list-visibility` SHALLs (R2/R5/R6) plus the one ADDED SHALL. The convention — recorded in the Tier-2 `testing-foundation` delta — is: **a multi-owner file is enumerated in `vitest.config.ts` (and promoted to complexity-error) by the sub-proposal that lands the *last* slice of its coverage**, at which point the whole-file floor is honestly achievable. For `app/actions/lists.ts` that is whichever of §4.9 / §4.14 archives last; for `page.tsx`, the list-page render carve-out. Each of those sub-proposals, at enumeration time, confirms 4.11's functions are still covered (they will be, by these tests).

This is a genuine gap in the per-file-floor model surfaced by the first multi-owner carve-out; D1 is its resolution and is also flagged to `CLAUDE.md` / the foundation as orientation (`tasks.md` §6).

### Decision 2: Both tests run under the node project, against real pglite, with `@/lib/auth` mocked at the session boundary.

`setListVisibility` and `generateMetadata` are server-side, return plain objects (no JSX render), and read the DB. Per testing-foundation, internal DAL/actions are **not** mocked — they run against the real pglite test DB seeded in `beforeAll`, exactly as `lib/__tests__/listAccess.test.ts` does. The only mocked boundary is `@/lib/auth`'s `auth()` (the NextAuth/Google network boundary the foundation explicitly carves out): `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`, configured per-test to return a fixture session, `null`, or a session whose email resolves to no `users` row. `next/cache` is mocked (as in the listAccess harness) so `updateTag` is a spy the test asserts on. Files are `.test.ts` (node project picks up `**/*.test.ts`).

### Decision 3: `generateMetadata` is imported from the `.tsx` page; its sibling component imports are mocked at the module boundary if they break the node import.

`page.tsx` top-level-imports `ListHeroSection`, `ListItemsSection`, and `LoadingIndicator` (UI components, out-of-carve-out) alongside `generateMetadata`. Under the node project these imports load when the module is imported. If any pulls in jsdom-only or render-only dependencies that fail under node, the disposition is a **test-side** `vi.mock` of those sibling component modules to inert stubs — they are out-of-carve-out UI whose behavior this test never asserts. This is mocking out-of-carve-out modules at the import boundary (allowed), not mocking the unit under test or its internal DAL. If `generateMetadata` imports cleanly under node (it only *uses* `getList`, `getUserIdByEmail`, `auth`, and the `VISIBILITY` constant), no sibling mock is needed. The §5 testability audit records which path was taken. No source refactor either way (D1's cross-file-defer rule applies if one were ever needed).

### Decision 4: The `shared_at` state machine is asserted by reading the row back after each transition, exercising every branch of the `goingPrivate` / `wasPrivate` decision.

`setListVisibility`'s `sharedAtUpdate` is a three-way branch: `goingPrivate ? {shared_at: null} : wasPrivate ? {shared_at: new Date()} : {}`. Full branch coverage requires: (a) `private → unlisted`/`public` (`wasPrivate` true, `goingPrivate` false → set); (b) `unlisted → public` and `public → unlisted` (both false → `{}`, preserve); (c) `public`/`unlisted → private` (`goingPrivate` true → clear); (d) `private → private` (`goingPrivate` true → clear-on-already-null, no-op observable); (e) `public → private → public` cycle (asserts the *fresh* timestamp is strictly newer than the original, the spec's "re-sharing gets a fresh shared_at" scenario). Timestamps are asserted against a controlled clock (`vi.setSystemTime` or capturing `Date.now()` bounds around the call) so the freshness assertion is deterministic — not `toBeDefined()`. Each transition reads the row via the test's pglite client and asserts the exact `{visibility, shared, shared_at}` triple.

### Decision 5: `setListVisibility`'s authorization is dual-owned with §4.13; 4.11 owns the in-spec scenario, 4.13 inherits.

The `list-visibility` spec's "Non-owner submission is rejected" scenario lives in *this* capability, so 4.11's tests assert the owner/non-owner/unauthenticated/no-user/not-found outcomes as part of the visibility-mutation contract. §4.13 `test-server-endpoint-authorization` owns the *generic* matrix across all actions; when it runs it will find `setListVisibility` already asserted here and SHALL reference rather than duplicate (recorded in the Tier-2 delta so 4.13's author sees it). The overlap is intentional: 4.11 cannot test the visibility mutation honestly without asserting that a non-owner cannot perform it.

### Decision 6: Elevate exactly one latent invariant; record the rest as non-elevations because the `list-visibility` spec already locks them.

The `list-visibility` spec (from `relabel-and-harden-visibility`) is unusually complete — R2 (shared_at transitions), R5 (dual-write), R6 (metadata leak), and R3's "Non-owner submission is rejected" already encode nearly every invariant these tests assert. Applying the three-part elevation test (non-obvious / survives reimplementation / protects a real failure mode):

- **ELEVATE:** *`setListVisibility` SHALL fail-closed re-validate `visibility` before any DB read or write.* (a) Non-obvious — the typed signature `visibility: ListVisibility` suggests validation is unnecessary; the re-validation exists only because the type is erased at the server-action network boundary, where the argument is attacker-controlled. (b) Survives reimplementation — any correct implementation must re-validate untrusted input. (c) Real failure mode — without it a crafted call could write an out-of-enum string into `lists.visibility`, corrupting the privacy state of a list (a value `fromDb` would later throw on, or worse, silently mis-classify). HIGH-stakes context. → ADDED to `list-visibility`.
- **Non-elevations (tested, not added — already specced):** shared_at transition rules (R2); legacy-`shared` dual-write (R5); non-owner rejection (R3); universal `noindex` + non-owner name-leak suppression + fail-closed fallback (R6). Each is already a SHALL with scenarios; re-adding would duplicate.
- **Non-elevations (tested, not added — trivial/derivable):** the `{ success: true, message: 'Visibility updated' }` success shape and the specific error strings (`'Unauthorized'` / `'Forbidden'` / `'Not found'` / `'Validation'`) — implementation-level response shapes derivable from reading the action; they protect caller ergonomics, not a privacy/data-loss failure mode, so they stay tested but unspecced. `updateTag('lists')` on success — this is the cross-cutting data-freshness rule already governing every mutation, not a visibility-specific SHALL; tested but not elevated to `list-visibility`.

### Decision 7: Tier-2 (archive-only) `testing-foundation` bookkeeping; no parent-accumulator roll-up.

Per parent design D13's two-tier rollup, this carve-out's `testing-foundation` delta is Tier-2: it records (a) the two functions are tested to behavioral-contract level, (b) the deferred-enumeration convention (D1) and which sub-proposals own the eventual enumeration, and (c) the §4.13 dual-ownership note (D5). It lives ONLY at `openspec/changes/test-list-visibility/specs/testing-foundation/spec.md` (and its archive copy). It does NOT modify the active `testing-foundation` spec and does NOT roll into `openspec/changes/test-coverage/specs/testing-foundation/spec.md`.

## Risks / Trade-offs

- **The multi-owner-file coverage gap (D1) means 4.11 archives without a `vitest.config.ts` lock on its functions.** Mitigation: the integration tests run in the `test` gate and fail on regression independent of enumeration; the `list-visibility` SHALLs are the durable contract; the convention names exactly who enumerates the files later. The alternative (cross-file extraction) is worse — gratuitous churn deferred to its own sub-proposal anyway.
- **`generateMetadata` import under node may drag in the sibling component tree (D3).** Mitigation: mock the out-of-carve-out sibling modules at the import boundary; documented disposition, no source change.
- **HIGH-stakes leak-prevention assertions must be exhaustive.** Mitigation: the test enumerates the full `{private, unlisted, public} × {owner, auth-non-owner, anon}` grid plus not-found and throws; the `public`-path assertion that `auth()` is *never consulted* locks the `isShared` short-circuit so a future edit that removes it (and would then leak/over-fetch) fails loudly.
- **Timestamp freshness flakiness.** Mitigation: controlled clock (`vi.setSystemTime`) or captured `Date.now()` bounds, never `toBeDefined()` — the assertion-substance bar forbids the lazy form.

## Migration

None. Test-only change plus one ADDED spec requirement; no runtime behavior change, no data migration, no dependency change.
