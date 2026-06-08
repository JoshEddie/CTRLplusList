## ADDED Requirements

### Requirement: The list create/edit/metadata form UI SHALL be whole-covered at the universal COVERAGE_FLOOR

The list create/edit/metadata/visibility **form UI** left at 0% by sub-proposals 4.10 (`test-list-metadata`) and 4.11 (`test-list-visibility`) — which covered only the actions and DAL — SHALL be brought to the universal per-file `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) by colocated `*.test.tsx` files under the **jsdom** vitest project. The covered files are: `ListForm.tsx`, `ListFormContainer.tsx`, `NewListButton.tsx`, `VisibilityPicker.tsx`, `DeleteListButton.tsx`, `ListPrivate.tsx`, and `EmptyList.tsx` under `app/(main)/lists/ui/components/`; `page.tsx` and `loading.tsx` under `app/(main)/lists/new/`; `page.tsx` and `EditListBody.tsx` under `app/(main)/lists/[id]/edit/`; and `ListHeroSection.tsx`, `page.tsx`, and `loading.tsx` under `app/(main)/lists/[id]/`.

The client components SHALL be rendered through the **real** governed primitives (`FormShell`, the field family, `Button`/`LinkButton`, `Menu`/`MenuItemRadio`/`PopoverTrigger`, `ConfirmDialog`), with only the boundaries `testing-foundation` permits mocked — the server actions (`@/app/actions/lists`), `next/navigation`, and `react-hot-toast`. The async server-component shells SHALL be tested via the async-RSC pattern: `auth()` mocked, the `lib/dal` reads mocked, and `next/navigation`'s `redirect()` mocked to throw a sentinel. Internal modules SHALL NOT otherwise be mocked, and no governed primitive SHALL be re-owned or re-tested here.

On completion, every covered file SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the shared `COVERAGE_FLOOR` constant (no per-file numeric variation) and SHALL have `sonarjs/cognitive-complexity` promoted to `error` in `eslint.config.mjs`.

#### Scenario: The form UI files meet the universal floor

- **WHEN** `npm run test:coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each covered file at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** each per-file threshold entry in `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant
- **AND** `eslint.config.mjs` sets `sonarjs/cognitive-complexity` to `error` for each covered file

#### Scenario: Client components render through real primitives

- **WHEN** a `ListForm` / `VisibilityPicker` / `DeleteListButton` test renders the component
- **THEN** the real `FormShell` / field / `Menu` / `PopoverTrigger` / `ConfirmDialog` primitives are mounted (not mocked)
- **AND** only the server actions, `next/navigation`, and `react-hot-toast` are mocked at the boundary

### Requirement: The real `ListHeroSection` visit-recording block SHALL be directly tested

The inlined `after()` visit-recording upsert in `ListHeroSection.tsx` — gated by `user && !isOwner && list.visibility !== VISIBILITY.OWNER` — SHALL be exercised by a direct test of the production component, replacing the hand-written **mirror** of that upsert that sub-proposal 4.14 (`test-visit-history`) tested in `app/actions/__tests__/visitHistory.actions.test.ts`. The test SHALL capture the `next/server` `after` callback, invoke it, and assert the upsert is performed (or not) according to the existing `visit-history` requirement *"Authenticated visits to non-owned non-private lists SHALL be recorded"* — recording for an authenticated non-owner of a non-private list, and not recording for the owner, an unauthenticated viewer, or a Hidden (`VISIBILITY.OWNER`) list. This carve-out adds no new `visit-history` requirement; it closes the gap between the mirror and the real block.

#### Scenario: Authenticated non-owner of a non-private list records a visit

- **WHEN** `ListHeroSection` renders for an authenticated viewer who is not the owner of a list whose visibility is not `VISIBILITY.OWNER`, and the captured `after` callback is invoked
- **THEN** the production block performs the `list_visits` upsert with the viewer's id and the list id

#### Scenario: Owner, unauthenticated, and Hidden-list renders do not record

- **WHEN** `ListHeroSection` renders for the owner, for an unauthenticated viewer, or the list visibility is `VISIBILITY.OWNER` and the viewer is not the owner
- **THEN** no `after` visit-recording upsert is performed for that render (a non-owner of a Hidden list is shown the private-list interstitial instead)
