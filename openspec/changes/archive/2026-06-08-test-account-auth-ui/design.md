## Context

This is sub-proposal 9.3 of `test-coverage` — a unit-coverage carve-out for the auth & account-menu **client UI** that sits at 0% today. The sign-in *flow* is e2e-covered by 6.1 (`test-e2e-critical-flows`); this adds unit coverage of the components. The proposal enumerates the files, the dead-code cascade, and the inherited constraints; this document settles the boundary, the deletion mechanics, the per-surface test mechanics, and the (non-)elevation decisions.

The single largest finding reshaped the carve-out from the issue's text. The issue names `app/ui/components/AuthPage.tsx` (`AuthProvider`) as the primary file, but it is **dead** — zero importers repo-wide, the **old chrome entry point** superseded by `AppFrame` (the `1.0: migrate auth and shared chrome to new primitives` commit). The live wiring is:

- **Account chrome:** `app/(main)/layout.tsx → AppFrame → User (RSC, auth()) → UserMenu → UserAvatarPopover` (signed in) / `SignedOutMenu` (signed out).
- **Sign-in surface:** `app/(auth)/sign-in/page.tsx → SignInPage (RSC) → AuthContainer + logo Image + SignInButton`.

`AuthProvider` renders neither path. Deleting it transitively orphans `AppMenu.tsx → Logo.tsx`/`Nav.tsx` (each imported only by the previous link), all three floored + tested under the archived carve-out **4.1**. The operator's authoring decision is to delete the **entire old-chrome cluster** and unit-cover the **live** files.

The carve-out's live files divide into three surface classes, each with an established repo precedent:

1. **Async server-component (RSC) shells:** `User.tsx`, `SignInPage.tsx`, `sign-in/page.tsx`. Precedent: `FollowingPage.test.tsx`, `ChooseItemsBody.test.tsx`, `AppFrame.test.tsx` (mock `auth()`, mock child subtree, sentinel `redirect()`).
2. **Client components:** `UserMenu.tsx` (+ its `SignedOutMenu`), `UserAvatarPopover.tsx`, `SignInButton.tsx`. Precedent: the menu/popover render-and-interact tests; `PurchaseFlowContainer.test.tsx` for the server-action-form boundary.
3. **Pure render components:** `UserImage.tsx`, `AuthContainer.tsx`. Precedent: `Empty.test.tsx`, the misc-primitive render tests.

## Goals / Non-Goals

**Goals:**

- Bring every live enumerated file to the universal `COVERAGE_FLOOR`, enumerate it in `vitest.config.ts`, and promote it to `sonarjs/cognitive-complexity = error`.
- Delete the entire dead old-chrome cluster (`AuthPage`, `AppMenu`, `Logo`, `Nav`) plus the two leaf-dead `(auth)` files (`AuthButtons`, `SignOutButton`), removing the orphaned 4.1 thresholds / eslint entries / test files so no orphaned tested-but-dead code survives.
- LOCK the already-specced auth/account requirements at the component level (`UserAvatarPopover` structure per `menu-system`; the sign-in-surface render per `e2e-critical-flows`), rendering through the **real** governed primitives.
- Keep the unit and e2e tiers non-redundant: unit asserts the branch logic the e2e cannot cheaply reach (`SignInPage` redirect-when-authenticated; `UserMenu` session→surface choice), e2e asserts the real navigation + rendered button.

**Non-Goals:**

