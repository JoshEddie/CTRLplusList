# testing-foundation Delta

## MODIFIED Requirements

### Requirement: Tests SHALL NOT call rate-limited external services

Tests SHALL mock the network boundary of any external service whose real provider imposes a quota, charges money per call, or requires interactive credentials. Known boundaries in this category at the time of writing: the `app/api/product-fetch` upstream provider (Zyte), NextAuth Google OAuth, and any third-party service added later. The mocks SHALL replace the network call (e.g., `fetch` interception, MSW handlers, or framework-equivalent), NOT internal application modules. Internal modules — DAL functions, server actions, `lib/`, hooks — SHALL NOT be mocked when their dependencies are local; integration tests SHALL exercise them against the real test database.

#### Scenario: Product-fetch upstream is mocked

- **WHEN** a test exercises `POST /api/product-fetch`
- **THEN** the upstream provider's network endpoint is intercepted at the `fetch` boundary (or the deterministic `product-fetch-mock` seam is used)
- **AND** the test asserts on the route's auth + rate-limit + response-shape behavior against the intercepted response
- **AND** no real call to the upstream provider occurs in CI or local runs

#### Scenario: NextAuth is not invoked against real Google

- **WHEN** a test requires an authenticated session
- **THEN** the test uses the local-mode auth bypass (`USE_PG_DRIVER=1`, with the `BYPASS_SESSION_USER` identity selector — see the e2e execution-model requirements below) or an equivalent fixture
- **AND** no OAuth handshake to a real Google endpoint occurs
