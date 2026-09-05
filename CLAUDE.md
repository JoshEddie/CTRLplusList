# Claude notes

CTRLplusList — a family gift-list app (Next.js App Router, NextAuth/Google, Neon Postgres + Drizzle, Serwist PWA).

## Read this before touching that

| Touching… | Read first |
| --- | --- |
| DB queries, DAL, schema, migrations | [docs/database.md](docs/database.md) |
| Any test | [docs/testing.md](docs/testing.md) |
| Writing or running an e2e spec | [e2e/README.md](e2e/README.md) — the filename picks the Playwright project |
| Deciding whether to extract, share, or split something | [docs/abstraction.md](docs/abstraction.md) |
| Pages, components, CSS tokens | [docs/ui-conventions.md](docs/ui-conventions.md) |
| Comments, file size, markdown | [docs/code-style.md](docs/code-style.md) |
| Landing, gates, commits | [docs/workflow.md](docs/workflow.md) |
| Seeded UI states, local-mode internals, product-fetch mock | [docs/local-dev.md](docs/local-dev.md) |
| Any domain term (profile, account, claim, spoiler, tier) | [CONTEXT.md](CONTEXT.md) |
| Why something is built the way it is | [docs/adr/](docs/adr/) |

## Working with the owner

- A short or fragmentary message is a thought, not a spec. Work out what it's
  driving at before responding to how it was worded.
- Consecutive messages are one line of thought, not a queue of orders. Each may
  build on, correct, or contradict the last. Default to conversation; wait to be
  told to build.
- Check the idea against the code before judging it. Disagreement that skipped
  verification is noise.
- Most ideas are partly right. Take the part that works and carry it forward —
  reply with where it leads, not a ruling on it. "That breaks on X, but the Y in
  it points at Z" is the reply; "that won't work, because…" is not.
- An issue filed on your own initiative is `needs-triage` — the label records
  whether I have evaluated it, not how well you wrote it. A skill publishing
  work I already approved sets its own label.
- A standing instruction stays in force. If asked to keep something current,
  update it every turn it changes — not when convenient, and not only when
  reminded.

## Hard rules

Non-negotiable regardless of what you are touching.

- **No interactive DB transactions** — no `db.transaction(...)`, no `SELECT … FOR UPDATE`; `neon-http` runs every query as its own HTTP round-trip. Atomicity comes from unique / partial-unique indexes + `ON CONFLICT`. ([docs/database.md](docs/database.md))
- **Never `revalidateTag` / `revalidatePath`** — invalidate only through `updateTags()` from [lib/cacheTags.ts](lib/cacheTags.ts), naming the narrow tag for every key touched. The coarse table tags are a bulk escape hatch no ordinary write fires. ([docs/adr/0004-narrow-tag-invalidation-contract.md](docs/adr/0004-narrow-tag-invalidation-contract.md))
- **No comments by default** — only a non-obvious WHY earns one. ([docs/code-style.md](docs/code-style.md))
- **File size** — >400 lines of code is a merge-blocking lint error; 300–400 warns. Never `eslint-disable` either rule. ([docs/code-style.md](docs/code-style.md))
- **Extract duplication at the second copy** — no count threshold above two. ([docs/abstraction.md](docs/abstraction.md))
- **Tests assert observable behavior** — no execute-for-coverage, no tautologies; names are lint-enforced `<StateUnderTest>_<ExpectedBehavior>`. ([docs/testing.md](docs/testing.md))
- **Every `/* v8 ignore */` carries an inline `--` rationale** naming the unreachable branch; never valid over a redundant guard. ([docs/testing.md](docs/testing.md))
- **Five gates, checked separately** — lint · type-check · build · unit coverage · e2e. ([docs/workflow.md](docs/workflow.md))
- **Docs describe what is true now** — `CONTEXT.md` and `docs/adr/` record current meaning, not a binding contract. A change that makes one of them false updates it in the same diff; silent drift is the failure, not the change. ([docs/agents/domain.md](docs/agents/domain.md))
- **Never `git commit`** — stage, report, stop for the owner's signature. ([docs/workflow.md](docs/workflow.md))

## Commands

Standard npm scripts, with three that are not what you'd guess:

- `npm run build` → `next build --webpack`. The Turbopack opt-out is required by `@serwist/next` 9.5; drop `--webpack` when Serwist supports Turbopack.
- `npm run dev:local` → Docker Postgres + synthesized sessions (no real OAuth), via the single flag `USE_PG_DRIVER=1`. Plain `npm run dev` uses Neon + real Google sign-in.
- `npm run db:reset:dev` → cascade wipe + reseed. **Restart the dev server after any seed or reset** — `'use cache'` DAL results stay stale until you do (the seed script runs outside the Next.js process and can't bump `revalidateTag`).

## Agent skills

### Issue tracker

GitHub Issues on [JoshEddie/CTRLplusList](https://github.com/JoshEddie/CTRLplusList) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), created on the repo. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root (created lazily by `/domain-modeling`, not yet present). See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
