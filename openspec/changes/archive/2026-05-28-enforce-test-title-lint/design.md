## Context

`testing-foundation` already specifies the Vitest title-shape convention as normative SHALLs, and TESTING.md documents it. Enforcement, however, is manual review, and the drift evidence in the proposal shows that even the sub-proposal meant to model the pattern (#68 `test-following`) shipped violations.

The toolchain is already in place: `eslint-plugin-vitest` is installed and wired into a `{ files: ['**/*.test.{ts,tsx}'], plugins: { vitest } }` block in `eslint.config.mjs` that runs `vitest/expect-expect`, `vitest/valid-expect`, `vitest/no-standalone-expect` at `error`. The pre-merge `lint` gate already blocks merge on any error. So the rule surface is small — add one rule to an existing block — but the design question is **which slice of the convention a regex can faithfully enforce**, because the convention is richer than a single pattern.

I verified the installed `vitest/valid-title` (v0.5.4) behavior directly against its compiled source:

- It supports per-node `mustMatch` / `mustNotMatch` keyed by `it` / `test` / `describe`, each `[pattern, message]`. **The pattern must be a string** (a regex *source*), not a `RegExp` literal — a `RegExp` fails the rule's JSON-schema validation at config load.
- **Template literals containing expressions are skipped** — not checked, not errored. The button-matrix titles (`` it(`Variant${cap(variant)}DefaultSize_...`) ``) therefore produce no false positives.
- **Plain string literals are checked, including `it.each` titles.** `it.each(TEXT_TYPES)('TypeSetTo_%s', …)` resolves to the static string `TypeSetTo_%s`, so the `it`/`test` pattern MUST tolerate printf placeholders or it will reject a valid parameterized test.

### What the audit surfaced

Running the candidate rule against the real suite returned 124 failures, which split as:

```
 underscores │ count │ what it is
─────────────┼───────┼──────────────────────────────────────────
     0       │   12  │ fused single tokens (issue #69) + archive/helper prose
     1       │  591  │ canonical <State>_<Behavior>
     2       │   87  │ } compound state and/or behavior, joined by
     3       │   14  │ } undifferentiated underscores — conflates two
     4+      │    6  │ } distinct smells (see Decisions)
```

The 107 multi-underscore titles are not a single problem. Some are **compound state** that should be hoisted into nested `describe` blocks (e.g. `NonPurchase_WithSetter_*` repeated across a cluster); some are **compound behavior** that is either a legitimate atomic/ordered effect set or a conflation of tests that should be split. A regex cannot tell these apart, because it cannot judge a token's **role**.

## Goals / Non-Goals

**Goals:**

- Make the mechanically-checkable part of the title convention fail the `lint` gate, so drift is caught at author time across the ~277 queued test tasks rather than at review.
- **Sharpen** the convention so the single underscore is the sacred state│behavior seam: a single-token state, and dash-joined behaviors for legitimate compounds.
- Land the rule green by auditing the existing suite to the sharpened convention in the same change.
- Reuse the already-installed plugin and the existing test-file eslint block — no new dependency.

**Non-Goals:**

- Enforcing token **role** mechanically. `<State>_<State>` and `<Behavior>_<Behavior>` are indistinguishable from `<State>_<Behavior>` to any regex — token role is semantic and undecidable by pattern. This stays the manual + AI-authoring + review bar (see D7).
- Enforcing the **precision principle** or **atomicity** (whether `Returns`/`Renders` is specific enough; whether a compound behavior is genuinely one atomic effect). A regex cannot judge these.
- Enforcing the **describe role distinction** (module vs function vs scenario-family). A static pattern cannot infer a describe's role without rejecting legitimate camelCase function/module describes.
- Playwright `<Page>_<Action>_<Outcome>` enforcement (separate runner, no `eslint-plugin-playwright`).
- Writing a bespoke role-aware ESLint rule — faithfully inferring role needs an NLP-grade heuristic with its own test suite, disproportionate to the gap.

## Decisions

### D1 — Enforce with `vitest/valid-title`, not a custom rule

Use the installed plugin's `mustMatch` (for `it`/`test`) and `mustNotMatch` (for `describe`). Zero new dependencies, lands in the existing block, and catches 100% of the *mechanically-checkable* violations. A custom rule would be the only way to enforce role/precision, but those are explicitly out of scope (Non-Goals) and would themselves require substantive tests per TESTING.md.

### D2 — The sharpened shape: `<State>_<Behavior>(-<Behavior>)*`

The convention is sharpened to make the **single underscore the one sacred state│behavior boundary**:

- **Exactly one underscore.** It separates state from behavior. No second underscore.
- **State is a single PascalCase token.** Compound state is *not expressible* in the `it()` name — it is hoisted into nested `describe` blocks (D5), even when the compound is used only once.
- **Behavior is one PascalCase token, or several dash-joined PascalCase facets** for legitimate compounds (ordered effects, or facets of one atomic contract).
- **printf placeholders** (`%s`, `%d`, `%#`) are admitted so `it.each` titles conform.

`it`/`test` `mustMatch` regex (as a string source):

```js
'^[A-Z][A-Za-z0-9%#]*_[A-Z%][A-Za-z0-9%#]*(-[A-Z][A-Za-z0-9%#]*)*$'
```

- `^[A-Z][A-Za-z0-9%#]*` — single state token, PascalCase.
- `_` — the one boundary.
- `[A-Z%][A-Za-z0-9%#]*` — first behavior facet (may lead with `%` for `it.each`).
- `(-[A-Z][A-Za-z0-9%#]*)*` — zero or more dash-joined behavior facets.

Rejects: zero-underscore fused tokens (`OnChangeForwarded`); two-underscore compound state (`NonPurchase_WithSetter_X` — forces a describe); prose (whitespace); lowercase-leading tokens.

Rationale for "structural, not semantic": the regex's job is the *shape* (one boundary, single-token state, dash-joined behavior, no prose). The *precision* of each token and the *role* it plays are separate human bars (D7).

### D3 — `describe` pattern: forbid whitespace and punctuation

```js
mustNotMatch: { describe: ['[^\\w$]', '<message: identifier/tag form, no spaces or punctuation; see TESTING.md>'] }
```

`[^\w$]` flags any character outside `[A-Za-z0-9_$]`. Catches every prose describe (`'legacy DB strings'`, `'variant × size matrix'`, `'utils > formatCurrency'`) while passing legitimate module (`buttonClasses`), function (`fromDb`), and scenario-family (`SSR_NoWindow`) forms. Dash is intentionally **not** allowed in describes — dash is the behavior-facet joiner in `it`/`test` only.

### D4 — Severity `error`, in the existing test-file block

Add to the existing `{ files: ['**/*.test.{ts,tsx}'], plugins: { vitest }, rules: { … } }` object so the rule inherits the same file scope as the other vitest rules and feeds the pre-merge `lint` gate. Lands at `error` immediately — the violations are finite and resolved in this same change (D5), mirroring how `test-foundation` landed `vitest/expect-expect`.

### D5 — Resolve surfaced violations by audit, not title-only rename

The rule defines the worklist: enable it, run `npm run lint`, and resolve every flagged title. Unlike the original plan, resolution is **not** title-string-only — each flagged title is triaged to one of:

1. **Zero-underscore fused name** → rename to `<State>_<Behavior>`.
2. **Compound state** (the underscore-separated clauses are all setup/conditions) → hoist into nested `describe` blocks; the `it()` keeps a single state token.
3. **Legitimate compound behavior** (ordered effects, or facets of one atomic contract) → convert the joining `_` to `-`.
4. **Conflated behavior** — only the *multi-trigger* case (a title spanning two or more distinct actions, sharing only setup) → split into separate tests. Single-trigger multi-effect compounds are NOT split (D9); they keep their dash-joined facets.

Prose `describe` titles are renamed to identifier form. Per the user's decision, this includes the archive spike POCs (`openspec/changes/archive/.../poc/*.test.ts`) and the `test/helpers/*.test.ts` self-tests — they are renamed, not excluded from lint.

These edits MAY change test **structure** (describe nesting, test splits) but **preserve behavior coverage**: a split re-asserts the same facets in separate tests; hoisting moves shared state into a describe without dropping assertions. Where the State/Behavior token must be chosen, pick what the test's own setup/assertion implies (precision applied by hand, since the rule won't).