- Re-testing the server actions (`signInUser` / `signOutUser`, owned by 4.13), the `menu-system` / `button-system` primitives, or `Avatar.tsx` (the initials avatar, owned by 4.2 / 4.15 — a different "avatar" from `UserImage`'s profile photo).
- E2E coverage of the sign-in flow — owned by 6.1. This carve-out is unit-level only.
- Re-introducing or testing any old-chrome primitive (`AppMenu`/`Logo`/`Nav`) — they are deleted, not covered.
- Changing the `e2e-critical-flows` spec prose, the `'use server'` directive on `User.tsx`, or any validation/behavior surface — flagged for the operator, not touched here.

## Decisions

### Decision 1 — Final carve-out boundary

**In (test + floor + complexity-error) — 8 live files:**

| File | Surface class |
| --- | --- |
| `app/(auth)/ui/components/User.tsx` | async RSC (`auth()` → `UserMenu`) |
| `app/(auth)/ui/components/UserMenu.tsx` | client (session branch + `SignedOutMenu`) |
| `app/(auth)/ui/components/UserAvatarPopover.tsx` | client (avatar trigger + `Menu` popover) |
| `app/(auth)/ui/components/UserImage.tsx` | pure render (`next/image`) |
| `app/(auth)/ui/components/SignInPage.tsx` | async RSC (`connection()` + `auth()` + `redirect()`) |
| `app/(auth)/ui/components/SignInButton.tsx` | client (`<form action={signInUser}>`) |
| `app/(auth)/ui/components/AuthContainer.tsx` | pure render (wrapper) |
| `app/(auth)/sign-in/page.tsx` | async RSC route shell (`Suspense` → `SignInPage`) |

**Out:**

- `AuthPage.tsx`, `AppMenu.tsx`, `Logo.tsx`, `Nav.tsx`, `AuthButtons.tsx`, `SignOutButton.tsx` → **deleted** (Decision 2), not tested.
- `Menu`/`MenuItem`/`MenuLinkItem`, `Button`/`buttonClasses`, `Avatar.tsx` → already floored; rendered through (the first two) or out of scope (the last).

**Note on the issue's named set.** The issue lists `AuthButtons, SignInButton, SignInPage, SignOutButton, User, UserImage, UserMenu, UserAvatarPopover` and locates them under `app/(auth)/sign-in/`. Two corrections finalize the boundary at authoring time (§9 permits this): (a) the components actually live under `app/(auth)/ui/components/`, not `app/(auth)/sign-in/` (which holds only `page.tsx`); (b) `AuthButtons` and `SignOutButton` are **dead duplicates** (Decision 2). `AuthContainer.tsx` — unnamed by the issue but a live member of the set (rendered by both `SignInPage` and `SignedOutMenu`) — is **added** so its directory is not left at 0% beneath floored siblings.

### Decision 2 — Delete the entire dead old-chrome cluster (operator decision)

Repo-wide grep (string match, not just static import) establishes the cascade:

- `AuthPage.tsx` (`AuthProvider`) — **zero importers** anywhere under `app/`, `lib/`, `e2e/`, `test/`. The old chrome entry (renders `AppMenu` + `SignInPage`).
- `AppMenu.tsx` — imported **only** by `AuthPage.tsx`. Dead once `AuthPage` is removed. (Floored + tested under 4.1.)
- `Logo.tsx`, `Nav.tsx` — imported **only** by `AppMenu.tsx`. Dead once `AppMenu` is removed. (Floored + tested under 4.1.)
- `AuthButtons.tsx` — **zero importers**; a stale copy of `SignInButton`/`SignOutButton` whose `SignInButton` even redirects to `/lists` (the live `SignInButton.tsx` does not redirect).
- `SignOutButton.tsx` — **zero importers**; a stale default-export variant taking an `action` prop (the live sign-out affordance is the `MenuItem` form inside `UserAvatarPopover`).

**Decision: delete all six.** The four-audit dead-code rule and CLAUDE.md both dispose dead code by removal, not by testing it. Because deleting `AuthPage` transitively orphans the three **floored** files, the honest end state requires removing their bookkeeping too: drop `AppMenu.tsx` / `Logo.tsx` / `Nav.tsx` from the `vitest.config.ts` `thresholds` map and the `eslint.config.mjs` `sonarjs/cognitive-complexity = error` array (the 4.1 block — `AppFrame.tsx` / `AppNav.tsx` / `AppLogo.tsx` / `Header.tsx` stay, all live), and delete `app/ui/components/__tests__/{AppMenu,Logo,Nav}.test.tsx`. After this change the only chrome is the `AppFrame` path; no orphaned tested-but-dead code remains. `tsc --noEmit` + `npm run build` in the pre-merge gate backstop the deletion.

**Alternative considered — scope to `(auth)` and flag the cluster** (mirror 9.2's `ReorderInputGroup` "flag for §7 close-out" disposition): delete only `AuthPage`/`AuthButtons`/`SignOutButton`, leave `AppMenu`/`Logo`/`Nav` orphaned-but-floored, flag them as a follow-up. **Rejected by the operator** — it leaves three known-dead files with passing tests that assert nothing about product behavior (a TESTING.md substance-bar violation in the interim), and a follow-up to delete them would re-touch the same files. Deleting the whole cluster once is the "touch once" disposition. The `app-frame` spec never names these primitives, so **no `app-frame` delta is required**.

### Decision 3 — Mocking strategy per surface class

- **Async RSC shells** — `vi.mock('@/lib/auth')` (`auth()` → a session or `null`); for `SignInPage`, `vi.mock('next/server')` stubbing `connection()` to a resolved no-op; `vi.mock('next/navigation')` with `redirect()` throwing a sentinel (the established pattern) so the redirect branch is assertable; `vi.mock('next/image')` to a plain `<img>` (the `AppFrame.test.tsx` precedent). Await the component (`await User()`, `await SignInPage()`, `await IndexPage()`) and assert the rendered output or the thrown sentinel. `User.test.tsx` mocks `./UserMenu` and asserts the **resolved session is forwarded** as the `session` prop (the `AppFrame.test.tsx` "mock `User`, assert forwarded" precedent, inverted one level down). `SignInPage.test.tsx` renders the **real** `AuthContainer` + `SignInButton` (cheap, in-carve-out) with `@/app/actions/user` mocked.
- **Client components** — render real; `vi.mock('@/app/actions/user')` (stub `signInUser`/`signOutUser` to spies), `vi.mock('next/image')`, and (for `UserMenu`'s `SignedOutMenu` and `UserAvatarPopover`) drive open/close with `@testing-library/user-event`. `UserAvatarPopover` renders through the **real** `Menu`/`MenuItem`/`MenuLinkItem` (LOCKS the `menu-system` requirement). Assertions: the avatar trigger's `aria-expanded`/`aria-haspopup`/`aria-label`, the popover header (`user.name`, `user.email`, and the `?? 'Signed in'` / email-absent branches), the Connections `MenuLinkItem` `href="/settings/connections"`, the Sign-out `MenuItem`, and the open→close transitions (trigger toggle, `MenuLinkItem onClick={close}`, Escape/outside-dismiss via the real `Menu`).
- **Pure render components** — plain `render` + assert structure/branch: `AuthContainer` with and without the optional `className` (the `sign-in-page ${className}` interpolation — the `undefined` branch is observable in the class list); `UserImage`'s `alt={name}` / `src={image}` and the empty-string fallbacks (`user.image || ''`, `user.name || ''`) that `UserAvatarPopover` passes.

**Internal modules are never mocked** beyond the `auth()` / `next/server` / `next/navigation` / `next/image` / sibling-floored-component boundaries `testing-foundation` permits.

### Decision 4 — Server-action `<form>` assertion mechanic: render + structure is the substance backbone

`SignInButton` (`<form action={signInUser}>`) and the `UserAvatarPopover` sign-out (`<form action={signOutUser}>` with a submit `MenuItem`) wire a server action to a form. React 19 sets up function-form-actions through an internal handler — the function is **not** readable off the DOM `action` attribute, and the repo has **no precedent** for submit-and-assert-the-action-fired (the one consumer that renders `SignInButton`, `PurchaseFlowContainer.test.tsx`, deliberately **mocks the whole button** to "assert the sign-in affordance without importing the action").

**Decision:** the substance assertions for these files are the **exact rendered structure and text** (TESTING.md's "exact rendered text or structure" bar): `SignInButton` renders a `<form>` wrapping the `gsi-material-button` button, the Google `<svg>`, and the exact "Sign in with Google" label; the `UserAvatarPopover` sign-out renders a submit `MenuItem` ("Sign out") inside a `<form>`. These execute every line of each file → meet `COVERAGE_FLOOR` on render alone (the action lives in a mocked module and is not a line of the component). An additional `user.click` → `expect(signInUser/signOutUser).toHaveBeenCalled()` assertion is attempted as a behavioral bonus and **kept only if React 19 reliably invokes the function action under jsdom** (verified at apply); if it does not fire deterministically, the render/structure assertions carry the file and the real dispatch stays covered by the e2e (6.1 clicks the real button). No test is weakened to a tautology to chase the firing.

### Decision 5 — `SignInPage` `connection()` + redirect: the unit complement to the e2e

`SignInPage` calls `await connection()` (force-dynamic so the bypass session is resolved per request, per its inline comment), then `await auth()`, then `redirect('/')` when `session?.user` is truthy. The e2e (6.1, guest project) covers the **logged-out render** (`/sign-in` → logo + "Sign in with Google"); it does **not** exercise the **already-authenticated → redirect** branch.

**Decision:** the unit test mocks `connection()` (resolved no-op), `auth()`, and sentinel `redirect()`, and asserts both branches: `auth()` → user ⇒ the `redirect('/')` sentinel is thrown (no render); `auth()` → `null` ⇒ the `AuthContainer` + logo `Image` + `Suspense`-wrapped `SignInButton` render. This is the non-redundant split the issue's coordination note requires — the unit tier owns the **branch logic**, the e2e tier owns the **real rendered surface**. The `sign-in/page.tsx` shell test asserts the `Suspense` fallback (`'loading sign in...'`) wraps `SignInPage` (mock `SignInPage`).

### Decision 6 — No new requirement elevated; non-elevation rationale recorded

The four-audit invariant-elevation obligation is discharged with a **no-elevation** decision, justified per behavior:

- **`UserAvatarPopover` structure** — **already** a `menu-system` SHALL (*"UserAvatarPopover uses Menu primitive"*: the `<Menu>` with the user header, Connections `MenuLinkItem`, and Sign-out `MenuItem`). LOCKED by the new test rendering through the real `Menu`; **not** duplicated into a new requirement.
- **Sign-in-surface render** — **already** an `e2e-critical-flows` SHALL (the "Sign-in surface" requirement). LOCKED at the unit level (`SignInPage` renders logo + `SignInButton` for a session-less viewer); coordinated non-redundantly with the e2e (Decision 5). No new requirement.
- **`UserMenu` session→surface branch** (`!!session?.user` → `UserAvatarPopover` else `SignedOutMenu`) and **`SignInPage` redirect-when-authenticated** — small UI guards with **no clean owning capability** (there is no auth-UI / account-menu capability spec; `menu-system` owns the *primitive*, `app-frame` owns the *nav layout*, `e2e-critical-flows` owns the *flow*). Per the three-part elevation test, both fail part (c) decisively (a mis-branch is a minor UX wrong-surface, not a data-integrity or privacy invariant like 9.2's visibility rollback), and neither has a natural spec home. **Decision: do not manufacture a SHALL.** Both are fully constrained by the new unit tests; the non-elevation is recorded in `tasks.md`.

### Decision 7 — `'use server'` on `User.tsx`: lock behavior, flag the directive

`User.tsx` carries a top-level `'use server'` directive but default-exports a React **component** that returns JSX. `'use server'` marks a module's exports as **server actions** (RPC endpoints invoked from the client), not server components; a JSX-returning async component is not a server action. It currently works because `User` is only ever rendered as an RSC child of `AppFrame`, but the directive is semantically wrong and a latent footgun (it would misbehave if a client component imported `User`).

**Decision:** the test **locks the actual behavior** (`User` resolves `auth()` and renders `<UserMenu session={resolved}>`); the directive misuse is recorded as an audit finding in `tasks.md` with a recommended disposition (drop the `'use server'` line — `User` is a plain async RSC) for the operator. **Not changed here** — a directive edit is a source-behavior change outside this test-only carve-out's mandate (the 9.2 Decision 8 "lock-actual, flag-for-operator" precedent).

### Decision 8 — `e2e-critical-flows` "AuthPage" stale prose: flag, do not modify

The active `e2e-critical-flows` spec and `e2e/auth.guest.spec.ts` describe the sign-in surface as "the AuthPage sign-in UI". After `AuthPage.tsx` is deleted, that prose name dangles — the surface is really `SignInPage` (via `/sign-in`). The e2e **test and flow are unaffected**: the guest spec navigates to `/sign-in` and asserts the button; it never imported `AuthPage`.

**Decision: do not modify** the `e2e-critical-flows` spec or the e2e test in this unit carve-out. "AuthPage" there reads as a user-facing **surface label**, not a file reference, and editing an e2e spec from a unit carve-out is cross-tier scope creep. Recorded as an audit observation in `tasks.md` recommending the operator refresh the prose ("the sign-in page UI") at the §7 close-out or a docs follow-up.

### Decision 9 — One test file per source file, colocated under `__tests__/`

Per `testing-foundation` colocation + the `__tests__/` convention: `app/(auth)/ui/components/__tests__/{User,UserMenu,UserAvatarPopover,UserImage,SignInPage,SignInButton,AuthContainer}.test.tsx` and `app/(auth)/sign-in/__tests__/page.test.tsx`. Shared Arrange (a session factory, the `redirect()` sentinel, the `next/image` mock) is hoisted into each file's `beforeEach`; a colocated `__tests__/test-helpers.ts` is extracted only on 3+ reuse (the established threshold).

## Risks / Trade-offs

- **Deleting `AppMenu`/`Logo`/`Nav` re-touches an archived carve-out's (4.1) deliverables** → Mitigated by the explicit operator decision (Decision 2) and the cascade grep proving each is dead once its sole importer is removed; the `app-frame` spec never named them, so no spec contract breaks. `tsc --noEmit` + `npm run build` catch any missed dynamic reference.
- **React 19 function-form-action may not fire under jsdom** → Mitigated by Decision 4: render/structure assertions are the substance backbone and meet the floor on render alone; the action-fired assertion is a kept-if-it-works bonus, never a tautology, with the e2e owning the real dispatch.
- **`SignInPage`'s `connection()` is an unusual mock surface** → Mitigated by stubbing it as a resolved no-op `vi.mock('next/server')`; it has no return contract the component reads (it is a force-dynamic barrier), so a no-op faithfully models it.
- **Over-deletion could remove a file something renders** → Mitigated by repo-wide string-match grep (zero references for all six) plus the build gate; the carve-out adds the deletions to `tasks.md` as explicit audit findings so a reviewer sees each justified.
- **Manufacturing a spec requirement with no home (over-elevation)** → Avoided by Decision 6's no-elevation call; the already-specced behaviors are LOCKED, the homeless guards stay unit-covered, and the rationale is recorded so a reviewer sees the elevation question was answered, not skipped.
