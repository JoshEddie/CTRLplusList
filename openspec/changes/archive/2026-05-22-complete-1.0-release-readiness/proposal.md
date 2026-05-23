## Why

PR #16 (`dev` → `release-1.0`) is the 1.0 rollup. The accompanying council review surfaced a set of release-hygiene gaps that, while not security-blocking, would either (a) break user-facing flows after the cut (bookmark breakage, share-model migration ambiguity), (b) ship 1.0 with no narrative or onboarding surface, or (c) leave OpenSpec / docs / ADR artifacts in a half-state that the project's tooling assumes are present.

The security/auth findings are addressed in the sibling change `harden-remaining-server-actions`. The test-suite gap is a much larger undertaking that warrants its own dedicated change — deliberately not bundled here. This change covers the remaining items needed for the 1.0 cut to be defensible.

Specifically, the items in scope group into four buckets:

1. **Release artifacts (mechanical, must-ship).** Set a `1.0.0` milestone on PR #16. Create `app/changelog/releases.ts` with the 1.0 entry. Create `.env.example` enumerating every env var the code reads. Confirm `package.json` version is `1.0.0` (already done in PR #16).
2. **Onboarding docs.** Replace the `create-next-app` boilerplate `README.md` with real project documentation. Add a "Database migrations" section to `CLAUDE.md` documenting `db:generate` / `db:migrate` / `db:seed:dev` / `db:reset:dev`.
3. **User-impact mitigations.** Add a redirect from the old `/(auth)` sign-in route to `/sign-in` so existing bookmarks don't 404. Decide and document the "share-lists → follow-users" data migration path (whether existing `shared_to` data is preserved, what users see post-cut). Tighten the `Archive` vs `Delete` affordances + helper copy on items so the destructive choice is unambiguous.
4. **OpenSpec / ADR hygiene.** Archive `extract-visibility-constants` (all tasks `[x]` complete). Resolve and archive `harden-server-action-authorization` (its remaining tasks 1.1, 5.5, 7.x, 8.4–8.5 are pre-flight verification and merge bookkeeping — they should close out before the release cut). Backfill ADRs for the cross-cutting architectural decisions landed in 1.0 (PWA adoption, OpenSpec workflow adoption, image-search provider chain, dev auth bypass, Neon HTTP no-transactions). Document the `next build --webpack` Turbopack/Serwist opt-out.

The frontend a11y findings (S1–S3) and the deeper DB index follow-ups (S5–S6) from the council review are filed separately — they are post-launch polish, not 1.0-blocking, and grouping them into this already-broad change dilutes the "release readiness" framing.

## What Changes

### Bucket 1: Release artifacts