### D6 — Standalone change; reconcile contradictions, don't accumulate

This is **not** a `test-coverage` sub-proposal (unlike the carve-outs). It is its own change that happens to land while `test-coverage` is in flight, so the Tier-1 "accumulate the delta into the parent" model does not apply. Its spec delta is its own `specs/testing-foundation/spec.md`, authored as `ADDED` (no active `testing-foundation` spec exists yet to modify).

Because `test-coverage` is also building `testing-foundation` in its accumulator, the two in-flight changes can disagree. The discovered disagreement — `test-coverage`'s Vitest-naming requirement says "exactly two parts, single underscore," which the dash convention contradicts — is reconciled by editing that accumulator requirement to permit the boundary + dash + single-token-state shape (so neither change archives a self-contradiction).

Broader reconciliation is deliberately **not** pursued. Other in-flight test specs (and `test-coverage`'s ~277 queued task lines) may carry titles that will violate the new rule; hunting them line-by-line is disproportionate. Enforcement is now a regex, so those violations fail `lint` as the proposals are implemented, surface the TESTING.md justification in the error message, and are self-corrected; reviewers reading TESTING.md catch the residue. This is the same defense-in-depth the change relies on for all future tests.

### D7 — Token role is the mechanical/semantic boundary

A regex sees tokens, never their roles. `NonPurchase_WithSetter` (two states) is mechanically identical to `Input_ReturnsOwner` (state + behavior). Therefore **no lint rule can catch `<State>_<State>` or `<Behavior>_<Behavior>`** — role is undecidable by pattern, exactly like the precision principle.

This fixes the natural division of labor:

```
MECHANICAL  (lint, error, this change)     SEMANTIC  (manual + AI-authoring + review)
──────────────────────────────────────    ─────────────────────────────────────────
PascalCase tokens                          is token1 actually a STATE?
no prose / whitespace                      is token2 actually a BEHAVIOR?
exactly one underscore (the boundary)      is the "state" secretly compound?
single-token state                         is a dash-joined behavior really atomic?
dash-joined behavior facets                token precision
no fused single token                      describe role distinction; Playwright names
printf placeholders ok
```

The semantic bar's highest-leverage home is the **TESTING.md instructions the AI authors read** while writing the ~277 queued tests, plus the **review** pass (council / code-review). The lint is the cheap backstop for mechanical drift; it is explicitly NOT a guarantee of well-named or well-scoped tests. A green `lint` SHALL be read as "structurally valid", never "well-named".

### D8 — Separator for compound behavior: dash

Compound behavior facets are joined with `-`, not a second `_` or another glyph. Rationale is a **two-level seam hierarchy** — the separators' visual weight must match their semantic rank:

```
   _   ← THE boundary (state│behavior). Must DOMINATE.    wide, baseline, heavy
   -   ← a lesser join (facet+facet). Must be SUBORDINATE. thin, mid-line, light
```

Underscore is heavier than dash, so the eye reads "`_` is the big split, `-` is the little join" automatically; the joins also land at lowercase→uppercase seams (`Once-Not`, `User-Toast`) where the dash stays visible. Alternatives rejected:

- `__` (double underscore) — confusable with the single sacred boundary; disqualifying.
- `+` — too heavy; competes with `_` for "which is the primary seam".
- `.` — implies namespace/hierarchy (wrong meaning) and is low-contrast.

State is never compound (→ describe), so no separator is needed on the state side.

### D9 — Compound behavior is legitimate; split only across triggers (no dash-count rule)

**Alternative considered and rejected:** a `no-restricted-syntax` advisory flagging `it`/`test` titles with 3+ dashes as probable conflation. Rejected because dash count is a false proxy — it fires on legitimate single-trigger compounds and misses low-dash multi-trigger ones (see below). No mechanical conflation rule is added.

State compounds and behavior compounds are **opposite cases**, and only one of them is a smell:

```
Compound STATE                      Compound BEHAVIOR (one trigger → many effects)
──────────────                      ──────────────────────────────────────────────
clauses are shared CONTEXT          effects share one EXECUTION
the state is a grouping axis        the effects co-occur; you cannot observe one
→ hoist into describe (D5)            without triggering all of them
→ FORCE it (good)                   → splitting = re-running setup+action = pure
                                      duplication, and loses the "these all happen
                                      from one action" guarantee → do NOT nudge
```

The exemplar is a toast/notification assertion: `ClickFollow_CallsFollowUser-ToastSuccess-RouterRefresh` asserts three effects of one click. You could never pull `ToastSuccess` into its own test without re-running the identical setup + action and changing only the assertion. So it is inseparable by construction, not a conflation.

Therefore the discriminator for "should this split?" is the **number of distinct triggers, not the number of dashes**:

```
one trigger, N effects   → KEEP (dash-joined). Never split, at any dash count.
N triggers in one test   → SPLIT. Those are N behaviors sharing only setup.
```

Dash count does not correlate with conflation (a 4-effect single-trigger test is fine; a 2-trigger test is conflation at any count), and "split" is the wrong remedy for an *unreadable* long chain anyway — that is fixed by fusing or rewording. Trigger count is a semantic judgment a regex cannot make, so it belongs on the **manual / AI-authoring / review bar** alongside D7's role and precision judgments, captured as a TESTING.md guideline:

> A test covers one trigger; assert all of that trigger's effects together (dash-joined, side-effects like toast/refresh last). Split only when a title spans multiple distinct actions — not because it has several effects.

No mechanical rule is added for this; the convention is the single-underscore + dash floor (D2/D8) plus this documented manual bar.

## Risks / Trade-offs

- **Audit scope.** This is no longer a title-only pass; describe-nesting and test splits touch structure across ~100 titles. Mitigation: D5's worklist is mechanical to enumerate (the lint output *is* the list); coverage is preserved by construction (splits re-assert the same facets).
- **Role hole remains.** `State_State` still passes lint (D7). Mitigation: documented explicitly in TESTING.md and the spec as a manual/AI-authoring/review item; the lint is positioned as a backstop, not a guarantee.
- **Single-child describes.** "Compound state → describe even if used once" can produce one-`it` describe blocks. Accepted: uniform structure (state always in describes) outweighs the minor verbosity.
- **Dash novelty.** Contributors must learn `_` = boundary, `-` = behavior join. Mitigation: TESTING.md documents it with examples; the regex itself teaches by failure.
- **No mechanical conflation guard.** Dropping the dash-count advisory (D9) means multi-trigger conflation is caught only by review. Accepted: dash count was a false proxy (it fired on legitimate single-trigger compounds and missed low-dash multi-trigger ones); the real signal (trigger count) is semantic and lives on the manual bar with role and precision.
- **`RegExp` vs string source.** `vitest/valid-title` rejects `RegExp` literals. Mitigation: configure patterns as string sources (recorded here so apply doesn't repeat the mistake).

## Migration Plan

1. Add `vitest/valid-title` (D2/D3, string-source regexes) at `error` to the existing test-file block.
2. Run `npm run lint`; triage every failure per D5 (rename fused / hoist compound state → describe / dash-join legit compound behavior / split only multi-trigger conflation; rename prose describes incl. archive + helpers).
3. Author the `testing-foundation` spec delta and merge it into the parent accumulator (Tier 1, D6); add the `test-coverage/tasks.md` checkbox.
4. Rewrite TESTING.md's naming section: the sharpened convention, the mechanical floor vs the manual/AI-authoring/review semantic bar (D7), the dash rule (D8), and the D9 advisory.
5. Pre-merge gate: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` all green.

Rollback: revert the `eslint.config.mjs` rule entries; the title/structure edits are harmless to keep.

## Open Questions

None blocking. The exact final regex is settled empirically in Migration step 2 against the real suite.
