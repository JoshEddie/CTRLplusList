## Context

This is sub-proposal 9.2 of `test-coverage` — a unit-coverage carve-out for the list create/edit/metadata/visibility **form UI** that 4.10 / 4.11 left at 0% when they covered only the actions + DAL. The proposal enumerates the files and the inherited constraints; this document settles the boundary, the test mechanics for each surface class, and the two spec elevations.

The carve-out divides into three surface classes, each with an established test precedent in the repo:

1. **Client components** (`'use client'`, render + dispatch): `ListForm`, `ListFormContainer`, `NewListButton`, `VisibilityPicker`, `DeleteListButton`. Precedent: the field/form-shell tests and `FollowContainer.test.tsx` (optimistic-flip + rollback + toast).
2. **Pure render components**: `ListPrivate`, `EmptyList`. Precedent: `Empty.test.tsx`, the misc-primitive render tests.
3. **Async server-component (RSC) page shells**: `new/page.tsx`, `new/loading.tsx`, `edit/page.tsx`, `edit/EditListBody.tsx`, `[id]/ListHeroSection.tsx` (+ optionally `[id]/page.tsx`, `[id]/loading.tsx`). Precedent: `FollowingPage.test.tsx`, `ItemsContainer.test.tsx`, `ChooseItemsBody.test.tsx` (async-RSC: mock `auth()`, mock DAL reads, sentinel `redirect()`).

The one surface with **no** clean precedent is `ListHeroSection`'s deferred `after()` visit-recording upsert — Decision 4 addresses it.

## Goals / Non-Goals

**Goals:**

- Bring every enumerated file to the universal `COVERAGE_FLOOR` and enumerate it in `vitest.config.ts` + promote it to `sonarjs/cognitive-complexity = error`.
- Replace 4.14's hand-written **mirror** of the `ListHeroSection.after()` upsert with a direct test of the production block, asserting the authed-non-owner-non-private guard against the existing `visit-history` SHALL.
- Lock the two currently-unspecced UI invariants (form mode-dispatch+navigation; visibility optimistic-rollback) into their owning specs and regression-cover them.
- Render through the **real** governed primitives, asserting no primitive SHALL directly.

**Non-Goals:**

- Re-testing the server actions (4.9 / 4.11), the DAL reads (4.3 / 9.1), `visibility-rows.tsx` / `EditListAction.tsx` (already floored), or any governed primitive.
- E2E coverage of the create-list flow — owned by 6.1 (`test-e2e-critical-flows`, "create list" flow). This carve-out is unit-level only.
- Adding a `private | unlisted | public` visibility *mechanism* change — visibility taxonomy is owned by `list-visibility`; this carve-out only tests the picker UI against it.
- Any cross-file refactor beyond the `ListHeader.tsx` deletion and audit-driven in-place extraction.

## Decisions

### Decision 1 — Final carve-out boundary

**In (test + floor + complexity-error):**

| File | Surface class |
| --- | --- |
| `app/(main)/lists/ui/components/ListForm.tsx` | client |
| `app/(main)/lists/ui/components/ListFormContainer.tsx` | client (passthrough) |
| `app/(main)/lists/ui/components/NewListButton.tsx` | client |
| `app/(main)/lists/ui/components/VisibilityPicker.tsx` | client |
| `app/(main)/lists/ui/components/DeleteListButton.tsx` | client |
| `app/(main)/lists/ui/components/ListPrivate.tsx` | pure render |
| `app/(main)/lists/ui/components/EmptyList.tsx` | pure render |
| `app/(main)/lists/new/page.tsx` | async RSC |
| `app/(main)/lists/new/loading.tsx` | pure render |
| `app/(main)/lists/[id]/edit/page.tsx` | RSC shell (Suspense) |
| `app/(main)/lists/[id]/edit/EditListBody.tsx` | async RSC |
| `app/(main)/lists/[id]/ListHeroSection.tsx` | async RSC + deferred `after()` |
| `app/(main)/lists/[id]/page.tsx` | RSC shell — see Decision 2 |
| `app/(main)/lists/[id]/loading.tsx` | pure render — see Decision 2 |

**Out:**

