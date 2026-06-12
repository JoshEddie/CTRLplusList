# Add App-Level Error Boundary

## Why

The app has no `error.tsx` or `global-error.tsx` anywhere under `app/`, so any uncaught server render error collapses the route to Next.js's bare built-in error page ("This page couldn't load / ERROR \<digest\>") with no app chrome, branding, or recovery path ([issue #107](https://github.com/JoshEddie/CTRLplusList/issues/107)). This was observed on PR #106 when a transient `Connection closed` during the streamed `MyListsPage` render destroyed the whole `/lists` route.

Inherited constraints from active specs:

- `app-frame`: every route under `app/(main)/` SHALL render inside the shared frame (gradient nav, content card); pages under `(main)/` SHALL consume design tokens from `global.css`, not literal theme values. A `(main)/error.tsx` boundary renders *inside* the `(main)` layout, so the frame requirement is satisfied by placement, and the boundary's own styling must use tokens.
- `button-system`: the recovery affordance (retry/reload button) SHALL flow through the existing `Button` primitive — no page-scoped one-off button class.

## What Changes

- Add `app/(main)/error.tsx` — a client-component route boundary rendered inside the persistent app frame, styled with existing tokens, offering a friendly message, a retry affordance (`reset()`), and the error digest surfaced for support.
- Add `app/global-error.tsx` — last-resort boundary for errors thrown in the root layout itself; renders its own `<html>`/`<body>` with minimal inline-safe styling (root layout chrome is unavailable by definition).
- The fix to the underlying `/lists` `Connection closed` transient and CI retries remain out of scope (tracked separately per the issue).

## Capabilities

### New Capabilities

- `error-boundary`: app-styled error boundaries — the `(main)` route boundary (in-chrome, tokened, Button-primitive retry, digest surfaced) and the root `global-error` fallback.

### Modified Capabilities

(none — no existing spec's requirements change; `app-frame` and `button-system` constraints are satisfied, not amended)

## Impact

- New files: `app/(main)/error.tsx`, `app/global-error.tsx` (both `'use client'`).
- Uses existing `Button` primitive and `global.css` tokens; no new tokens expected.
- No data-layer, schema, or cache-tag impact (boundaries are pure UI; no server reads).
- Tests: unit tests for the boundary components per TESTING.md; e2e acceptance is that an uncaught server render error shows the styled boundary, not Next's default page.
