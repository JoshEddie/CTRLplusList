## Why

The `testing-foundation` spec mandates a `<State>_<Behavior>` shape for Vitest `it()` titles (and a single-PascalCase tag for scenario-family `describe` blocks), but enforcement is a **manual review bar** — TESTING.md states *"ESLint enforces the mechanical parts where configured … the rest is a manual review bar."* Manual bars drift: the `test-following` sub-proposal (#68), meant to set the pattern its sibling carve-outs copy, introduced fresh single-token violations (e.g. `RendersMainContainerWrappingFollowingPage`, `OnChangeForwarded`), and earlier carve-outs left pre-existing drift (`MatchesMenuItemClassString`, `NoRoleAlertNoAriaLive`).

This matters now because `test-coverage` has ~277 test tasks still queued across five sibling carve-outs. Enforcing the title shape **mechanically before those tests are written** stops the drift at the source instead of relying on a reviewer catching each violation across hundreds of new tests.

Exploring the enforcement surfaced that the convention as *practiced* had itself drifted in a subtler way. 107 of ~710 static titles use multiple underscores as an undifferentiated clause separator (e.g. `ClickFollow_OptimisticTrue_CallsFollowUser_ToastSuccess_RouterRefresh`), which conflates two distinct smells the shape was meant to prevent:

- **Compound state** that belongs in nested `describe` blocks (`NonPurchase_WithSetter_IconRendered` — `NonPurchase` and `WithSetter` are both state, repeated across a cluster).
- **Compound behavior** that is often several behaviors crammed into one test that should be split.

The original "single underscore, two tokens" wording could not separate these, and — critically — **a regex cannot judge a token's role**: `<State>_<State>` is mechanically indistinguishable from `<State>_<Behavior>`. So this change does three things: (a) **sharpens** the convention to make the one underscore the sacred state│behavior seam, with a single-token state (compound state → `describe`) and dash-joined behaviors for legitimate compounds; (b) lands a **mechanical lint floor** enforcing that shape; and (c) **audits** the existing suite to the sharpened convention.

## What Changes

- **NEW** lint enforcement: add `vitest/valid-title` to the `**/*.test.{ts,tsx}` block in `eslint.config.mjs` at severity `error`, with `mustMatch` for `it`/`test` = `^[A-Z][A-Za-z0-9%#]*_[A-Z%][A-Za-z0-9%#]*(-[A-Z][A-Za-z0-9%#]*)*$` (exactly one underscore = the state│behavior boundary; state is a single PascalCase token; behavior is one token or dash-joined PascalCase facets; printf placeholders permitted for `it.each`), and `mustNotMatch` for `describe` = `/[^\w$]/` (no whitespace or punctuation).
- **SHARPENED** convention (Tier-1 `testing-foundation` requirement): the single underscore is the state│behavior boundary; **state is a single token** (compound state → nested `describe`, even if used once); **behavior** may dash-join facets for legitimate atomic/ordered compounds. This supersedes the "manual review bar" language for the mechanically-checkable subset (shape, separators, no-prose) while explicitly preserving the manual bar for what a regex cannot judge — token **role** (`State_State` / `Behavior_Behavior`), **precision**, **atomicity** (whether a compound behavior is one trigger's effects), the describe role distinction, and Playwright names.
- **NO mechanical conflation guard.** Compound behavior is legitimate: the effects of a *single trigger* (e.g. `ClickFollow_CallsFollowUser-ToastSuccess-RouterRefresh`) share one execution and cannot be split without duplicating setup. Conflation is predicted by the number of distinct *triggers* in a test, not the number of dashes — a semantic judgment that stays a manual / AI-authoring / review bar (TESTING.md guideline), with no lint rule. (A 3+-dash `no-restricted-syntax` advisory was considered and rejected — dash count is a false proxy for conflation; see design D9.)
- **AUDIT** (replaces the prior "title-only rename"): bring the existing suite to the sharpened convention. Per surfaced title, the resolution is one of: rename a zero-underscore fused name; hoist a compound-state cluster into nested `describe` blocks; convert a legitimate compound behavior `_`→`-`; or split a conflated compound behavior into separate tests. Prose `describe` titles (including the archive spike POCs and the `test/helpers` self-tests) are renamed to identifier form. These edits MAY change test **structure** (describe nesting, test splits) but **preserve behavior coverage** — splits re-assert the same facets, and nesting moves state context without dropping assertions.
- **DOC** rewrite TESTING.md's naming section to document the sharpened convention and the explicit boundary between the mechanical lint floor and the manual / AI-authoring / review semantic bar.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `testing-foundation`: adds one requirement establishing the sharpened, mechanically-enforced title-shape convention (single-underscore boundary, single-token state, dash-joined behavior), the lint floor that enforces it, and the explicitly-still-manual remainder (token role, precision, atomicity). This is a **standalone** change — NOT a `test-coverage` sub-proposal — that happens to land while `test-coverage` is in flight. Its spec delta is its own (ADDED against the not-yet-existent active `testing-foundation` spec). Where the convention contradicts `test-coverage`'s pending accumulator — specifically the "exactly two parts, single underscore" wording of its existing Vitest-naming requirement — that accumulator is reconciled to match. Other in-flight test specs are **not** exhaustively audited for contradictions: because enforcement is now a regex, violations in those proposals will fail `lint` as they are implemented, carry a message pointing to TESTING.md, and be self-corrected; reviewers reading TESTING.md catch the rest.

## Impact

- **Config:** `eslint.config.mjs` — the existing `{ files: ['**/*.test.{ts,tsx}'], plugins: { vitest } }` block gains a single `vitest/valid-title` rule entry (dash-aware regex). No new dependency: `eslint-plugin-vitest` is already wired. (Implementation note: `vitest/valid-title` requires the regex as a **string** source, not a `RegExp` literal — a `RegExp` fails schema validation.)
- **Tests:** compound titles are audited across the suite — renames, `describe`-nesting, and test splits. Behavior coverage is preserved.
- **Docs:** TESTING.md naming section; the `testing-foundation` accumulator spec.
- **Governance:** this is a standalone change, so no governing-change checkbox is added to `test-coverage`. The one known cross-change contradiction — `test-coverage`'s pending Vitest-naming requirement — is reconciled directly.
- **No runtime behavior change.** Test-only: lint config plus test-title/structure edits.
- **Out of scope:** mechanically enforcing token **role** (State vs Behavior) — undecidable by a static pattern, so it stays the manual + AI-authoring + review bar; Playwright `<Page>_<Action>_<Outcome>` enforcement (separate runner, no plugin); the precision principle and atomicity judgments.