- `ListHeader.tsx` → **deleted** (Decision 3), not tested.
- `visibility-rows.tsx`, `EditListAction.tsx` → already floored (4.8 / 4.7); rendered through.
- `ReorderInputGroup.tsx` → item-management UI, outside this boundary; dead-code observation flagged for §7 close-out (Decision 3), not fixed here.
- `EditListInputGroup` → **does not exist** in the codebase. The issue's carve-out names it, but repo-wide grep finds no such file. The list **edit** flow is fully covered by `ListForm` (the `isEditing` branch) + `EditListBody` (the edit page shell) + `EditListAction` (already floored). Resolution: treat as a stale name in the issue text; no file to test. Recorded in `tasks.md`.

**Alternative considered:** scope strictly to the issue's named files (exclude `[id]/page.tsx` and `[id]/loading.tsx`). Rejected — see Decision 2.

### Decision 2 — Include `[id]/page.tsx` and `[id]/loading.tsx` to floor the whole `[id]` route directory

The issue names `[id]/HeroSection` but not the sibling route shell `[id]/page.tsx` or `[id]/loading.tsx`. After this carve-out, `[id]/ListHeroSection.tsx` and `[id]/ListItemsSection.tsx` (already floored under 4.9b) are floored, leaving their **parent** `page.tsx` (the `ListPage` default export that renders both in `<Suspense>`) and `loading.tsx` unfloored at 0% beneath them — exactly the kind of gap §9 exists to close.

`page.tsx`'s `generateMetadata` is **already tested** (`__tests__/page.generateMetadata.test.ts`) but the file is not enumerated, so the per-file gate never runs and the `ListPage` default export is uncovered. Flooring it costs one small render test (mock the two section components, assert both Suspense boundaries mount with the right fallback `size`) plus enumeration. `loading.tsx` is a trivial header + `LoadingIndicator` shell.

**Decision: include both.** Completing the route directory is cheap, aligns with the operator's close-out philosophy ("complete it, don't accept as a non-goal"), and avoids a follow-up sub-proposal for two trivial files. The `generateMetadata` test stays as-is; this carve-out adds only the default-export render coverage needed to clear the per-file floor. **Reversible at apply-time**: if a reviewer prefers the strict issue boundary, drop these two from the `thresholds`/eslint additions and the two tests — no other file depends on them.

### Decision 3 — Dispose dead code by deletion, not by testing

`ListHeader.tsx` has **no importer** anywhere under `app/`, `lib/`, `e2e/`, or `test/` (repo-wide grep: only the file itself matches). It is a render component nothing mounts. The four-audit dead-code rule and CLAUDE.md both say dead code is removed, not preserved — writing a test for a component no route renders would lock in an artifact and add a misleading "covered" file. **Decision: delete `ListHeader.tsx`**; record the finding in `tasks.md`. This removes it from the carve-out's test set and from the issue's enumerated boundary (boundaries finalize at authoring per §9).

`ReorderInputGroup.tsx` is **also** importer-less (the `@dnd-kit` `SortItems` surface floored under 4.9b superseded it). But it sits in item-management UI, outside this carve-out's create/edit boundary. **Decision: do not pull it in.** Flag it as a dead-code observation for the §7 close-out audit so it is disposed (delete or own) deliberately, not silently absorbed here.

**Alternative considered:** keep and test `ListHeader.tsx` because the issue lists it. Rejected — testing dead code violates the substance bar (a test that renders a never-mounted component asserts nothing about product behavior) and the audit's dead-code disposition.

### Decision 4 — Test `ListHeroSection`'s deferred `after()` upsert by capturing the `next/server` `after` callback

`ListHeroSection` is the highest-value file here and the only one without a clean precedent. Its `after(async () => { … db.insert(list_visits)… })` block runs **after** the response flushes, so a naïve render never executes it. 4.14 sidestepped this by testing a hand-written **mirror** of the upsert in `visitHistory.actions.test.ts` — leaving the real guard (`if (user && !isOwner && list.visibility !== VISIBILITY.OWNER)`) and the real upsert payload untested.

**Decision:** mock `next/server`'s `after` to **capture** the callback rather than discard it, then invoke it explicitly and assert the upsert. Concretely:

```ts
const afterCallbacks: Array<() => Promise<void> | void> = [];
vi.mock('next/server', () => ({ after: (cb) => { afterCallbacks.push(cb); } }));
// …render ListHeroSection, then:
await Promise.all(afterCallbacks.map((cb) => cb()));
```

The `db.insert(...).values(...).onConflictDoUpdate(...)` chain is asserted at the boundary that the rest of the program's DAL tests already use. Two sub-options for that boundary:

