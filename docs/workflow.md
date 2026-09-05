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

### Writing the message

**Prefix.** `issue-<N>:` for work carrying an issue — the issue *implemented*, not the branch it sits on, so a branch named for a parent epic still takes the child's number. `<version>:` (`1.1:`, `beta-0.8:`) for trunk and release work behind no issue. Skills, tooling, and docs-only work take no prefix at all (`doc updates`, `skills cleanup`). **Conventional commits are not used here** — no `feat:`, `chore:`, `fix:`.

**Subject.** Present tense, with the code as the subject of the sentence: what is true once this lands, not an instruction to apply it.

> `issue-355: claimed count moves when a claim lands`
> `issue-357: ConnectionsAction names the kind of id it takes`
> `issue-360: claim identity and claim state get their own homes`

Not `Add claimed-count invalidation`, and not `feat(claims): move counter`.

**Body — only what the diff cannot say.** The diff already records what changed. The body is for what reading it would not reveal: behaviour deliberately left unchanged, a gap the work exposed, a departure from the ticket, a consequence landing in a later one. Most commits need none. Re-narrating the change is the failure mode — a line reconstructible from the diff is a line to cut.

`fca094e` is the worked example: line counts crossing a lint threshold, an assertion that behaviour is unchanged, a security gap the extraction exposed, and a forward pointer to the ticket that removes two `v8 ignore`s.

**Trailer.** Agent-authored commits end with their `Co-Authored-By:` line.

Step sequencing is normative in each skill's own `SKILL.md`, not here.
