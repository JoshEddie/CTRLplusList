# Design: mock-product-fetch

## Context

`POST /api/product-fetch` → `fetchProduct` (`lib/product-fetch/index.ts`) → `fetchZyte` is the only external, quota-charging, non-deterministic path in the add-item flow. `product-link-prefill` already pins the architecture: the route contains no extraction logic, the seam encapsulates the vendor. Locally today, an absent `ZYTE_API_KEY` makes `fetchZyte` return `undefined`, so every local fetch ends at `fetch_failed` — success states are unreachable without spending quota.

Verified constraints from explore:

- `https://mock.test/<scenario>` passes the route's real `validateUrl` (`.test` has a dot; not caught by `isPrivateHostname`), so scenario selection needs no route change.
- `prunePhotos` (`deck/utils.ts`) probes image candidates client-side (`Image` load, ≥200px both axes); unloadable fixture URLs would collapse multi-image scenarios. Lists of <2 candidates skip the probe.
- The 429 for `rate_limited` is emitted by the route before the seam runs — a pure seam mock cannot produce it.
- `ProductData.store` is a single string; the seam cannot seed multi-store states (and #169 removes multi-stores).

## Goals / Non-Goals

**Goals:**

- Primary: on-demand visual inspection — any downstream add-item UI state reachable in seconds via a pasted magic URL, so look-and-feel defects (padding, truncation, overflow) get caught by eyes, the one gate that can see them.
- Every downstream add-item UI state reachable deterministically in e2e at zero Zyte cost.
- Structurally impossible to engage against a real deployment.
- Real Zyte path byte-for-byte untouched when the flag is off.

**Non-Goals:**

- No DB mocking (parked separately; Docker + seed already covers data determinism).
- No e2e deck suite in this change — this is the seam that makes one possible (#175 consumes it).
- No `success-multi-store` scenario.
- No artificial latency simulation; fixtures resolve immediately (the `fetching` screen is exercised naturally by transition, and #175 can revisit if a pinned in-flight state is ever needed).

## Decisions

### D1 — Inject at the top of `fetchProduct`, not inside `fetchZyte` or the route

The seam is the spec-sanctioned vendor boundary ("changing or stacking vendors is a seam-internal change that does not touch the route"). Injecting at `fetchZyte` would run the mock through the retry/timeout machinery (pointless for fixtures, and makes `timeout` awkward to fake); replacing the route's call would skip real auth/validation, which we explicitly want exercised. The mock returns a complete `ProductResult`, so `timeout` and `fetch_failed` are just fixture values.

### D2 — Magic-URL selector (`https://mock.test/<scenario>`), not env or query param

Per-request runtime toggling with no restart, works through the app's real client `fetch('/api/product-fetch')`, works identically in manual dev and Playwright. An env selector would pin one scenario per server boot; a query param would require touching the client caller. Rejected alternatives kept: env var (restart per scenario), request header (unreachable from the paste-a-URL UI).

Unknown scenario on `mock.test` → `fetch_failed`: a typo lands on the same screen a dead link would, and the real-path behavior stays the reference.

### D3 — Enablement: local mode itself (`USE_PG_DRIVER=1`), no new flag

The magic-URL hostname is already a per-request mock selector: `mock.test` → fixture, anything else → real path. A process-level flag layered on top selects nothing — it could only disable `mock.test` handling, which is never wanted locally and never a risk in production (deployed environments cannot enter local mode past `USE_PG_DRIVER`'s localhost boot guard; a `mock.test` URL pasted there takes the real path and fails like any dead link). So the mock keys off `USE_PG_DRIVER === '1'` directly.

Rejected: a separate `MOCK_PRODUCT_FETCH=1` flag + own boot guard + `dev:mock` script (an earlier draft of this design). Its stated benefit — keeping real Zyte testable from local mode — was already provided by the hostname selector: paste a real URL with a key configured and the real path runs. The flag added a script, a guard, and a "which mode am I in" question for zero selectable behavior. The owner also confirmed the intermediate combos (mock DB + real Zyte as a mode, real DB + mock Zyte) have no use case.

No enablement surface changes: `npm run dev:local` and the e2e servers already set `USE_PG_DRIVER=1`; plain `npm run dev` / Vercel never do.

### D4 — TypeScript fixtures, not JSON files

A `Record<Scenario, ProductResult>` literal in a TS module is compiler-checked against the real types on every build — drift fails loudly. JSON would need a parse-and-validate step to achieve less. Fixture image URLs reuse the seed's picsum convention (`https://picsum.photos/seed/<stable-id>/400/400`): deterministic per seed string, ≥200px so `prunePhotos` keeps them, and no new dependency class (the local seed already relies on picsum). `success-single-image` is immune to the probe entirely (<2 candidates).

### D5 — Route handles `mock.test` in local mode: bucket bypass + `rate-limited` → 429

Two route-side behaviors, same guarded condition (`USE_PG_DRIVER === '1'` + validated host `mock.test`):

- **Bucket bypass:** mock requests skip `checkRateLimit`. The bucket exists to protect paid Zyte quota; mock requests never reach Zyte, and without the bypass, visually iterating through 11+ scenario loads in a minute trips the real bucket and 429-locks every scenario for the rest of it — self-defeating for the mock's primary purpose. Real URLs consume the bucket exactly as today, in every mode.
- **`rate-limited` scenario → 429:** the one scenario whose observable (HTTP 429 `{error:'rate_limited'}`) originates in the route before the seam runs, so the route must produce it. Deterministic, instant, nothing counted.

Requires reordering the handler: auth → parse/validate → mock handling → bucket → seam (today the bucket runs before body parse, so the route can't recognize a mock request in the current order). Auth stays first; the bucket is per-authenticated-user, so the reorder has no abuse-surface cost.

Rejected: spamming 11 real requests (slow, and the filled bucket then 429s every scenario — including the success states being visually iterated on — for the rest of the minute); dropping the scenario (the banner renders is unit-tested, but the banner renders *well* is exactly the visual class this mock exists for). This is a deliberate, spec-recorded exception to "the route contains no mock logic" — recorded as a delta on `product-link-prefill`.

### D6 — Scenario table (each = one downstream UI state)

| Scenario | Fixture shape | Downstream state |
| --- | --- | --- |
| `success` | full product, several images | deck happy path |
| `success-single-image` | exactly 1 image | image-select flow skipped |
| `success-long-title` | title > `TITLE_MAX` (100) | title error tier — hard block |
| `success-title-warn` | title `TITLE_SNAPPY`–`TITLE_MAX` (51–100) | title warn tier + inline trim note |
| `success-long-desc` | API returns description ≥ `DESCRIPTION_MAX` (100) | deck drops it — note starts empty (guards the deliberate drop; `seedFromFetch` never seeds a description) |
| `success-no-price` | no `price` field | price step surfaces — triage "Not set" / error tier |
| `success-no-image` | no `imageUrl`/`imageUrls` | zero-photo path |
| `success-many-images` | 10 images (the `MAX_IMAGE_CANDIDATES` cap) | photo overflow / selector |
| `fetch-failed` | `{ok:false, error:'fetch_failed'}` | timeout screen |
| `timeout` | `{ok:false, error:'timeout'}` | timeout screen |
| `rate-limited` | route-level 429 | start-screen retry banner |

Two states that are *not* fetch-reachable, deliberately excluded: the note over-`DESCRIPTION_MAX` **error** state (reached only by the user typing in the note editor, never from a fetch — `success-long-desc` guards the drop, it can't render the over-limit note) and the **invalid-store** triage warn (`store` is a required non-empty string the seam always seeds).

### D7 — Piggybacked `/start-change` workflow fix rides this change

Starting this very change exposed a workflow defect: the explore route for #177 was collapsed into a one-shot questionnaire and chained straight into propose, with the grill interview self-certified. The owner's intended contract — explore route is an explore session only, ending at owner-approved issue write-back; propose runs on the unlabeled route (or explicit ask) and its interview concludes only on explicit owner confirmation — was already applied to `.claude/skills/start-change/SKILL.md` and CLAUDE.md, but `trunk-workflow` normatively said "explore before proposing / label removed before propose runs". Rather than a separate change (blocked by one-change-at-a-time with this one occupying the tree) or reverting the skill edits, the owner chose to piggyback the `trunk-workflow` delta here. Doc/skill/spec-only — no code surface, no interaction with the mock work.

## Risks / Trade-offs

- [Picsum outage / offline dev breaks multi-image scenarios] → same failure class the seed already has; the probe's stall path keeps candidates on timeout (`done(true)`), only a fast error prunes. Accepted.
- [Mock drift vs real Zyte response shape] → fixtures are typed against `ProductResult`, the same contract the real path compiles against; shape drift is a compile error.
- [Mock engaging on a real deploy] → impossible without local mode: `USE_PG_DRIVER=1` refuses to boot against a non-localhost DB, and without it a `mock.test` URL takes the real path and fails as `fetch_failed` like any dead link.
- [Route reorder + bucket bypass touch the real path] → validate-before-bucket is behavior-neutral for real traffic (invalid requests now 400 without spending a token — strictly friendlier); the bypass is dead code outside local mode; both recorded normatively in the spec delta so they can't grow silently.

## Migration Plan

No migration. Production sees only the handler reorder (validation errors stop consuming rate-limit tokens — a benign tightening); everything else is dead code outside local mode. Rollback = revert the change. No deploy-order coupling.

## Open Questions

None — enablement surface, 429 handling, fixture imagery, and the multi-store drop were settled with the owner during explore (issue #177 body records the outcomes).
