# Code style

## Comments

- None by default. Add only when the WHY is non-obvious — hidden constraint, subtle invariant, workaround for a specific bug, surprising behavior.
- Never reference the current task/fix/callers ("used by X", "added for Y flow", "handles issue #123") — that belongs in the PR description, and it rots.

## File size (red / yellow / green)

Scope: production source (`app/**`, `lib/**`, `hooks/**`, `db/**`). Test files and `**/__tests__/**` are exempt; `scripts/**` and `e2e/**` are outside the scoped set. Counted in lines of **code** — comments and blanks are free.

- **Red** >400 = error — split by table-cohesion/domain before merge.
- **Yellow** 300–400 = warning — pull easy wins where a clean extraction exists; a cohesive file may stay yellow.
- **Green** <300 = the goal, never reached by scattering one concern across files.
- No `eslint-disable` for either rule.
- Two flat cohorts are exempt in the config's `ignores`: `db/schema.ts` (table declarations) and `lib/i18n/en.ts` (message strings). Neither has a domain seam to split on.

Canonical: [eslint.config.mjs](../eslint.config.mjs).

## Tolerated lint warnings

`npm run lint` must be free of errors. Exactly two classes of warning are
tolerated; anything else is a failure.

1. **File-size yellow band** (300–400 lines) — see above.
2. **Issue-linked exemption TODOs** — a rule adopted after the code was written
   is disabled per file, with a `TODO` naming the burn-down issue directly above
   the disable. `no-warning-comments` surfaces each one as a warning, so the
   remaining work is the lint output rather than a list someone maintains.

```ts
// TODO(#343): extract duplicated copy, then drop this disable
/* eslint-disable sonarjs/no-duplicate-string */
```

Deleting the disable and the TODO together is what closes one. Never add a
disable without the TODO — a silent disable is invisible and never gets removed.

## User-facing copy

Every string a person reads is declared once in `lib/i18n/en.ts` and reached
through `getMessage` ([ADR-0017](adr/0017-user-facing-copy-has-one-home.md)).
Keys are flat and alphabetical, and nothing but `lib/i18n/utils.ts` imports the
catalogue.

- **Apostrophes are `’` (U+2019)** — `'` is ICU's quoting character.
- **A string that displays a count declares its own plural**, with `#` for the
  number. A string that varies with a count but never shows one stays two keys
  the caller picks between.
- **A key name carries the axis it varies on**: `_owner` / `_viewer` for who is
  reading, `_own` for whose thing it is.

## Writing markdown (docs, skills, specs)

- A titled concept with its own sub-points gets a real `###`/`####` subheading plus a bullet list — not a list item with a bolded inline title. Avoid `- **Standard review** — a, b, c.`; prefer a `### Standard review` heading over `- a` / `- b` / `- c`. Same for numbered-list-with-bold.
- Genuinely flat enumerations (ranked signals, condition→action branches, glossary legends) stay plain bullets.
