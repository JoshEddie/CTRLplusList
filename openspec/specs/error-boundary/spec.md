# error-boundary Specification

## Purpose

TBD - created by archiving change add-error-boundary. Update Purpose after archive.
## Requirements
### Requirement: (main) routes render an in-chrome error boundary

A client-component route boundary at `app/(main)/error.tsx` SHALL catch uncaught render errors from any route segment under `app/(main)/` and render an app-styled error state inside the persistent app frame. The boundary SHALL consume `global.css` design tokens (per the `app-frame` capability, which owns the frame and token requirements) and SHALL NOT introduce new tokens or literal theme values.

#### Scenario: Uncaught server render error in a (main) route

- **WHEN** a page under `app/(main)/` throws an uncaught error during server render
- **THEN** the app frame (gradient nav) remains visible and the error boundary's styled content renders in place of the page, instead of Next.js's default error page

#### Scenario: Boundary content

- **WHEN** the `(main)` error boundary renders
- **THEN** it shows a friendly heading and supporting message, a retry action, and a link back to home
- **AND** it does not render the raw `error.message`

### Requirement: Retry and home affordances use button-system primitives

The `(main)` boundary's retry action SHALL be the `Button` primitive invoking the boundary's `reset()` callback, and the home affordance SHALL be the `LinkButton` primitive (per the `button-system` capability, which owns these surfaces). No page-scoped one-off button classes.

#### Scenario: Retry re-attempts the render

- **WHEN** the user activates the retry button
- **THEN** `reset()` is invoked, re-attempting the failed segment render

#### Scenario: Home link exits the error state

- **WHEN** the user activates the home affordance
- **THEN** the app navigates to `/`

### Requirement: Error digest is surfaced

When the caught error carries a `digest`, both boundaries SHALL render it in a muted "Error reference" line so the server-log correlation id remains available for support. When no digest exists, the line SHALL be omitted.

#### Scenario: Digest present

- **WHEN** the boundary catches an error with a `digest` property
- **THEN** the digest value is visible in the rendered error state

#### Scenario: Digest absent

- **WHEN** the boundary catches an error without a `digest`
- **THEN** no empty "Error reference" line renders

### Requirement: E2E coverage via local-mode error fixture route

A fixture route at `/dev-error` SHALL throw during server render when `USE_PG_DRIVER === '1'` and respond 404 (`notFound()`) otherwise. The Playwright suite SHALL assert that visiting `/dev-error` under the authenticated project renders the styled `(main)` boundary inside the app frame — not Next.js's default error page.

#### Scenario: Fixture route under local mode

- **WHEN** the e2e suite visits `/dev-error` against the local-mode production server
- **THEN** the styled boundary renders (heading, retry button, home link, digest line) inside the app frame, and Next's default "This page couldn't load" page does not

#### Scenario: Fixture route in production mode

- **WHEN** `/dev-error` is requested without `USE_PG_DRIVER=1`
- **THEN** the route responds with the 404 page

### Requirement: Root global-error fallback

A client-component boundary at `app/global-error.tsx` SHALL catch errors thrown by the root layout and render a self-contained `<html>`/`<body>` document with a plain-markup error message, a retry control invoking `reset()`, and the digest when present. Because the root layout's stylesheets (including `button.css`) are unavailable in this render path, the retry control is exempt from the `button-system` primitive requirement and SHALL use dependency-free styling.

#### Scenario: Root layout failure

- **WHEN** the root layout itself throws during render
- **THEN** the global-error boundary renders its self-contained error document instead of Next.js's default error page
