## ADDED Requirements

### Requirement: The connections settings and user-profile page shells SHALL be whole-covered at the universal COVERAGE_FLOOR

The two social-graph **page-shell** clusters left at 0% by the §0–§6 carve-outs — the connections settings UI (`app/(main)/settings/connections/`) and the user-profile pages (`app/(main)/user/[id]/`), whose composed leaves were already floored (the `lib/dal.ts` reads under 9.1, the `app/actions/follows.ts` mutations and `users/ui` components under 4.2) but whose route shells had no unit tests — SHALL be brought to the universal per-file `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) by colocated `*.test.tsx` files under the **jsdom** vitest project. The covered files are, under `app/(main)/settings/connections/`: `page.tsx`, `ConnectionsPage.tsx`, `ConnectionsSection.tsx`, `FollowingSection.tsx`, `FollowersSection.tsx`, `BlockedSection.tsx`, `ConnectionRow.tsx`, and `ConnectionsActions.tsx`; and under `app/(main)/user/[id]/`: `page.tsx`, `ProfilePage.tsx`, `ProfileHeaderSection.tsx`, and `ProfileListsSection.tsx`.

The async server-component shells (`FollowingSection`, `FollowersSection`, `BlockedSection`, `ProfileHeaderSection`, `ProfileListsSection`) SHALL be tested via the async-RSC pattern: `auth()` mocked, the `lib/dal.ts` reads mocked at the `@/lib/dal` boundary, and `next/navigation`'s `redirect()` **and** `notFound()` each mocked to throw a distinct sentinel so every guard branch is assertable. The in-carve-out children (`ConnectionsSection`, `ConnectionRow`, `ConnectionsAction`) SHALL be rendered through for real; the already-floored `users/ui` siblings (`ProfileHeader`, `FollowPrompt`, `PublicListsGrid`, owned by 4.2) MAY be mocked to isolate the parent shell's branch logic, asserting the forwarded props. The client `ConnectionsActions` SHALL be rendered through the real `Button`/`buttonClasses`, with only `@/app/actions/follows`, `react-hot-toast`, and `next/navigation`'s `useRouter` mocked. No governed primitive, `lib/dal.ts` read, or `follows` action SHALL be re-owned or re-tested here, and internal modules SHALL NOT otherwise be mocked beyond `next/link` (mocked to a plain `<a>` where the real `ConnectionRow` renders, since `next/link` cannot mount under jsdom without an `AppRouterContext`).

On completion, every covered file SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the shared `COVERAGE_FLOOR` constant (no per-file numeric variation) and SHALL have `sonarjs/cognitive-complexity` promoted to `error` in `eslint.config.mjs`.

#### Scenario: The connections + profile page shells meet the universal floor

- **WHEN** `npm run test:coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of the twelve covered files at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** each per-file threshold entry in `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant
- **AND** `eslint.config.mjs` sets `sonarjs/cognitive-complexity` to `error` for each covered file

#### Scenario: The connections sections render through real section/row/action primitives

- **WHEN** a `FollowingSection` / `FollowersSection` / `BlockedSection` test renders the resolved component with a stubbed read
- **THEN** the real `ConnectionsSection`, `ConnectionRow`, and `ConnectionsAction` components are mounted (not mocked)
- **AND** nothing beyond the permitted boundaries (`@/lib/auth`, `@/lib/dal`, `next/navigation`, `next/link`) is mocked

#### Scenario: The profile block cover-story is unit-pinned as indistinguishable from a missing user

- **WHEN** `ProfileHeaderSection` is rendered for a profile where `getProfileForUser` resolves `viewerIsBlocked: true`
- **THEN** the test asserts the **same** `notFound()` sentinel that a `null` (non-existent user) profile throws — pinning the privacy invariant that a blocked viewer cannot distinguish a block from a non-existent account
- **AND** the section auth-guards (`auth()` → `null`, and a signed-in viewer with no resolvable user row) each throw the `redirect('/')` sentinel
