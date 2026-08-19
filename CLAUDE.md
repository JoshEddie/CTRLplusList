# Claude notes

## Hard rules at a glance

Non-negotiables; each links to its full text.

- **No interactive DB transactions** — no `db.transaction(...)`, no `SELECT … FOR UPDATE`; `neon-http` runs every query as its own HTTP round-trip. Atomicity via unique / partial-unique indexes + `ON CONFLICT`. ([DATABASE.md](DATABASE.md))
- **No comments by default** — only non-obvious WHY earns one. (§ Comments)
- **File size** — >400 lines of code = merge-blocking lint error; 300–400 = only tolerated lint warning; never `eslint-disable` either rule. (§ File size)
- **Tests assert observable behavior** — no execute-for-coverage, no tautologies; names lint-enforced `<StateUnderTest>_<ExpectedBehavior>`. ([TESTING.md](TESTING.md))
- **Every `/* v8 ignore */` carries inline `--` rationale** naming unreachable branch; never valid on redundant guard. ([TESTING.md](TESTING.md))
- **Five gates, checked separately**: `npm run lint` (pure `eslint .` — zero errors, zero non-size warnings) · `npx tsc --noEmit` · `npm run build` · `npm run test:coverage` · `npm run test:e2e`. Trunk landings: lint + typecheck locally pre-push; CI on `dev` push runs full battery. Non-executable changes (markdown/skills/specs, comment-only edits) may omit the two test gates — no checklist item, the omission + rationale named in the section's lead-in; any executable change voids it. CI still runs everything. (§ Trunk workflow)
- **Skills never `git commit`** — stage, report, stop for owner's signature; never retry blocked signature. One change in apply stage at a time on `dev`. (§ Trunk workflow)
- **Specs are the contract** — `openspec/specs/<capability>/spec.md` normative; archived changes are history. Every interactive surface routes through a primitive-family spec; no page-scoped one-off UI classes.
- **Restart dev server after seeding/reseeding** — `'use cache'` DAL results stay stale otherwise. (§ Local dev)

## Read this before touching that

| Touching… | Read first |
| --- | --- |
| Any test | [TESTING.md](TESTING.md) — substance rules, forbidden patterns, fixtures, naming |
| DB queries, DAL, schema, migrations | [DATABASE.md](DATABASE.md) — driver limits, migration workflow |
| OpenSpec changes or specs | [openspec/config.yaml](openspec/config.yaml) + capability spec in `openspec/specs/` (see § Trunk workflow) |
| Anything an architectural decision may already bind | [openspec/adr/INDEX.md](openspec/adr/INDEX.md) — trigger-keyed ADR index; open the entry it names before acting |
| UI primitives / any interactive surface | Owning primitive-family spec (`button-system`, `menu-system`, …) in `openspec/specs/` |
| Seeded UI states, local-mode internals, product-fetch mock | [LOCALDEV.md](LOCALDEV.md) — only when needed |

## Trunk workflow

Normative: each skill's SKILL.md — for the departure arc (`/embark-design`, `/embark-qualify`, `/landfall`) it is the whole contract, not just mechanics; `map-workflow` + `trunk-workflow` specs hold what remains. Labels: [.claude/skills/map/reference/label-machine.md](.claude/skills/map/reference/label-machine.md).

