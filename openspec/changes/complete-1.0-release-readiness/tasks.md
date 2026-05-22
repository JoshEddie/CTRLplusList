## 1. Pre-flight — confirm conventions

- [x] 1.1 ~~Locate `ADR-0009` / `ADR-0007`.~~ **Resolved:** this repo does NOT use ADRs. Architectural decisions live in `openspec/specs/` (active capability specs) and `openspec/changes/` (proposals + archive). The council skills' ADR references are templated from another project. The `Release` schema is defined inline in `app/changelog/releases.ts`; the `TOKEN_VERSION` convention, if/when it's adopted, will be captured as an OpenSpec change proposal, not an ADR.
- [x] 1.2 No prior `app/changelog/` or `Release` type existed. The schema is now authored inline in `app/changelog/releases.ts` (§3).

## 2. Release artifacts — `.env.example`

- [x] 2.1 Enumerated `process.env.*` references via grep: `AUTH_BYPASS`, `DATABASE_URL`, `IMAGE_SEARCH_PROVIDER`, `IMAGE_SEARCH_PROVIDERS`, `IMAGE_SEARCH_SIMULATE_QUOTA`, `IMAGE_SEARCH_USE_MOCK`, `NODE_ENV`, `SERPAPI_API_KEY`, `SERPER_API_KEY`. Also captured `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET` (NextAuth-managed, not directly `process.env`-grepped).
- [x] 2.2 Authored `.env.example` at repo root with grouped sections (Database, Auth, Image Search) and per-key comments. `AUTH_BYPASS` carries the DEV-ONLY / prod-refused note.
- [x] 2.3 `.env.example` is not gitignored (only `.env*.local` patterns are typically ignored; verified via `.gitignore`).

## 3. Release artifacts — changelog

- [x] 3.1 `Release` schema defined inline in `app/changelog/releases.ts` — `version` (semver), `date` (ISO), `changes[]` with `type` ∈ {feature, polish, bug, security, docs, refactor} and `summary`.
- [x] 3.2 Created `app/changelog/releases.ts` with the 1.0.0 entry at the top of an exported `releases` array.
- [x] 3.3 Authored the 1.0.0 entry covering PWA shell, visit-history/bookmarks/follow-users, items browser, multi-claim purchases, image-search, design-system retokenization, server-endpoint authorization, OpenSpec workflow.

## 4. PR metadata

- [ ] 4.1 **MANUAL:** Set the GitHub milestone on PR #16 to `1.0.0`. Outside the file diff. Run `gh api repos/:owner/:repo/milestones` or use the web UI.
- [ ] 4.2 **MANUAL:** Confirm `gh pr view 16 --json milestone` returns the populated milestone.

## 5. README rewrite

- [x] 5.1 Replaced `README.md` boilerplate. Sections: project description, prerequisites (Node LTS + Neon), setup (clone, copy `.env.example`, migrate, seed, dev), dev auth bypass subsection, build & deploy (with `--webpack` rationale), workflow links (CLAUDE.md, openspec/), license placeholder.
- [x] 5.2 No `create-next-app` boilerplate remains.

## 6. CLAUDE.md migrations section

- [x] 6.1 Appended "Database migrations" section to `CLAUDE.md` covering authoring workflow (`db:generate` → review SQL → `db:migrate`), driver caveat with backref to the existing "no transactions" section, preserved legacy artifacts (`saved_lists`, `lists.shared`), and prod-migration notes. Cross-linked to `drizzle/0001_black_legion.sql` as the exemplar.

## 7. Sign-in redirect

- [x] 7.1 / 7.2 **Already implemented.** `app/(main)/HomePage.tsx` calls `redirect('/sign-in')` when the session resolves to no email or no DB user. `/` is served by `app/(main)/page.tsx`, so unauthenticated GET `/` lands at `/sign-in`. No `next.config.ts redirects()` or middleware needed; bookmarks to `/` resolve correctly.
- [ ] 7.3 **MANUAL:** verify in an incognito browser against the deployed URL.