- **(a) seed PGlite** (`bootPglite()`, `@/db` mocked to it) and assert the `list_visits` row after invoking the callback — highest fidelity, exercises the real `onConflictDoUpdate`. But `ListHeroSection` is a `.test.tsx` (jsdom project) and PGlite is the node-project harness; running PGlite under jsdom is unproven in this repo.
- **(b) module-mock `@/db`** to a spy chain and assert the `insert`/`values`/`onConflictDoUpdate` arguments (the `viewerId`, `listId`, `last_visited_at`, `visit_count`, conflict target/set shape) — proves the production block builds the correct upsert, consistent with how the component tests mock the DAL boundary.

**Decision: (b)** — assert the upsert *payload* via a `@/db` spy, under jsdom, matching this carve-out's component-test boundary. The upsert's *DB semantics* (conflict convergence, `visit_count` increment) are 4.14's contract and already covered against PGlite; re-proving them here would duplicate 4.14. What is genuinely untested and high-value is the **guard** (who triggers the `after` at all) and the **payload shape** — both fully reachable with (b). The `it()` names assert against the existing `visit-history` SHALL's scenarios: `AuthedNonOwnerNonPrivate_RecordsVisitUpsert`, `Owner_DoesNotRecord`, `Unauthenticated_DoesNotRecord`, `OwnerHiddenList_RendersListPrivate-DoesNotRecord`.

**Risk:** the `after`-capture mock is a new pattern. Mitigated by keeping it a 3-line local mock and documenting it inline; if reuse appears (no other current file defers via `after`), it stays local per the 3-caller extraction threshold.

### Decision 5 — Mocking strategy per surface class

- **Client components** — `vi.mock('@/app/actions/lists')` (stub `createList`/`updateList`/`deleteList`/`setListVisibility` to return `{ success }` shapes), `vi.mock('next/navigation')` (`useRouter` → `{ push, refresh }` spies), `vi.mock('react-hot-toast')` (`toast.success`/`toast.error` spies). Render through the **real** `FormShell`, field primitives, `Button`, `Menu`/`MenuItemRadio`/`PopoverTrigger`, and `ConfirmDialog`. Drive interactions with `@testing-library/user-event`. Assertions: the exact action payload (`createList` called with the normalized `{ name, subtitle: null, occasion, date }`), the navigation target (`push('/lists/{id}/choose-items?new=1')`), the toast text, the optimistic state, the rollback.
- **Pure render components** (`ListPrivate`, `EmptyList`, `*/loading.tsx`) — plain `render` + assert the rendered text/structure and the conditional branch (`ListPrivate` `!loggedIn` → the extra "please login" paragraph).
- **Async RSC shells** (`new/page.tsx`, `edit/EditListBody.tsx`, `ListHeroSection.tsx`) — `vi.mock('@/lib/auth')` (`auth()` → session or `null`), `vi.mock('@/lib/dal')` (`getUserIdByEmail`, `getList`, `getUserById` stubs), `vi.mock('@/lib/listAccess')` for `ListHeroSection`'s `guardListViewable`, and `vi.mock('next/navigation')` with `redirect()` throwing a sentinel (the established pattern) so the guard-redirect paths are assertable. Await the async component (`await Page({ params, searchParams })`) and assert the rendered output or the thrown redirect sentinel. `ListForm` / `ListDetails` are real where cheap, or module-mocked where they pull a large subtree (`ListDetails` is floored under 4.7 — mock it and assert `ListHeroSection` passes the right `isOwner` / `showSpoilers` / `previewMode` props).
- **`edit/page.tsx`** (Suspense shell) — assert it renders `EditListBody` inside `<Suspense>` with the `LoadingIndicator size="form"` fallback; `EditListBody` itself is module-mocked here (tested separately).

**Internal modules are never mocked** beyond the `auth()` / `next/navigation` / `next/server` / `@/db` / sibling-floored-component boundaries `testing-foundation` permits.

### Decision 6 — Spec elevation: `list-metadata` form mode-dispatch + navigation contract (ADDED)

`ListForm` enforces a create-vs-edit contract no requirement states: **create** → `createList(data)` → `router.push('/lists/{id}/choose-items?new=1')`; **edit-in-modal** (`onClose` provided) → `updateList(id, data)` → `onSuccess?.()` + `onClose()` + `router.refresh()`; **edit-as-page** (no `onClose`) → `updateList(id, data)` → `router.push('/lists/{id}')`. The post-create redirect into the choose-items funnel is product-critical (a regression to `/lists/{id}` would silently break the new-list onboarding path).