- **ADD** `app/changelog/releases.ts` with a typed `Release` entry for 1.0.0 covering the headline groupings: design-system primitives + retokenization, surface migrations (auth/lists/items/users/settings), visit-history + bookmarks + follow-users (replacing legacy share-lists), items browser (pagination/sort/filter), multi-claim purchases + archival, PWA shell + iOS safe-area, image-search route, OpenSpec workflow adoption, dev auth bypass. (The convention referenced by the council's `/write-changelog` skill — confirm whether ADR-0009 exists and what the entry schema requires; if the convention has not been adopted yet, this change establishes it.)
- **ADD** `.env.example` at repo root enumerating every `process.env.*` key the code reads, with a one-line comment per var marking required vs optional. Specifically: `DATABASE_URL`, `AUTH_SECRET` / `NEXTAUTH_SECRET`, `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, `AUTH_BYPASS` (dev-only; prod-refused), `SERPAPI_API_KEY`, `SERPER_API_KEY`, `IMAGE_SEARCH_PROVIDERS`, `IMAGE_SEARCH_USE_MOCK`, `IMAGE_SEARCH_SIMULATE_QUOTA`.
- **SET** PR #16 milestone to `1.0.0` (metadata-only — done outside the file diff).

### Bucket 2: Onboarding docs

- **REPLACE** `README.md` boilerplate. The new README SHALL cover: one-line project description; prerequisites (Node version, Neon account); env setup (point at `.env.example`); migration flow (`db:generate` → review → `db:migrate`); seed flow (`db:seed:dev`, `db:reset:dev`, AUTH_BYPASS); dev server start; build notes (including the `next build --webpack` flag rationale — see Bucket 4); links to `CLAUDE.md`, `openspec/`, and the deployed app.
- **EXTEND** `CLAUDE.md` with a "Database migrations" section documenting the `db:generate` → review SQL → `db:migrate` workflow, including the Neon HTTP-driver caveat (no `db.transaction`; backstop races with constraints; see `db/index.ts`).

### Bucket 3: User-impact mitigations

- **ADD** a redirect: the old `/(auth)` route was deleted in favor of `/(auth)/sign-in`. Any user whose home-screen icon, bookmark, or shared link points at the old path SHOULD land at `/sign-in` (or `/` if already authenticated) rather than a 404. Implement via `next.config.ts` redirects or middleware.
- **DOCUMENT** the share-lists → follow-users transition explicitly. The migration script (already merged via `0001_black_legion.sql` and `drizzle/0004_backfill_items_archival.sql`) preserves `list_visits` data; what's not obviously preserved is the *shared_to* / *saved_lists* semantic. Audit whether any pre-1.0 `shared_to` data needs a backfill into `user_follows`, and if not, write a one-paragraph "What changed in 1.0" notice for `/` or a one-time toast for returning users.
- **REVIEW** the Archive vs Delete UX on items. The council's End User flagged ambiguity ("If I archive, can Grandma still see it as already-purchased? If I delete, do claimants lose their record?"). Either rename to "Hide from list" / "Delete permanently" with helper copy, OR keep the names and add a one-sentence helper-text on each affordance + a confirmation dialog on Delete that names the consequence.

### Bucket 4: OpenSpec / ADR hygiene

- **ARCHIVE** `extract-visibility-constants` — all tasks `[x]` complete; folds `list-visibility/spec.md` MODIFIED requirements into `openspec/specs/list-visibility/spec.md`.
- **RESOLVE-AND-ARCHIVE** `harden-server-action-authorization`. Close out its remaining tasks: 1.1 (prod-data check for purchase duplicates), 5.5 (image-search simulate-quota verification), 7.x (manual verification battery via dev bypass), 8.4 (PR description cross-referencing PR #16 findings), 8.5 (the archive itself). The change cannot remain unarchived through the 1.0 cut without leaving its delta specs (`server-endpoint-authorization`, `list-item-management`) inactive when the new `harden-remaining-server-actions` change builds on them.
- **CONFIRM-OR-AUTHOR** the ADR layout. The council's `/release-check` and `/write-changelog` skills reference `ADR-0007` (TOKEN_VERSION) and `ADR-0009` (release-cut artifacts) as gating artifacts; neither exists in the repo. Either (a) confirm they live elsewhere and link from the repo, or (b) author them as part of this change.
- **BACKFILL ADRs** for the cross-cutting 1.0 decisions: PWA adoption (Serwist 9.5 + `next build --webpack` opt-out), OpenSpec workflow adoption, image-search provider-chain architecture, dev auth bypass, Neon HTTP no-transactions rule (currently documented only in `CLAUDE.md`). Each gets a short ADR in `docs/adr/` (or wherever the project adopts).
- **DOCUMENT** the `next build --webpack` flag inline in `package.json` (or in the new README) — it's a deliberate Turbopack opt-out for Serwist 9.5 compat, with a migration path forward when Serwist supports Turbopack.

## Capabilities

This change does not modify any capability spec. The work is documentation, OpenSpec workflow hygiene, ADR backfill, route-level redirects, and UI copy refinements — none of which represent contract changes to user-facing capabilities. The capability changes that 1.0 *did* introduce are already captured by the capability specs landed via the merged archive entries (`add-pwa-manifest-and-service-worker`, the design-system primitives changes, `visit-history`, `following`, etc.) and by the in-flight changes this proposal helps archive.

If a Release-entry schema turns out to require a corresponding capability spec (per ADR-0009 if it exists), this proposal will be amended during apply to add a `release-cut-artifacts` capability spec; that decision is gated on Task 1.1 below.

## Impact

**Files touched / added:**

- `app/changelog/releases.ts` (NEW or first entry — schema TBD per ADR-0009 confirmation).
- `.env.example` (NEW).
- `README.md` (REWRITE).
- `CLAUDE.md` (APPENDED: Database migrations section).
- `next.config.ts` OR `middleware.ts` (redirect for old sign-in path).
- `docs/adr/` (NEW directory if absent; ADR files added).
- `package.json` (inline comment / docs reference for `next build --webpack` — optional, can live in README).
- `openspec/changes/extract-visibility-constants/` → moved to `openspec/changes/archive/`.
- `openspec/changes/harden-server-action-authorization/` → tasks closed and moved to `openspec/changes/archive/`.
- Possibly minor UI copy edits on `DeleteItemButton.tsx` / archive affordances based on the UX review in Bucket 3.

**APIs / contracts:**

- The old `/(auth)/page.tsx` route was already deleted in PR #16; this change adds a redirect mapping from that path so bookmarks resolve. No new public route.
- No server-action signature changes.
- No DB schema changes.

**PR metadata:**

- PR #16 must have its milestone set to `1.0.0` before merge — this is a manual GitHub step, not a code change, but it is gating for the release-cut tooling (`/write-changelog`, `/release-check`).

**Not covered by this change (deferred):**

- The frontend a11y findings S1–S3 (image-search Space activation, mobile filter sheet focus trap, ImageSearch focus-restore) — separate change against the affected component specs.
- The end-user "image-search quota error copy" and "choose-items entry-point discoverability" items — separate change, UX polish.
- The DB index follow-ups on `list_visits` and `user_follows` reverse-direction (S5–S6) — separate change once volume warrants it.
- The test-suite scaffolding — separate, much larger change.
- The migration 0005 stale-comment fix (S4) — trivially folded into `harden-remaining-server-actions`'s pre-merge cleanup, OR a one-line cleanup PR; deliberately not in this change.
