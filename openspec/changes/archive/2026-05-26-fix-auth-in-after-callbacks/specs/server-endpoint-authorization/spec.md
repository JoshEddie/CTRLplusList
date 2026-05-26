## ADDED Requirements

### Requirement: Server-side side-effects deferred via `after()` SHALL NOT depend on request-scoped APIs

Any side-effect registered with `import { after } from 'next/server'` and invoked from a server component, route handler, or server action SHALL NOT, on any code path executed *inside* the `after()` callback, call `headers()`, `cookies()`, the zero-argument `auth()` overload, or any other API that reads from the in-flight request. Next 16 disallows these calls inside `after()` callbacks because the request lifecycle has ended before the callback runs; the calls throw at runtime with `Route … used 'headers()' inside 'after()'`.

Any identity, session, or request-context value required by the deferred work SHALL be resolved by the caller *before* the `after()` registration and captured by closure into the callback. Implementations SHALL capture the resolved value to a named local (e.g. `const viewerId = user.id;`) on the line preceding the `after()` registration to make the request-context boundary visually explicit. Inside the callback, code SHALL reference that captured local — not any helper that would re-derive identity from request state.

This requirement is a sibling of the existing rule that the actor id is exclusively resolved from `auth()`: that rule governs the *synchronous* portion of a server action where `auth()` is callable; this rule governs the *deferred* portion where `auth()` is not. Together they imply that a server action whose only call site is inside an `after()` callback and which writes a row belonging to the actor SHOULD be inlined at that call site rather than exposed as a `'use server'` export. The `'use server'` boundary makes the action network-callable; if it cannot self-authorize via `auth()` (because it would be called from `after()`) and cannot accept the actor id as a parameter (because doing so for ownership-bearing writes is forbidden by the ownership-verification requirement), the only safe shape is inline server-component code that closes over a pre-validated viewer id.

#### Scenario: `headers()` inside `after()` throws

- **WHEN** a server component registers `after(() => actionThatCallsAuth())` where `actionThatCallsAuth` internally calls `auth()` (which reads `headers()`)
- **THEN** Next 16 throws `Route … used 'headers()' inside 'after()'. This is not supported.` at runtime when the callback fires, and the deferred work does not complete

#### Scenario: Deferred work uses a captured viewer id without calling `auth()`

- **WHEN** a server component has already resolved the viewer via `await auth()` → `getUserIdByEmail(...)` earlier in render, captures the resulting id to a local before the `after()` boundary, and references only that local inside the callback
- **THEN** the `after()` callback runs without invoking `headers()`, `cookies()`, or zero-arg `auth()`, and the deferred DB write completes against the captured id

#### Scenario: Single-call-site server-only side-effect is inlined rather than exposed as an action

- **WHEN** a server-side bookkeeping side-effect (e.g. recording a self-targeted visit row, updating a self-targeted "last seen" timestamp) has exactly one internal call site that is inside an `after()` callback, AND the side-effect writes only rows whose `user_id` equals the actor
- **THEN** the side-effect SHALL be implemented as inline server-component code inside the `after()` callback (closing over a pre-validated viewer id) and SHALL NOT be exported as a `'use server'` action. Exporting it as an action would either require calling `auth()` inside `after()` (forbidden) or accepting the actor id as a parameter (forbidden for ownership-bearing writes by the existing ownership-verification requirement)

#### Scenario: Deferred cache invalidation is permitted

- **WHEN** the deferred work inside an `after()` callback performs a DB write and follows it with `updateTag(...)` or `revalidateTag(...)`
- **THEN** the tag invalidation SHALL run inside the same `after()` callback (this is the supported pattern for cache invalidation that cannot run during render), provided no request-scoped API is invoked on the path to the tag call