- Route everything through the fleet: `/map` (all work definition) → `/embark-start` → `/embark-design` → `/embark-qualify` → `/embark-write-tasks` → `/embark-apply` → `/spec-review` → `/landfall`, `/anchor` for map bearing moves, `/run-aground` for mid-voyage mirages, `/port-inspection`/`/close-map` for closure, `/release-review` for release cut. Never improvise a step the fleet owns (issues, ALL-CAPS labels, closing, releasing) by hand.
- Work on `dev`; review before any commit exists; one change in apply at a time (also in hard rules).
- Never hand-edit generated `openspec-*`/`opsx/*` files under `.claude/` — `openspec update` clobbers. Repo-owned (safe): `grill-me`, `finalize-spec-purposes`, fleet skills.
- `openspec/schemas/spec-driven-review/` is a **repo-owned fork** of the package `@fission-ai/openspec` `spec-driven` schema (full copy — `resolveSchema` reads one file whole, no merge) plus three local artifacts: `review` (scaffolds `review.md` at propose time), `acceptance` (drafts `acceptance.md` user-journey flows), and `adr` (records each architectural decision as an entry for the library at `openspec/adr/`). It is **renamed** (not same-named shadowing) so the package `spec-driven` default stays reachable and there is no silent override; changes select it by name via `config.yaml`'s `schema:` default and each change's `.openspec.yaml`. It survives `openspec update` (which only clobbers the package dir). **On `openspec update`, reconcile the fork against the updated package `spec-driven` schema** — copy-forward or diff-and-merge the proposal/specs/design/tasks artifacts + templates, preserving the `review`, `acceptance` and `adr` additions — including `adr`'s declaration position between `proposal` and `specs`, which is load-bearing and fails silently if appended at the end (reason stated at the declaration) — so it does not silently drift. `openspec validate --strict` in the pre-merge gate catches a structurally broken fork.

## Writing code

### Comments

- None by default. Add only when WHY non-obvious — hidden constraint, subtle invariant, workaround for specific bug, surprising behavior.
- If removing comment wouldn't confuse future reader, don't write it.
- Never explain WHAT — identifiers do that.
- Never reference current task/fix/callers ("used by X", "added for Y flow", "handles issue #123") — belongs in PR description, rots.

### File size (red / yellow / green)

- Scope: production source (`app/**`, `lib/**`, `hooks/**`, `db/**`); test files + `**/__tests__/**` exempt; `scripts/**`, `e2e/**` outside scoped set. Counted in lines of **code** (comments + blanks free).
- **Red** >400 = error — split by table-cohesion/domain before merge.
- **Yellow** 300–400 = warning — pull easy wins where clean extraction exists; cohesive file may stay yellow. Only tolerated lint warnings.
- **Green** <300 = goal, never via scattering one concern across files.
- No `eslint-disable` for either rule.
- Canonical: rules in [eslint.config.mjs](eslint.config.mjs), normative text in `openspec/specs/testing-foundation`.

### Abstraction (DRY · KISS · coupling)

#### Duplication (DRY)

**Decision rule** — extract when ANY of: 3+ copies · unit has structure (branching, typed factory, multi-field literal) · copy could drift silently (still compiles/passes while meaning diverges). Stay inline only when ALL of: ≤2 copies · 1–2 lines · no structure · divergence fails loudly.

