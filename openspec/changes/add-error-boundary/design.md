# Design — Add App-Level Error Boundary

## Context

No `error.tsx` / `global-error.tsx` exists under `app/`. Uncaught server render errors fall through to Next's built-in default error page — bare, un-chromed, no recovery beyond raw reload. App Router semantics: an `error.tsx` boundary catches errors thrown by segments *below* its layout, and renders inside that layout; `global-error.tsx` catches errors in the root layout itself and must render its own `<html>`/`<body>`. Both must be client components.

The `(main)` route group owns the persistent app frame (`app-frame` spec). The root layout (`app/layout.tsx`) holds fonts, global.css, Toaster, analytics.

## Goals / Non-Goals

**Goals:**

- Any uncaught server render error in a `(main)` route shows an app-styled, in-chrome error state with retry and digest.
- A last-resort `global-error.tsx` so even root-layout failures don't show Next's default page.

**Non-Goals:**

- Fixing the `/lists` `Connection closed` transient (separate work).
- Per-route granular boundaries (one `(main)`-level boundary suffices until a route needs finer scoping).
- Error reporting/telemetry integration.
- Boundary for the `(auth)` group — sign-in page is minimal; root `global-error` covers catastrophic cases there. Revisit if auth UX errors become a real path.

## Decisions

### D1: Boundary placement — `app/(main)/error.tsx`, not `app/error.tsx`

A boundary at `app/error.tsx` would render inside the root layout but *outside* the `(main)` layout — losing the gradient nav/frame and violating the spirit of `app-frame` ("every route under `(main)/` renders inside the shared frame"). Placing it at `app/(main)/error.tsx` keeps the frame because the boundary replaces only the page subtree under the `(main)` layout. Rejected: `app/error.tsx` (un-chromed); per-route `error.tsx` files (premature granularity).

### D2: Root fallback — `app/global-error.tsx` with self-contained markup

`global-error.tsx` replaces the root layout, so fonts, `global.css`, and tokens may be unavailable; it must render `<html>`/`<body>` itself with minimal, dependency-free styling (system font stack, plain markup). The `Button` primitive depends on `button.css` imported by the root layout, which is gone in this path — so the reload control here is a plain `<button>` with inline-safe styles. This is the one sanctioned exception to the button-system primitive rule, because the primitive's CSS cannot load in this render path; documented in the spec.

### D3: Recovery affordances

`(main)/error.tsx`: primary action calls `reset()` (re-render attempt — right for transients like the observed `Connection closed`); secondary `LinkButton` home. `global-error.tsx`: `reset()` button only. Rejected: `window.location.reload()` as primary — full reload loses client state and `reset()` already covers the transient case; reload remains available to the user natively.

### D4: Digest surfaced

Both boundaries render `error.digest` (when present) in a muted "Error reference: <digest>" line so support/debugging keeps the correlation id Next's default page provided. Server error messages are redacted by Next in production; the digest is the only safe identifier — do not render `error.message` in the boundary copy.

### D5: Styling

`(main)/error.tsx` uses existing `global.css` tokens (`--heading-text-color`, `--subtitle-text-color`, etc.) per the `app-frame` token requirement, and the `Button`/`LinkButton` primitives per `button-system`. Layout mirrors the empty-state visual pattern (centered icon/heading/subtext) without claiming the `empty-state-system` classes — error state is a distinct concept; reusing its classes would couple unrelated concerns. No new tokens.

### D6: Permanent local-mode error fixture route for e2e coverage

The boundary is only observable when a server render actually throws, and no production route throws on demand. A permanent fixture route at `app/(main)/dev-error/page.tsx` throws during server render when `USE_PG_DRIVER === '1'` (the existing local-mode flag that already gates the auth bypass and localhost DB guard) and calls `notFound()` otherwise — so the e2e suite, which runs the production server under local mode, can hit `/dev-error` and assert the styled boundary, while the deployed app serves a 404. This is the same sanctioned seam as the auth bypass, not a new test-only backdoor surface. Rejected: route-mocking/network interception (cannot make a server component throw from Playwright); a temporary route deleted after manual verification (leaves the acceptance criterion untested in CI).

## Risks / Trade-offs

- [Boundary only catches render errors below `(main)` layout; errors thrown *in* the `(main)` layout fall to global-error, losing chrome] → acceptable: global-error still avoids the bare default page.
- [`reset()` may immediately re-throw on persistent failures, looping the user] → copy sets expectation ("try again"), home link offers an exit.
- [global-error is hard to exercise in dev (Next shows the dev overlay instead)] → verify via production build (`next build && next start`) or unit-test the component directly.

## Open Questions

(none)
