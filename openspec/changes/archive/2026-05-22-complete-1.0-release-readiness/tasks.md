## Scope note

This task list covers only what this change actually delivers. Release-day admin (setting the PR milestone, opening the PR against `release-1.0`, archiving sibling changes, post-merge cleanup, deployed-URL smoke tests) was pruned — that work lives in the PR/release flow, not in this spec.

## 1. Pre-flight — confirm conventions

- [x] 1.1 ~~Locate `ADR-0009` / `ADR-0007`.~~ **Resolved:** this repo does NOT use ADRs. Architectural decisions live in `openspec/specs/` (active capability specs) and `openspec/changes/` (proposals + archive). The council skills' ADR references are templated from another project. The `Release` schema is defined inline in `app/changelog/releases.ts`; the `TOKEN_VERSION` convention, if/when adopted, will be captured as an OpenSpec change proposal, not an ADR.
- [x] 1.2 No prior `app/changelog/` or `Release` type existed. The schema is now authored inline in `app/changelog/releases.ts` (§3).

## 2. Release artifacts — `.env.example`

- [x] 2.1 Enumerated `process.env.*` references via grep: `AUTH_BYPASS`, `DATABASE_URL`, `IMAGE_SEARCH_PROVIDER`, `IMAGE_SEARCH_PROVIDERS`, `IMAGE_SEARCH_SIMULATE_QUOTA`, `IMAGE_SEARCH_USE_MOCK`, `NODE_ENV`, `SERPAPI_API_KEY`, `SERPER_API_KEY`. Also captured `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET` (NextAuth-managed, not directly `process.env`-grepped).
- [x] 2.2 Authored `.env.example` at repo root with grouped sections (Database, Auth, Image Search) and per-key comments. `AUTH_BYPASS` carries the DEV-ONLY / prod-refused note.
- [x] 2.3 `.env.example` is not gitignored (only `.env*.local` patterns are typically ignored; verified via `.gitignore`).

## 3. Release artifacts — changelog

- [x] 3.1 `Release` schema defined inline in `app/changelog/releases.ts` — `version` (semver), `date` (ISO), `changes[]` with `type` ∈ {feature, polish, bug, security, docs, refactor} and `summary`.
- [x] 3.2 Created `app/changelog/releases.ts` with the 1.0.0 entry at the top of an exported `releases` array.
- [x] 3.3 Authored the 1.0.0 entry covering PWA shell, visit-history/bookmarks/follow-users, items browser, multi-claim purchases, image-search, design-system retokenization, server-endpoint authorization, OpenSpec workflow.

## 4. README rewrite

- [x] 4.1 Replaced `README.md` boilerplate. Sections: project description, prerequisites (Node LTS + Neon), setup (clone, copy `.env.example`, migrate, seed, dev), dev auth bypass subsection, build & deploy (with `--webpack` rationale), workflow links (CLAUDE.md, openspec/), license placeholder.
- [x] 4.2 No `create-next-app` boilerplate remains.

## 5. CLAUDE.md migrations section

- [x] 5.1 Appended "Database migrations" section to `CLAUDE.md` covering authoring workflow (`db:generate` → review SQL → `db:migrate`), driver caveat with backref to the existing "no transactions" section, preserved legacy artifacts (`saved_lists`, `lists.shared`), and prod-migration notes. Cross-linked to `drizzle/0001_black_legion.sql` as the exemplar.

## 6. Sign-in redirect

- [x] 6.1 `app/(main)/HomePage.tsx` calls `redirect('/sign-in')` when the session resolves to no email or no DB user. `/` is served by `app/(main)/page.tsx`, so unauthenticated GET `/` lands at `/sign-in`. No `next.config.ts redirects()` or middleware needed; bookmarks to `/` resolve correctly.

## 7. Archive vs Delete UX

- [x] 7.1 Inspected: Archive lives on `Item.tsx` (kebab + icon button on item rows, `showArchiveAction`). Delete lives only on the item edit form (`DeleteItemButton` inside `ItemForm`). The two affordances never appear in the same UI — Archive and Delete are not adjacent.
- [x] 7.2 Redesigned the Delete confirm dialog around the anchor word **"history"** (archive preserves it, delete erases it). Single uniform body per state, no claim-count branching, no scary enumerations. Three-button layout: full-width "Archive instead" (primary) above the existing Cancel | Delete row, so the destructive button keeps the same affordance the user just clicked (no bait-and-switch).
- [x] 7.3 Confirmation now names the consequence (and irreversibility) in plain language for both states:
  - **Active:** Title "Delete this item?" / Body "Archive instead to keep its history. Deleting can't be undone."
  - **Archived:** Title "Delete this item permanently?" / Body "This erases its history. Can't be undone." (no Archive button)
- [x] 7.4 Smoke-tested both states via Claude Preview under `AUTH_BYPASS=true`. Active state on the Cheese board renders the three-button layout with the correct copy; archived state on an Archived-tab item drops the Archive button and shows the "permanently" framing.

**Files touched:**
- `app/(main)/items/ui/components/DeleteItemButton.tsx` — anchor-word copy, `archived` prop, `archiveItem` action wiring.
- `app/ui/components/ConfirmDialog.tsx` — optional `tertiary` slot (full-width primary above Cancel | Confirm).
- `app/(main)/lists/ui/styles/confirm-dialog.css` — `:has(> :nth-child(3))` grid-column-span so the existing 2-button dialogs are unchanged.
- `app/(main)/items/ui/components/itemform/ItemForm.tsx` / `EditItemButton.tsx` — pass `archived` from `item.archived_at`.
- `lib/dal.ts` — `getItemById` returns `archived_at`.

## 8. Share-lists → follow-users transition

- [x] 8.1 Audited via `drizzle/0001_black_legion.sql`. Pre-1.0 `saved_lists` rows are backfilled into `list_visits` as bookmarks during migration; `saved_lists` and `lists.shared` are deliberately preserved (not dropped) for the soak period. Documented in CLAUDE.md's new "Database migrations" section.
- [x] 8.2 `BookmarkMigrationToast` (rendered in `app/(main)/HomePage.tsx`) is the one-time onboarding surface for returning users explaining the social-model change.
- [x] 8.3 Migration semantics documented in CLAUDE.md ("Preserved legacy artifacts").

## 9. ADR backfill — superseded

- [x] 9.1 **Resolved per §1.1.** This repo does NOT maintain a `docs/adr/` directory. Cross-cutting decisions (PWA build flag, image-search provider chain, dev auth bypass, Neon HTTP no-transactions, release-cut artifacts, OpenSpec workflow) are captured in `CLAUDE.md` and the relevant OpenSpec capability specs and archived change proposals. If a decision warrants a standalone record in the future, it goes through `/opsx:propose` and lands as an OpenSpec change, not an ADR.

## 10. Package-build documentation

- [x] 10.1 README "Build & deploy" section explains `next build --webpack` and the Serwist 9.5 Turbopack-opt-out rationale.

## Health checks

- [x] `npm run lint` — 0 errors, 1 pre-existing `<img>` warning in `Avatar.tsx` unrelated to this change.
- [x] `npx tsc --noEmit` — clean.
- [x] `openspec validate complete-1.0-release-readiness --strict` — "Change is valid".
