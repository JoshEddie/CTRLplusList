# ADR index

One architectural decision per file: `openspec/adr/NNNN-kebab-title.md`, the ordinal zero-padded to four digits so the ID reads the same in prose (`ADR-0007`) and on disk.

A file whose whole body is one `**Superseded** — see ADR-NNNN: <title>` or `**Removed**` line is a **redirect**, not a decision. The rule it held no longer binds; the file survives so that an ADR number cited in a commit, a comment, a skill, or another ADR resolves to an answer rather than nothing. ADR numbers are never reused.

## Index

Keyed on the trigger, not the title — an agent has to know which ADR to open **before** acting. The column header matches [CLAUDE.md](../../CLAUDE.md)'s *Read this before touching that* table, so an agent that hits the ADR row there lands in a table with the same left column. The two share the header, not the vocabulary: CLAUDE.md's cells are free prose, and only this index draws from the bank below.

Rows are **derived, not authored**: each row is one ADR's own **Touching** line plus its number and title. Nothing is written at index level, so the index cannot drift from the library. A redirect carries no **Touching** line and therefore no row — the index lists live decisions only.

| Touching… | Read |
| --- | --- |

## Term bank

The index's vocabulary. Every **Touching** cell above is one or more of these terms, so this table is what a term in that column means.

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