## 8. Archive vs Delete UX

- [ ] 8.1 Inspect current Delete + archive affordances.
- [ ] 8.2 Apply Option A or B from the proposal.
- [ ] 8.3 Confirmation dialog on Delete states the consequence explicitly.
- [ ] 8.4 **MANUAL:** smoke-test both flows via preview tooling under the dev bypass.

## 9. Share-lists → follow-users transition

- [x] 9.1 Audited via `drizzle/0001_black_legion.sql`. Pre-1.0 `saved_lists` rows are backfilled into `list_visits` as bookmarks during migration; `saved_lists` and `lists.shared` are deliberately preserved (not dropped) for the soak period. Documented in CLAUDE.md's new "Database migrations" section.
- [x] 9.2 **Already implemented.** `BookmarkMigrationToast` (rendered in `app/(main)/HomePage.tsx`) is the one-time onboarding surface for returning users explaining the social-model change.
- [x] 9.3 Migration semantics documented in CLAUDE.md ("Preserved legacy artifacts").

## 10. OpenSpec archive — `extract-visibility-constants`

- [ ] 10.1 Verify all tasks `[x]`.
- [ ] 10.2 Run `/opsx:archive extract-visibility-constants`.
- [ ] 10.3 Verify `openspec/specs/list-visibility/spec.md` reflects MODIFIED requirements.

## 11. OpenSpec resolve-and-archive — `harden-server-action-authorization`

- [ ] 11.1 **MANUAL / PROD-DB:** Run §1.1 prod-data check (duplicate `(item_id, user_id)` rows).
- [ ] 11.2 **MANUAL / PREVIEW:** Verify image-search simulate-quota toggle vs rate-limit shape.
- [ ] 11.3 **MANUAL / PREVIEW:** Walk through tasks 7.1–7.8.
- [ ] 11.4 Confirm via `git log --grep harden-server-action-authorization` that the implementation landed piecemeal.
- [ ] 11.5 Run `/opsx:archive harden-server-action-authorization`. Blocked on 11.1–11.3.

## 12. ~~ADR backfill~~ — superseded

- [x] 12.1–12.8 **Resolved per §1.1.** This repo does NOT maintain a `docs/adr/` directory. Cross-cutting decisions (PWA build flag, image-search provider chain, dev auth bypass, Neon HTTP no-transactions, release-cut artifacts, OpenSpec workflow) are captured in `CLAUDE.md` and the relevant OpenSpec capability specs and archived change proposals. If a decision warrants a standalone record in the future, it goes through `/opsx:propose` and lands as an OpenSpec change, not an ADR.

## 13. Package-build documentation

- [x] 13.1 README "Build & deploy" section explains `next build --webpack` and the Serwist 9.5 Turbopack-opt-out rationale.
- [x] 13.2 Skipped — `package.json` `_comment` field would clutter the manifest; the README is the single source.

## 14. Pre-merge

- [ ] 14.1 `npm run lint` and `npx tsc --noEmit` clean.
- [ ] 14.2 `openspec validate complete-1.0-release-readiness --strict` — note: the CLI rejects the change name because of the dot in "1.0". File a follow-up to either rename the change or relax the validator regex; for now, skip strict validation on this change.
- [ ] 14.3 **MANUAL:** `gh pr view 16 --json milestone` returns 1.0.0.
- [ ] 14.4 `app/changelog/releases.ts` import path doesn't break the build (no consumers yet — file is currently dead code; first consumer will be a future changelog page).
- [ ] 14.5 Both `extract-visibility-constants` and `harden-server-action-authorization` in `openspec/changes/archive/`. Blocked on §10, §11.
- [ ] 14.6 **MANUAL:** Open the PR against `release-1.0`.
- [ ] 14.7 **MANUAL (POST-MERGE):** `/opsx:archive complete-1.0-release-readiness`.