Three-part elevation test: **(a) non-obvious from signatures** — the navigation targets and the modal-vs-page branch are invisible in the action types; **(b) survives reimplementation** — any rewrite of the form must preserve where each mode lands; **(c) prevents a real defect class** — a broken create-navigation strands new lists outside the item-picking funnel. **Passes → ADD one requirement** to `list-metadata`. The subtitle trim-to-`null` / `maxLength` requirements already exist — LOCKED, not duplicated.

### Decision 7 — Spec elevation: `list-visibility` optimistic-apply with rollback (ADDED)

`VisibilityPicker.apply` advances local state immediately, fires `setListVisibility`, and on `!result.success` **rolls back** to the prior value and surfaces `toast.error(result.message)`; on success it surfaces `toast.success(rowFor(next).toast)` and `router.refresh()`. The active `list-visibility` spec covers the menu structure, labels/icons/descriptions, and the re-select no-op, but **not** the rollback — yet the rollback is the integrity guarantee that a failed visibility change cannot leave a *lie* on the trigger pill (showing "Shared" while the list is still Hidden).

Three-part test: **(a) non-obvious** — nothing in the menu requirement implies optimistic-then-rollback; **(b) survives reimplementation**; **(c) prevents a real defect class** — a missing rollback misrepresents a list's privacy state to its owner, a privacy-adjacent UI lie. **Passes → ADD one requirement** to `list-visibility`.

### Decision 8 — `ListForm.validateDate` copy inconsistency: lock actual behavior, flag the copy

`validateDate` rejects `date.getFullYear() < 1000` but the error message reads `"Please enter a year of 1900 or later"` — the guard and the copy disagree (a 1500 date passes the guard but the message implies it shouldn't). **Decision:** the tests **lock the actual behavior** (reject < 1000, accept ≥ 1000) and assert the literal message string as shipped; the guard-vs-copy mismatch is recorded as an audit finding in `tasks.md` with a recommended disposition (tighten the guard to 1900, or soften the copy to "1000 or later") for the operator to decide — **not** silently "fixed" inside a test carve-out, since changing the validation bound is a behavior change outside this carve-out's test-only mandate.

### Decision 9 — One test file per source file, colocated under `__tests__/`

Per `testing-foundation` colocation + the `__tests__/` convention, one `.test.tsx` per source file in a sibling `__tests__/` directory: `app/(main)/lists/ui/components/__tests__/{ListForm,ListFormContainer,NewListButton,VisibilityPicker,DeleteListButton,ListPrivate,EmptyList}.test.tsx`; `app/(main)/lists/new/__tests__/{page,loading}.test.tsx`; `app/(main)/lists/[id]/edit/__tests__/{page,EditListBody}.test.tsx`; `app/(main)/lists/[id]/__tests__/{ListHeroSection,page,loading}.test.tsx` (the existing `page.generateMetadata.test.ts` stays; the new `page.test.tsx` covers the default export). Shared fixtures (a `ListTable` builder, the `after`-capture helper) reuse existing `__tests__/test-helpers.ts` or are extracted only on 3+ reuse.

## Risks / Trade-offs

- **`ListHeroSection` `after()`-capture is a new pattern** → mitigated by a 3-line local `next/server` mock + inline doc; payload-shape assertions (Decision 4b) avoid the unproven PGlite-under-jsdom path while still closing the real-vs-mirror gap.
- **`[id]/page.tsx` / `[id]/loading.tsx` scope creep beyond the issue's named files** → mitigated by Decision 2's explicit, reversible inclusion rationale; droppable at apply-time without affecting other files.
- **Deleting `ListHeader.tsx` could surface a hidden dynamic importer** → mitigated by repo-wide grep (string match, not just static import) finding zero references; `tsc --noEmit` + `npm run build` in the pre-merge gate would catch any miss.
- **Over-elevation of spec requirements** → mitigated by holding each ADDED requirement to the three-part test (Decisions 6–7); a reviewer reading only the spec delta sees each justified, and the existing requirements are explicitly LOCKED, not modified.
- **Complexity promotion (`error`) could fail on `ListForm` / `ListHeroSection` at HEAD** → measured during apply; any function ≥ 15 is disposed by a single-file, behavior-preserving extraction covered by the new tests, never by raising the ceiling.
