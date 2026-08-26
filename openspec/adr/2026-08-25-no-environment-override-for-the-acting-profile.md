# No environment override for the acting profile

**Touching**: `E2E Test`, `Local Dev`

**Context**: An environment variable was cut in advance as the local-mode and e2e override for the active profile, mirroring the session-user override that makes bypassed auth deterministic. Reaching for it revealed the mismatch: the session override pins one process-wide fact, while the acting profile has to differ from one test to the next.

**Decision**: There is no environment override for the acting profile. A test pins its acting profile by setting the same cookie the application sets, per browser context, and local development switches through the real UI. A request carrying no cookie already resolves deterministically to the self-profile, so the un-pinned starting state needs no mechanism of its own.

**Consequences**: Suites can pin different profiles per spec, and the switching path stays exercisable end to end by simply not pinning. The trade is that the cookie mechanism is always in the loop, so a fault in it cannot be isolated away by an override.