- Identical-by-design logic → one home on sight; don't ask.
- Keep copies apart only when nameable as different concepts changing for different reasons; looks-alike ≠ duplication.
- Trivial exception: shared line or two, no structure, may stay inline. *Trivial* is the bar, not copy count. Three forces: **weight** (line or two stays; typed factory / multi-field literal / branching extracts), **drift hazard** (extract when copy can fall behind **silently**; inline fine when divergence fails loudly or doesn't matter), **count** (3+ extracts even when trivial — count only escalates, never overrides weight or drift). Two copies = judgment call; heavy or drift-prone earns one home even at two.

#### Over-generality (KISS)

- No generality for cases that don't exist — parameters/flags/branches with no current caller = dead code, unless planned for imminent use.
- Don't tear down clean, working, tested abstraction for being more general than needed; stripping covered code = risk, no live defect.

#### Redundant guards

- Don't re-test condition your own earlier control flow decided. Guard (`if (cond) redirect()/return/throw`) whose condition already excluded upstream in same function = dead code — remove, let narrowing flow from existing control flow (merge/move upstream guard, early-return). Never paper over with `/* v8 ignore */`.
- NOT a defensive guard, whose condition turns on invariant established outside function (framework lifecycle, platform, third-party/DB contract) compiler can't prove — legitimate. Tell: rationale citing function's own earlier code ("guard above already redirects…") = redundant kind.

#### Fragile coupling

- Shared abstraction's callers diverge → split back into separate concepts; no flags/params/branches so one thing serves all.
- Coupling between callers that are genuinely one concept changing together = abstraction working.

#### Extraction for leanness

- Extract single-caller helpers for lean files — readability extraction is norm, needs no justification.

#### Where extracted helpers live

- Small/generic/pure helpers → **co-located `utils.ts`** for that directory (create if absent), not own single-purpose file. `capRail` in `app/(main)/lists/ui/components/rails/utils.ts`, following `app/(main)/users/ui/utils.ts` (`initialsOf`).
- Descriptively-named standalone module reserved for genuine domain/capability concept (`lib/data/user.ts`, `lib/visibility.ts`, `lib/listAccess.ts`). `utils.ts` = small stuff, not domain-logic dump.

#### Worked example: `Button` / `LinkButton`

Trio in `app/ui/components/button/`:

- **DRY** — only genuine shared thing, visual styling, lives in `buttonClasses()`.
- **Fragile coupling** — separate components, not one polymorphic thing behind `as`/`href` flag: `Button` = `<button>` (`ButtonHTMLAttributes` + `type`), `LinkButton` = Next `<Link>` (`AnchorHTMLAttributes` + `LinkProps`).
- **KISS** — each carries only its concept's props: `Button` has `isLoading`/`disabled`, `LinkButton` doesn't — link can't load or be disabled; adding "for symmetry" = generality for nonexistent caller.

### Components, pages, styling

- **Thin `page.tsx`** — route files = shells forwarding props to co-located `<RouteName>Page.tsx` (`HistoryPage.tsx` next to `page.tsx`). Page component awaits `params`/`searchParams`, owns auth, data fetching, business logic; route file maps URL → component. Touching page with inline logic → split it; no unprompted bulk-refactor.
- **Extract subcomponents** — JSX block with own identity (row, card, "list + empty state") or past ~5 lines → named subcomponent; no inline nested JSX in parent. `length === 0 ? <empty> : <ul>{map(...)}</ul>` = own component (`BookmarksList`); per-item rendering own (`BookmarkRow`); parent reads like outline. Co-locate next to page, or feature's `ui/components/` if reused. Trivial two-line conditional needs no name.
- **Reuse existing CSS variables** — applying design mockup: defer to token set + naming in `app/ui/styles/global.css` (`--primary-color`, `--neutral-text-color`, `--secondary-background-color`, …). Map `mockup value → existing var` first; new token only when no existing token's role covers value, named same `--<role>-color` style — never parallel shorthand system (`--p`, `--ink`).

### Writing markdown (docs, skills, specs)

- Titled concept with own sub-points → real `###`/`####` subheading + bullet list — not list item with bolded inline title. Avoid `- **Standard review** — a, b, c.`; prefer `### Standard review` heading over `- a` / `- b` / `- c`. Same for numbered-list-with-bold.
- Genuinely flat enumerations (ranked signals, condition→action branches, glossary legends) stay plain bullets.

## Local dev (via `USE_PG_DRIVER`)

- **Local mode:** `npm run dev:local` — Docker Postgres + synthesized sessions (no real OAuth); every protected page renders as `dev-test-viewer`. Single flag `USE_PG_DRIVER=1` drives both DB driver + auth bypass.
- **Real auth:** plain `npm run dev` — Neon + real Google sign-in, as production/Vercel.
- **Reset after drift:** `npm run db:reset:dev` — cascade wipe + reseed.
- **After seeding/resetting, restart dev server** — `'use cache'` DAL results stale until restart (seed script can't bump `revalidateTag`).
- **Hard guardrail:** boot guard in [db/index.ts](db/index.ts) refuses `USE_PG_DRIVER=1` with non-localhost `DATABASE_URL` — loud outage, never silent bypass.
- **Product-fetch mock:** local mode only — paste `https://mock.test/<scenario>` into add-item flow for deterministic Zyte fixture, zero quota.
- **Everything else** (session identity via `BYPASS_SESSION_USER`, env layout, seeded coverage, file map, mock scenarios): [LOCALDEV.md](LOCALDEV.md).
