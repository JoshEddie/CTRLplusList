## Context

Sub-proposal 4.18 of `test-coverage` adds unit coverage for the **items-library page shell** under `app/(main)/items/` and elevates the shell's latent invariants to a new `items-library-shell` capability spec. The foundation (1.1, 1.2), the housekeeping amendment (0.1), the pure-libs carve-out (2.1), the six primitive families (3.1–3.6), the misc primitives (3.8), the app-frame (4.1), the home-digest (4.2), following (4.x), and the items browser chrome (4.5) have archived. The runner (vitest 4.x, jsdom/node two-project split), RTL, the `__tests__/` convention, the universal `COVERAGE_FLOOR` constant, the four-audit obligation, the naming conventions, and the `sonarjs` warn→error-per-carve-out policy are all in place and authoritative.

These four files are the deferred boundary from `test-items-browser-chrome` §9.6. The browser-chrome carve-out scoped itself to "chrome *within* `ItemsBrowser`" and explicitly excluded the page shells because they bundle concerns owned by other capabilities: `auth()` + DAL reads + `next/headers` cookie parsing + `redirect()` + the new-item form mount. No existing spec owns the shell's behavior, so this carve-out CREATES the `items-library-shell` capability rather than modifying an existing one.

Two precedents shape the test design directly:

- **Async-RSC + DAL-mock testing** — `app/(main)/following/__tests__/FollowingPage.test.tsx` establishes the pattern for an async page server component: mock `@/lib/auth`'s `auth()`, mock `@/lib/dal`'s reads to return fixtures, mock `next/navigation`'s `redirect()` to throw a `REDIRECT:<url>` sentinel, module-mock the heavy children to prop-surfacing stubs, then `await` the component and either `render()` the resolved tree or inspect the returned React-element tree. `redirect` is asserted via `await expect(Component()).rejects.toThrow('REDIRECT:/')`.
- **Wrapper + Suspense-fallback element-tree assertion** — `app/(main)/__tests__/page.test.tsx` establishes the pattern for a thin route shell: module-mock the heavy child to a stub, `render()` the (synchronous) wrapper to assert the `<main className>` and the stub presence, and inspect the returned element tree to assert the `Suspense` fallback's type and `size` prop without rendering an async child.

The shell's job is orchestration — resolve the viewer, choose the read, forward props, render — not the DAL's query internals. The contract under test is therefore "which read was called, with which arguments, and which props reached the child," which is asserted most precisely by **mocking `@/lib/dal`** (per `FollowingPage.test.tsx`) and inspecting the calls / forwarded props. The mocked boundaries are NextAuth (`auth()`), the DAL reads (`getUserIdByEmail`, `getItemsByUser`, `getItemsByListId`, `getListsByUser`), `next/navigation`'s `redirect()`/router hooks, `next/headers`'s `cookies()`, and the out-of-carve-out children (`ItemsBrowser`, `Items`, `ItemFormContainer`). Mocking the DAL (rather than booting pglite as `HomePage.test.ts` does) keeps the shell tests from re-exercising other capabilities' query logic — the spoiler-filtering, list-scoping, and visibility behavior live in the DAL and are owned by their own carve-outs; here we assert only that the shell *requests* the right read with the right flags.

## Goals / Non-Goals

**Goals:**

