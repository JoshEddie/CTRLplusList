# Proposal: mock-product-fetch

## Why

Every downstream add-item deck state currently depends on a real Zyte call — paid quota, non-deterministic results (bot walls, retries), and locally the accidental "no key ⇒ always timeout" behavior makes success states unreachable at all (issue #177, surfaced verifying #175). The primary purpose is **visual** testing: pulling up any UI state on demand to eyeball it — the defect class (the `.deck-timeout` padding bug) that unit tests and functional e2e never flag. A deterministic, localhost-guarded mock at the existing `fetchProduct` seam makes every deck state reachable in seconds, with deterministic deck-flow e2e as the secondary win, without touching the real path.

Inherited constraints: `product-link-prefill` requires the route to stay free of extraction logic and the seam to encapsulate the fetch strategy ("changing or stacking vendors is a seam-internal change that does not touch the route") — the mock rides that seam; the only route change is a small guarded check for the `rate-limited` scenario, whose 429 originates in the route itself and is unreachable from the seam. `e2e-critical-flows` forbids calling external quota-charging services — this mock is the sanctioned stand-in it anticipates for the deck flow.

## What Changes

- New mock branch at the top of `fetchProduct`: in local mode (`USE_PG_DRIVER=1` — no new flag) with hostname `mock.test`, return a scenario fixture instead of calling Zyte. Real path untouched otherwise — including real URLs pasted in local mode, so real-Zyte testing stays reachable per-request.
- Magic-URL scenario selector: `https://mock.test/<scenario>`, toggled per-request at runtime. Unknown scenario → `fetch_failed`. The hostname is the entire mock switch: deployed environments can never enter local mode (`USE_PG_DRIVER`'s existing localhost boot guard), where a pasted `mock.test` URL just takes the real path and fails like any dead link.
- TypeScript fixtures typed against `ProductResult`/`ProductData`, one per scenario: `success`, `success-single-image`, `success-long-title`, `success-title-warn`, `success-long-desc`, `success-no-price`, `success-no-image`, `success-many-images`, `fetch-failed`, `timeout`, `rate-limited`. Image URLs use the seed's picsum convention (`https://picsum.photos/seed/<id>/400/400`) so the client-side `prunePhotos` ≥200px probe keeps them. Title tiers are split — `success-long-title` (> `TITLE_MAX`, error/hard-block) and `success-title-warn` (`TITLE_SNAPPY`–`TITLE_MAX`, warn + inline note) — and `success-no-price` (omitted `price`) drives the price step; `success-long-desc` is a guard that the deck drops a fetched description (`seedFromFetch` never seeds one), not a long-description render. (`success-multi-store` deliberately dropped — the seam seeds a single store and #169 removes multi-stores; no invalid-store scenario — `store` is required non-empty.)
- Small guarded change in `POST /api/product-fetch`: in local mode, `mock.test` requests bypass the rate-limit bucket (it protects Zyte quota; mock requests never touch Zyte — visual iteration must not lock itself out), and scenario `rate-limited` returns 429, since that status is emitted by the route before the seam runs. Requires reordering the handler to auth → parse/validate → mock handling → bucket → seam; real URLs consume the bucket exactly as today.
- No new flag, script, or boot guard: `npm run dev:local` and the e2e server already set `USE_PG_DRIVER=1`, and its existing localhost boot guard is the deploy-safety story.
- **Piggybacked workflow fix (owner-approved):** `/start-change`'s explore route becomes an explore session only — interactive, owner-approved write-back, then stop; it never chains into propose (propose runs on the unlabeled route or on explicit owner ask, and its grill interview concludes only on the owner's explicit shared-understanding confirmation). Surfaced when this very change was started: the explore for #177 was collapsed into a questionnaire and rolled straight through propose. `.claude/skills/start-change/SKILL.md` and CLAUDE.md § Change lifecycle already carry the wording; the `trunk-workflow` delta makes it normative.

## Capabilities

### New Capabilities

- `product-fetch-mock` — the deterministic mock's contract: enablement + localhost guardrail, magic-URL selector, the scenario table (each scenario pinned to the downstream UI state it exercises), fixture typing, and the route-level 429 mock exception.

### Modified Capabilities

- `product-link-prefill` — the "delegate to Zyte behind a thin seam" requirement gains the mock branch (local mode + `mock.test` host precedes the key-absent/Zyte path), and the route requirement gains the local-mode `mock.test` handling (bucket bypass + `rate-limited` → 429) as the sole sanctioned route-side mock behavior.
- `trunk-workflow` — the `/start-change` routing and explore-write-back requirements change: explore route ends at owner-approved write-back (never chains into propose); explore is conducted interactively; propose's grill interview concludes only on explicit owner confirmation.

## Impact

- `lib/product-fetch/index.ts` — mock branch at seam top; `lib/product-fetch/mock.ts` (or co-located fixtures module) — scenarios + fixtures + local-mode check.
- `app/api/product-fetch/route.ts` — handler reorder (validate before bucket) + local-mode `mock.test` handling.
- No script or env changes — `dev:local` and the e2e server already set `USE_PG_DRIVER=1`.
- Unit tests for the mock branch and route check; existing product-fetch tests unaffected (flag off by default).
- `.claude/skills/start-change/SKILL.md` + CLAUDE.md § Change lifecycle — workflow-fix wording (edits already in the working tree; the spec delta here makes them normative). No code impact.
- No DB, schema, or cache-tag impact — the seam is stateless and upstream of all persistence.
- Sequencing: lands before #175 (deck-timeout fix + archive verification consume this mock).
