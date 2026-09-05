# Workflow

## The five gates

Checked separately, never bundled into one command:

```bash
npm run lint && npm run type-check && npm run build && npm run test:coverage && npm run test:e2e
```

- `npm run lint` is pure `eslint .` — zero errors. Only the two warning classes in [code-style.md](code-style.md) are tolerated.
- `npm run type-check` is `tsc` (`noEmit` is already set in [tsconfig.json](../tsconfig.json)).
- `npm run build` is deliberately **type-blind** — `next.config.ts` sets `typescript.ignoreBuildErrors`, so the build does not re-run the type-check gate's work. A type error fails gate 2, never gate 3.

**Trunk landings:** lint + typecheck locally pre-push; CI on a `dev` push runs the full battery.

**Non-executable changes** (markdown, comment-only edits) may omit the two test gates. There is no checklist item for the omission — name it, with its rationale, in the lead-in of the section reporting the gates. Any executable change voids the exemption. CI still runs everything.

## Committing

- **Never `git commit`.** Stage the work, report what's ready, and stop for the owner's signature. Never retry a blocked signature.
- Work on `dev`. One change in the apply stage at a time.

Step sequencing is normative in each skill's own `SKILL.md`, not here.