- Four colocated test files (all jsdom — the shell files are `.tsx`), each meeting the universal `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) for its source file.
- Create the `items-library-shell` capability spec with five ADDED requirements (viewer-auth guard, reveal-spoiler param, cookie-read normalization, active/archived dual-load + tab partition, list-vs-library routing).
- Resolve the §4.13 coordination: page-RSC redirect guards are owned here; server-action/route authorization stays with `server-endpoint-authorization`.
- Lock the four files' cognitive-complexity ceiling at `error`.
- Close the last of `test-items-browser-chrome` §9.6's three deferred boundaries.

**Non-Goals:**

- Testing the chrome (`ItemsBrowser`, `Items`, `ItemsToolbar`, `Pagination`) — owned by 4.5; module-mocked here.
- Testing the item create/edit form (`ItemFormContainer`, the `itemform/*` tree) — owned by 4.9; module-mocked here.
- Re-testing the primitives (`Empty`, `Header`, `Button`, `LoadingIndicator`) — already covered; rendered for real to exercise the shell's integration.
- Re-owning the `items_page_size` cookie WRITE contract — that is `items-browser-chrome` R-D; this carve-out locks only the server READ half.
- Asserting server-action / API-route authorization — that is §4.13; this carve-out asserts only the page-RSC redirect guard.

## Decisions

### Decision 1: One `*.test.tsx` per executable source file; tests under `__tests__/` mirroring source.

Four files, all jsdom (`page.tsx`, `ItemsContainer.tsx`, `ItemsPage.tsx`, `loading.tsx` are all `.tsx`). `page.test.tsx` and `loading.test.tsx` live in `app/(main)/items/__tests__/` (mirroring the route files); `ItemsContainer.test.tsx` and `ItemsPage.test.tsx` live in `app/(main)/items/ui/components/__tests__/` (alongside the 4.5 chrome tests). This matches the `__tests__/` colocation convention and the route-shell precedent (`app/(main)/__tests__/page.test.tsx`).

`loading.tsx` is a one-line wrapper (`functions:100` is satisfied by its single default export); it still gets a dedicated one-file test asserting the fallback is a `LoadingIndicator` with `size="page"`, because the page-level loading contract is worth a direct assertion and the per-file floor is enforced per file.

### Decision 2: Async RSCs are tested via the HomePage pattern; the synchronous wrapper via the page.test.tsx pattern.

`page.tsx` and `ItemsContainer.tsx` are `async function` server components. They are NOT RTL-`render`ed directly (an async component returns a promise, not an element). Instead, per `FollowingPage.test.tsx`: mock `auth()` to resolve a session, mock the DAL reads to return fixtures, mock `cookies()` to return a controllable store, `await` the component as a function, then `render()` the resolved tree (or inspect the element tree) — asserting the `<main className>`, the stubbed child's forwarded props (surfaced as `data-*` on the stub), the DAL read's call arguments (`getItemsByUser` called with `{ filter, showSpoilers }`, etc.), and the `Suspense`/`LoadingIndicator` fallback type. The `redirect()` paths are asserted via the `REDIRECT:<url>` sentinel throw (`await expect(page(...)).rejects.toThrow('REDIRECT:/')`).

`ItemsPage.tsx` is a `'use client'` component using `useRouter`/`usePathname`/`useSearchParams`; it IS rendered with RTL after mocking `next/navigation`'s hooks per test, asserting rendered DOM (tab roles, counts, empty states) and `router.replace` arguments.

**Alternative considered:** rendering the async RSCs through a Suspense-resolving test util. Rejected — the element-tree-inspection pattern is already the repo's established, lint-accepted approach (`HomePage.test.ts`, `page.test.tsx`), and it asserts the forwarded props precisely without pulling child internals.

### Decision 3: Out-of-carve-out children are module-mocked; tested primitives render for real.

`page.tsx` renders `ItemsPage`; `ItemsContainer` renders `ItemsBrowser` / `Items`; `ItemsPage` renders `ItemsBrowser` and `ItemFormContainer`. These are `vi.mock`ed to prop-surfacing stubs:

- `./ui/components/ItemsPage` (in `page.test.tsx`) → a stub surfacing `items` / `archivedItems` / `initialPageSize` / `lists` / `user_name` as `data-*` so the page's reads, normalization, spoiler flag, and name derivation are assertable.
- `./ItemsBrowser`, `./Items` (in `ItemsContainer.test.tsx` and `ItemsPage.test.tsx`) → stubs surfacing `mode` / `items` / `initialPageSize` / `archivedView` / `showArchiveAction`.
- `./itemform/ItemFormContainer` (in `ItemsPage.test.tsx`) → a stub exposing an `onClose` button so the new-item toggle's open→close cycle is exercised.

The governed primitives (`Empty`, `Header`, `Button`, `LoadingIndicator`) are NOT mocked — they render real DOM in jsdom, and asserting through them exercises the shell's integration (e.g. `Empty type="item"` actually rendering the new-item affordance the active-tab empty state relies on). Mirrors `test-app-frame` / `test-home-digest` (mock the out-of-carve-out child, render real primitives).

**Alternative considered:** rendering the real chrome / form. Rejected — it drags `items-browser-chrome` / `list-item-management` source into this carve-out's tests, couples failures across capabilities, and inflates runtime.

### Decision 4: CREATE a new `items-library-shell` capability with five ADDED requirements; MODIFY none.

The shell enforces five behavioral contracts that pass the elevation test — (a) non-obvious from name/signature/type, (b) survives a reasonable reimplementation, (c) protects a real failure mode — and none is owned by an existing spec:

- **R1 — Viewer-auth guard.** `/items` and the library-mode `ItemsContainer` resolve the viewer from the session email and `redirect('/')` when there is no email or it resolves to no user. **Failure mode:** an unauthenticated request renders another context's items or crashes on a null user. Non-obvious: the guard fires only in the library (no-`listId`) branch, not the list-scoped branch.
- **R2 — Reveal-spoiler param.** `purchases=reveal|only` → `showSpoilers=true`; anything else → `false`. **Failure mode:** a spoiler leak (claimed-gift reveal) or, conversely, the owner permanently unable to reveal. Non-obvious: two distinct param values map to the same boolean, and the default is hide.
- **R3 — Cookie-read normalization (server half of `items-browser-chrome` R-D).** The shell reads `items_page_size` and accepts only `{12,24,48,96}`, else `DEFAULT_PAGE_SIZE`. **Failure mode:** a rename or option-set drift between writer (chrome) and reader (shell) silently resets the page-size preference every navigation. The cookie name and option set ARE the cross-request API.
- **R4 — Active/archived dual-load + tab partition.** Both sets load independently; the `tab` param selects the visible set; each tab is labelled with its own count; empty states differ by tab; switching tabs removes `page` and replaces history. **Failure mode:** archived items leak into the active view, the tab switch strands the user on a stale page, or `push` traps the back button.
- **R5 — List-vs-library routing.** `listId` present → list-scoped read + list browser; absent → viewer's items + library view; the redirect guard applies only to the no-`listId` branch. **Failure mode:** an unauthenticated viewer is wrongly redirected away from a public list, or the wrong read is performed.

**No MODIFIED requirements.** `items-browser-chrome` R-D (the cookie WRITE contract) is referenced by R3, not changed. `server-endpoint-authorization` is referenced by R1's coordination note, not changed.

**Alternative considered:** elevating these into `items-browser-chrome`. Rejected — that spec's scope statement explicitly excludes the page shells; folding shell invariants into it would violate its scope. A new capability is the correct home. **Alternative considered:** elevating fewer (e.g. only R1+R3). Rejected — each of the five protects a distinct, currently-unspecced, real failure mode; the invariant-elevation audit mandates adding the invariant when all three conditions hold.

### Decision 5: The §4.13 coordination is resolved, not deferred.

The parent §4.18 line says "coordinate the `redirect()`-on-unauthenticated paths with §4.13." `server-endpoint-authorization`'s active spec and the §4.13 carve-out scope cover server actions (`app/actions/**`) and API route handlers (`app/api/**`) only — page-level RSC shells are out of its scope. Therefore the page-RSC `redirect()` guard is owned HERE (R1), and §4.13 is neither modified nor referenced as owning it. The two are complementary: §4.13 guards the mutation/data endpoints; this carve-out guards the page render. No requirement is duplicated across the two specs.

### Decision 6: Duplication audit disposes of the shared shell logic.

`firstLastInitial` (the "First L" name derivation) is duplicated verbatim between `page.tsx` and `ItemsContainer.tsx`, and the page-size cookie-read normalization is duplicated between them and conceptually mirrors `ItemsBrowser`'s client-side `normalizePageSize`. Per the DRY-on-sight rule, the duplication audit (§9.2) extracts these: the page-size normalization core into `paginationConstants.ts` (already the home of `PAGE_SIZE_OPTIONS` / `DEFAULT_PAGE_SIZE`) as a pure `normalizePageSize(raw)`, consumed by both server cookie-readers and the client writer; and the name derivation into a co-located `utils.ts` per the project's helper-home convention. The new tests assert behavior (forwarded props, normalized size, redirect), not the helper location, so they survive the extraction. The exact disposition (extract vs. keep-separate if a divergence is named) is decided when the audit runs, recorded in `tasks.md` §audits.

### Decision 7: `cookies()` and `searchParams` are controlled per test.

`page.tsx` `await`s `cookies()` (from `next/headers`) and `searchParams` (a promise prop). The tests mock `next/headers`'s `cookies()` to return a store whose `get('items_page_size')` is controllable per test (driving R3's valid / off-list / absent branches) and pass a resolved `searchParams` promise with the `purchases` value under test (driving R2's reveal / only / other / absent branches). `ItemsContainer`'s `readPageSizeCookie` reads the same cookie via the same mock. This keeps every branch of the normalization and spoiler-param logic reachable without a real request.

## Risks / Trade-offs

- **Async RSCs cannot be RTL-`render`ed directly** → follow the `HomePage.test.ts` element-tree-inspection pattern (Decision 2); assert forwarded props on stubbed children and the redirect sentinel, not rendered DOM of the async child.
- **`page.tsx` and `ItemsContainer` share auth/name/cookie logic** → the duplication audit (Decision 6) extracts the shared core; tests assert behavior, not location, so they survive the refactor.
- **Branch coverage of the normalization + spoiler-param + tab matrices** → drive every branch via per-test `cookies()` / `searchParams` / `tab` control (Decision 7) and a small parameterization over `{valid, off-list, absent}` × `{reveal, only, hide, absent}` × `{active, archived}` to reach `branches ≥ 95`. If a branch is genuinely unreachable, dispose via `/* v8 ignore */` + named reason — never by lowering the floor.
- **Complexity near the ceiling** → if any function measures ≥15 during apply, the complexity audit extracts in-place (single-file, behavior-preserved by the new tests — and Decision 6's extractions likely lower it anyway) or applies a named per-line disable; the file is never skipped.
- **Over-creation of a new capability** → the five requirements are each justified against the three-part elevation test (Decision 4); a new capability (not a `items-browser-chrome` modification) is required because that spec's scope excludes the shell. Non-elevated incidentals (the exact `.container--items-library` class string, the precise "No archived items" copy) are recorded as non-elevations in `tasks.md`.

## Migration Plan

Additive: four new test files, two config edits (`vitest.config.ts` thresholds, `eslint.config.mjs` overrides), one new `items-library-shell` capability spec (five ADDED requirements), one archive-only `testing-foundation` Tier-2 record. Any duplication-audit extraction (`normalizePageSize`, the name helper) is a behavior-preserving in-place refactor proven by the new tests. No runtime source change otherwise. Rollback = revert the change; no production code path depends on it.

## Open Questions

None. The §4.13 coordination (Decision 5) and the new-capability-vs-modification choice (Decision 4) are resolved here. The duplication-audit disposition (Decision 6) is decided at apply time when the complexity/duplication measurements are taken, per the standing audit workflow — not an open design question.
