## MODIFIED Requirements

### Requirement: API route handlers consuming paid third-party quota SHALL apply per-user rate limiting

Any handler covered by the previous requirement SHALL enforce a per-user request budget. Implementation MAY be an in-memory token bucket keyed by `users.id` (acknowledging that this is per-process and degrades with multi-replica deploys); the bucket's capacity SHALL be tuned so a single user cannot exhaust the provider quota in less than a working hour. The budget SHALL be enforced over a fixed time window: once the window elapses, a user's spent budget SHALL reset so a previously-throttled user can issue requests again. The budget SHALL be isolated per user: one user reaching their limit SHALL NOT throttle a different authenticated user. When a user exceeds their budget the handler SHALL return HTTP 429 with a JSON body distinguishing the error from upstream quota exhaustion (e.g. `{ error: 'rate_limited' }` vs the existing `{ error: 'quota_exceeded' }`).

Additionally, query-string inputs that propagate to the upstream provider SHALL be length-capped (`?q=` ≤ 200 characters for image-search) and reject with HTTP 400 when exceeded.

#### Scenario: User exceeds per-user budget

- **WHEN** an authenticated user issues more requests against `/api/image-search` than the configured budget within the bucket window
- **THEN** the handler returns HTTP 429 with `{ error: 'rate_limited' }` without calling the provider

#### Scenario: Budget window resets after its interval

- **WHEN** an authenticated user has exhausted their per-user budget and then issues a further request after the bucket window has elapsed
- **THEN** the budget is reset and the request proceeds (HTTP 200) and reaches the provider, rather than returning HTTP 429

#### Scenario: One user's exhaustion does not throttle another user

- **WHEN** authenticated user A has exhausted their per-user budget and authenticated user B issues their first request within the same window
- **THEN** user B's request proceeds (HTTP 200) and reaches the provider, because the budget is keyed per `users.id`

#### Scenario: Oversized query is rejected

- **WHEN** an authenticated user issues `GET /api/image-search?q=<201-char-string>`
- **THEN** the handler returns HTTP 400 with a query-length error and SHALL NOT call the provider
