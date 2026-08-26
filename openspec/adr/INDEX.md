# ADR index

Live architectural decisions. Match the task to a **Touching** cell - a term
from the bank below, or a file about to be edited - open the entry its row
names, and act on it before writing. No matching row means no decision binds.

## Index

| Touching… | Read |
| --- | --- |
| `DATABASE.md` | [2026-08-18-atomic-writes-in-one-cte](2026-08-18-atomic-writes-in-one-cte.md) |
| `DB Schema` | [2026-08-19-profile-attributes-column-or-preference](2026-08-19-profile-attributes-column-or-preference.md) |
| `DB Schema` | [2026-08-25-active-selection-in-a-cookie-recency-on-the-membership](2026-08-25-active-selection-in-a-cookie-recency-on-the-membership.md) |
| `DAL` | [2026-08-19-profile-attributes-column-or-preference](2026-08-19-profile-attributes-column-or-preference.md) |
| `DAL` | [2026-08-25-the-active-profile-is-the-authorization-context](2026-08-25-the-active-profile-is-the-authorization-context.md) |
| `DAL` | [2026-08-25-actor-resolution-names-both-profiles](2026-08-25-actor-resolution-names-both-profiles.md) |
| `DAL` | [2026-08-25-a-block-belongs-to-the-human](2026-08-25-a-block-belongs-to-the-human.md) |
| `DAL` | [2026-08-25-active-selection-in-a-cookie-recency-on-the-membership](2026-08-25-active-selection-in-a-cookie-recency-on-the-membership.md) |
| `DB Queries` | [2026-08-25-the-active-profile-is-the-authorization-context](2026-08-25-the-active-profile-is-the-authorization-context.md) |
| `DB Queries` | [2026-08-25-a-block-belongs-to-the-human](2026-08-25-a-block-belongs-to-the-human.md) |
| `E2E Test` | [2026-08-25-no-environment-override-for-the-acting-profile](2026-08-25-no-environment-override-for-the-acting-profile.md) |
| `Local Dev` | [2026-08-25-no-environment-override-for-the-acting-profile](2026-08-25-no-environment-override-for-the-acting-profile.md) |

## Term bank

| Term | Covers |
| --- | --- |
| `Unit Test` | `**/__tests__/**` |
| `E2E Test` | `e2e/` |
| `Running Tests` | executing a suite, reading its output |
| `DB Schema` | `db/schema.ts` |
| `Migrations` | `drizzle/` |
| `DAL` | `lib/data/` |
| `DB Queries` | writing a query in any caller |
| `Seeding / Reset` | `scripts/seed-dev-users.ts`, `db:reset:dev` |
| `Local Dev` | local mode via `USE_PG_DRIVER`, dev-server state |
| `Skills & Agents` | `.claude/skills/`, `.claude/agents/` |
| `Docs` | repo markdown |
| `Reading a GitHub Issue` | picking up work from an issue |
