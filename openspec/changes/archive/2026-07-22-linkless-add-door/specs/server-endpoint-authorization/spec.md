# server-endpoint-authorization Delta

## MODIFIED Requirements

### Requirement: API route handlers consuming paid third-party quota SHALL require authentication

Any handler under `app/api/**/route.ts` that makes a request to a metered third-party provider (currently Zyte via `app/api/product-fetch/route.ts`) SHALL `await auth()` at the top of every method handler (`GET`, `POST`, etc.) and return `401 Unauthorized` with no body or a `{ error: 'Unauthorized' }` JSON body when no session exists.

This requirement does NOT apply to handlers whose only third-party calls are to free or pre-paid sources at fixed cost (e.g. health-check pingbacks, OAuth callbacks).

#### Scenario: Unauthenticated product-fetch request is rejected before provider call

- **WHEN** an unauthenticated client issues `POST /api/product-fetch`
- **THEN** the handler returns HTTP 401 and SHALL NOT call Zyte

#### Scenario: Authenticated product-fetch request proceeds

- **WHEN** a client with a valid session issues a well-formed `POST /api/product-fetch`
- **THEN** the handler resolves the session, applies the rate limit, and delegates to the provider seam

### Requirement: API route handlers consuming paid third-party quota SHALL apply per-user rate limiting

Any handler covered by the previous requirement SHALL enforce a per-user request budget. Implementation MAY be an in-memory token bucket keyed by `users.id` (acknowledging that this is per-process and degrades with multi-replica deploys); the bucket's capacity SHALL be tuned so a single user cannot exhaust the provider quota in less than a working hour. The budget SHALL be enforced over a fixed time window: once the window elapses, a user's spent budget SHALL reset so a previously-throttled user can issue requests again. The budget SHALL be isolated per user: one user reaching their limit SHALL NOT throttle a different authenticated user. When a user exceeds their budget the handler SHALL return HTTP 429 with a JSON body distinguishing the error from upstream failure shapes (e.g. `{ error: 'rate_limited' }`).

Additionally, request inputs that propagate to the upstream provider SHALL be validated and length-capped before spending quota (for product-fetch, the URL validation and size cap owned by `product-link-prefill`), rejecting with HTTP 400 when exceeded.

#### Scenario: User exceeds per-user budget

- **WHEN** an authenticated user issues more requests against `/api/product-fetch` than the configured budget within the bucket window
- **THEN** the handler returns HTTP 429 with `{ error: 'rate_limited' }` without calling the provider

#### Scenario: Budget window resets after its interval

- **WHEN** an authenticated user has exhausted their per-user budget and then issues a further request after the bucket window has elapsed
- **THEN** the budget is reset and the request proceeds and reaches the provider, rather than returning HTTP 429

#### Scenario: One user's exhaustion does not throttle another user

- **WHEN** authenticated user A has exhausted their per-user budget and authenticated user B issues their first request within the same window
- **THEN** user B's request proceeds and reaches the provider, because the budget is keyed per `users.id`

#### Scenario: Oversized or malformed input is rejected

- **WHEN** an authenticated user issues `POST /api/product-fetch` with an oversized or invalid URL
- **THEN** the handler returns HTTP 400 (`{ error: 'invalid_url' }`) and SHALL NOT call the provider or spend a rate-limit token
