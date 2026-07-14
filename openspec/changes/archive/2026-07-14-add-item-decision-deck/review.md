---
review: spec-review
target: add-item-decision-deck
anchor: 87c5f254717fb6a12aa93199b052ba5866cc7fdd
diff-source: git diff --staged
round: 4
---

## Round 1 — spec-review (2026-07-14)

The Timeout → FetchFailure replacement is clean work — the kind-aware screen, the retry cap, and the `summarize` extraction all land well, and every touched file sits green on size. Contract status: `openspec validate --strict` passes, but four contract artifacts still describe the superseded Timeout screen, and one real behavioral bug (stale retry counter) survives.

**Scope:** `git diff --staged` (15 files, +411/−116) · add-item-decision-deck (active)

### Findings

#### Standard

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| S1 | Minor | app/(main)/items/ui/components/itemform/ItemFormContainer.tsx:114 | `failCount` is never reset on a successful fetch, only when a different URL is entered — a link that succeeds on "Try again" keeps its stale failure history. Paste A → fail (failCount=1) → Try again → success → deck → "Change link" (leaves `pastedUrl=A` prefilled) → fetch A again → `priorFails=1`, so the hardened "That link keeps failing" copy fires after 2 further failures instead of 3, telling the user a demonstrably working link keeps failing. Reset `failCount` on the ok-result branch alongside `setScreen('deck')`. | Fix now | ItemFormContainer.tsx:114-115 `const priorFails = url === pastedUrl ? failCount : 0;` — success branch at :138-149 never touches `failCount` (design.md D10: "a per-link retry counter (reset when a different URL is entered)") |
| S2 | Minor | app/(main)/items/ui/components/itemform/ItemFormContainer.tsx:115 | `if (url !== pastedUrl) setFailCount(0);` is an unobservable state write — dead code. `failCount` has one reader, `canRetrySame={failCount <= RETRY_CAP}`, evaluated only while `screen === 'failure'`; every path there runs through `failFetch`, which sets `failCount` unconditionally from the local `priorFails`. The line is immediately followed by `setScreen('fetching')`, so the zeroed value can never render — `DifferentLinkAfterCap_ResetsRetryCount` passes on `priorFails=0` alone. Pairs with S1: the reset belongs on the success branch, where it would be observable. | Fix now | ItemFormContainer.tsx:115 ↔ :244 (CLAUDE.md § KISS: "parameters, flags, or branches with no current caller are dead code") |
| S3 | Minor | app/(main)/items/ui/components/itemform/deck/FetchFailure.tsx:4 | The `'timeout' \| 'failed'` literal union is written three times: `FailureKind` in ItemFormContainer.tsx:31, `FetchFailureProps.kind` here, and `copyFor`'s parameter at :11. Three copies of a structured type with no single home — a third kind means editing three places, and the container→component direction drifts silently (a widened prop union still accepts a narrower `failureKind`). Export `FailureKind` from FetchFailure.tsx; import it in the container and `copyFor`. | Fix now | FetchFailure.tsx:4, :11 ↔ ItemFormContainer.tsx:31 (CLAUDE.md § DRY: "extract when ANY of: 3+ copies · the unit has structure") |
| S4 | Minor | app/(main)/items/ui/components/itemform/deck/FetchFailure.tsx:41 | On the timeout kind before the cap, `showTryDifferent` is false, so a user who pasted the wrong URL and timed out has no direct path back to URL entry — only "Try again" (re-fetching a link they know is wrong, burning two real fetches against the rate limit) or "Build it by hand". The deleted Timeout screen offered "Try a different link" as its **primary** action, so this is a regression in escape paths. See C4 — the same gap seen from the contract side, where it is dispositioned `Fix now`. | File issue | FetchFailure.tsx:41 `const showTryDifferent = !canRetrySame \|\| kind === 'failed';` (vs. deleted deck/Timeout.tsx:19-21, where "Try a different link" was primary) |
| S5 | Minor | app/(main)/items/ui/components/itemform/deck/deck.css:745 | `padding: 8px 24px 24px` now duplicated verbatim between `.deck` (:34-36) and `.deck-failure` — same shared screen-padding concept, drift fails silently (visual only). deck.css already uses grouped selector lists for exactly this at :20-32. Borderline under the ≤2-copies / 1-line carve-out. | Drop | deck.css:745 ↔ :35 (CLAUDE.md § DRY: two copies is a judgment call on weight, drift hazard, and count) |

#### Convention

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| V1 | Minor | app/(main)/items/ui/components/itemform/deck/utils.ts:177 | Two new lines in `summarize` exceed the print width; `npx prettier --check` fails on this file and on ItemFormContainer.tsx:151. `prettier --write` rewraps L177, L183, and the `failFetch(...)` call in the container. | Fix now | `warning.push({ title: 'Item name', line: 'Review the name for best results' });` — package.json exposes `check-format`/`format` (Prettier 3.x, `eslint-config-prettier` + `eslint-plugin-prettier` installed); the repo is uniformly Prettier-formatted |
| V2 | Minor | app/(main)/items/ui/components/itemform/deck/utils.ts:155 | The `summarize` comment both restates WHAT the code does ("Sorts every pulled field into confirmed / warning / error rows" — the name and `IntroSummary` already say this) and names its caller ("so IntroCard stays a thin render"). | Fix now | CLAUDE.md § Comments: "Don't explain WHAT the code does… Don't reference the current task, fix, or callers"; § Extraction for leanness: "extraction for readability is the norm … and doesn't need justifying." Contrast the `RETRY_CAP` comment in ItemFormContainer.tsx — a genuine non-obvious WHY (rate-limit grinding); keep it |
| V3 | Minor | app/(main)/items/ui/components/itemform/deck/__tests__/FetchFailure.test.tsx:82 | `ClickActions_InvokeMatchingHandlers` fires three distinct triggers (Try again / Try a different link / Build it by hand) in one test, and its state token is a behavior, not a state. Three actions = three tests. Failure isolation is forfeited — the first failing `expect` aborts, hiding whether the other two wirings hold. | Fix now | TESTING.md § Test naming convention: "One test = one trigger… The discriminator is the number of triggers"; "role confusion: both tokens are state (passes lint, fails review)" — same defect class for Behavior_Behavior |
| V4 | Minor | app/(main)/items/ui/components/itemform/__tests__/ItemFormContainer.test.tsx:359 | `NetworkError_ShowsFailedKind` names an internal prop value (`kind: 'failed'`) rather than the observable it asserts — the rendered copy "We couldn't load that link" plus a `console.error` call. Its two siblings in the same describe name the rendered copy correctly; this one is the outlier. The `console.error` side-effect is also unnamed. | Fix now | TESTING.md § Precision principle: "If the test asserts on rendered text, the behavior token names what is rendered"; side-effects come last, dash-joined |
| V5 | Minor | app/(main)/items/ui/components/itemform/deck/cards/IntroCard.tsx:6 | `import { summarize } from '../utils';` was appended below the `./DeckCard` / `./DeckRow` sibling imports, breaking the file's own parent-before-sibling grouping — the line it replaces (`import { priceTier, titleTier } from '../utils';`) sat with the other `../` imports. No lint rule enforces ordering; pure convention drift. | Fix now | `import { DeckRow } from './DeckRow';` followed by `import { summarize } from '../utils';` — the deleted line occupied the correct slot alongside `../neededSteps` and `../viewModel` |

#### Contract

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C1 | Minor | openspec/specs/product-fetch-mock/spec.md:56 | The canonical product-fetch-mock spec still routes both failure fixtures to "the timeout screen", which this change replaces with a kind-aware failure screen rendering different copy for `fetch-failed` vs `timeout`; canonical scenario and implementation disagree. Reconcile EITHER: add a MODIFIED product-fetch-mock requirement to this change's delta restating the scenario in failure-screen/kind terms, OR leave the canonical wording and accept "timeout screen" becomes a dangling name once this change syncs. | Fix now | product-fetch-mock/spec.md "Scenario: Failure fixtures reach the timeout screen" — "the add-item flow SHALL show the timeout screen" (cross-spec drift) |
| C2 | Minor | openspec/changes/add-item-decision-deck/tasks.md:49 | Tasks 7.3 and 10.3 remain `[x]` but describe the superseded screen — 7.3 specifies "That link wouldn't load" / "Try a different link" → URL entry as the built artifact, 10.3 asserts "the Timeout screen". Section 14 (14.2/14.3) revised both and the delta specs were rewritten; these tasks were not. Reconcile EITHER: reword 7.3/10.3 to the delivered FetchFailure screen (or annotate "superseded by 14.2/14.3"), OR leave them as the historical record of the first pass and let section 14 carry the current contract. | Fix now | tasks.md:49 (7.3) and tasks.md:70 (10.3) vs 14.2/14.3 and specs/item-decision-deck/spec.md "A failed fetch SHALL show a kind-aware, attempt-aware failure screen" |
| C3 | Minor | openspec/changes/add-item-decision-deck/tasks.md:88 | Task 14.6 is `[x]` claiming each failure state was walked under `npm run dev:local` with the #177 mock, and says it "Folds into 11.1" — but 11.1 is still `[ ]` reading "deferred: requires Docker + the running dev server / preview tooling; not run in this session". The two task states contradict and nothing in the diff corroborates the walk. Reconcile EITHER: tick 11.1 (or narrow its deferral note to the arcs 14.6 did not cover) if the walk happened, OR unmark 14.6 back to `[ ]` and fold it into 11.1 as outstanding local verification. | Fix now | tasks.md:88 (14.6, `[x]`, "Folds into 11.1") vs tasks.md:75 (11.1, `[ ]`, "not run in this session") |
| C4 | Minor | app/(main)/items/ui/components/itemform/deck/FetchFailure.tsx:41 | `showTryDifferent = !canRetrySame \|\| kind === 'failed'` hides "Try a different link" for an uncapped timeout, so a mistyped link is unrecoverable until the user burns two same-link retries. The spec's timeout bullet enumerates only Try again + Build it by hand but states no SHALL NOT, so the exclusion is enforced only by tests, not by the contract. Reconcile EITHER: make the exclusion contractual (add "and SHALL NOT offer 'Try a different link' until the retry cap is reached" to the timeout bullet), OR amend the implementation to show "Try a different link" on the timeout kind too. Same gap as S4. | Fix now | specs/item-decision-deck/spec.md "**Timeout kind:** … offer a **\"Try again\"** action … plus \"Build it by hand\"" and design.md D10 "Primary action: **Try again**…; secondary: build by hand" — neither states the exclusion the code and `TimeoutKind_ShowsSlownessCopyWithRetryAndBuildOnly` assert |

### What looks good

- The `summarize` extraction pulls IntroCard from 107 → 56 lines and puts the helper in the co-located `utils.ts`, exactly where CLAUDE.md wants small pure helpers. Every touched file is green on size (ItemFormContainer 294, utils.ts 193, FetchFailure 66).
- `RETRY_CAP` carries a real non-obvious WHY comment (rate-limit grinding) — the one comment in the diff that earns its place.
- FetchFailure's `copyFor` keeps the two kinds' copy in one readable table instead of branching JSX; new tests assert rendered copy and actions rather than internals.
- No new `/* v8 ignore */` directives; no coverage-gaming patterns.
- `openspec validate add-item-decision-deck --strict` passes.

### Deferred to CI (unverified here)

- `npm run lint` · `npm run test:coverage` · `npm run test:e2e` — this skill does not run gates.
- tasks.md 12.5 (`npm run test:e2e`) is `[ ]`, deferred on Docker. Reasonable: the diff's only e2e edit is an assertion-text update in e2e/paste-prefill.auth.spec.ts:166 ("That link wouldn't load" → "This is taking longer than expected"), matching the stub that fulfills any URL containing 'fail' with `{ ok: false, error: 'timeout' }` — a mechanical rename, no new arc. Confirm the e2e job goes green on the dev push; no local run backs it. Note the e2e test name `Deck_FetchFails_TimeoutThenBuildByHandSeedsUrl` now conflates the two kinds, and no e2e arc covers the `fetch_failed` kind or the retry cap (unit tests do).

**Verdict:** findings remain
<!-- Round 1's S2 and V1 were overturned in round 3 — both re-dispositioned to Drop on evidence round 1 lacked. The rows above stand as the historical record; round 3 is the current disposition. -->

## Round 2 — recheck (2026-07-14)

**Fix delta:** `git diff` (unstaged) + the untracked `specs/product-fetch-mock/` delta — 8 files in review scope, +76/−34. Well inside recheck size; no escalation.

**Delta-scope note:** `git diff` also carries `.claude/skills/start-change/SKILL.md`, `CLAUDE.md`, and `openspec/specs/trunk-workflow/spec.md` — unrelated trunk-workflow doc edits that predate round 1 and are untouched by this fix round. Not treated as fix-delta files; they did not trigger the outside-the-diff escalation tell.

### Prior findings

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| S1 | `failCount` never reset on success | resolved | `setFailCount(0)` added on the ok-result branch (ItemFormContainer.tsx:148), before `setScreen('deck')`. Observable: it persists into the deck and is read by the next same-URL `priorFails`. `SameLinkSucceedsAfterFailure_ResetsRetryCount` drives the exact arc (fail → Try again → success → Change link → re-fetch → two more failures still offer "Try again"). |
| S2 | `if (url !== pastedUrl) setFailCount(0);` is dead code | **still open** | Line unchanged at ItemFormContainer.tsx:114. The S1 fix added the observable reset elsewhere but did not remove this one; the original argument stands verbatim — `failCount`'s only reader is `canRetrySame`, reachable only via `failFetch`, which writes unconditionally from the local `priorFails`; `setScreen('fetching')` on the next line means the zeroed value can never render. |
| S3 | `'timeout' \| 'failed'` union written three times | resolved | `export type FailureKind` now lives in FetchFailure.tsx:3; the container imports it (`import { FetchFailure, type FailureKind }`), `copyFor` takes it, and the test helper imports it. One home, four consumers. |
| V1 | Prettier fails on utils.ts + ItemFormContainer.tsx | **still open** | `npx prettier --check` still reports all three touched files. Unfixed: utils.ts:175 and :181 (both `push({...})` calls over print width), ItemFormContainer.tsx:151 (`failFetch(...)` call). `prettier --write` on the two files closes it. |
| V2 | `summarize` comment restates WHAT + names its caller | resolved | Comment deleted (utils.ts). The `RETRY_CAP` WHY comment correctly survives. |
| V3 | `ClickActions_InvokeMatchingHandlers` fires three triggers | resolved | Split into `TryAgainClicked_InvokesRetrySameHandler`, `TryDifferentLinkClicked_InvokesTryDifferentHandler`, `BuildItByHandClicked_InvokesManualHandler` — one trigger each, one mock each, failure isolation restored. |
| V4 | `NetworkError_ShowsFailedKind` names an internal prop | resolved | Now `NetworkError_ShowsUncertaintyCopy-LogsError` — names the rendered copy with the log side-effect dash-joined last, per TESTING.md § naming. `vitest/valid-title` clean. |
| V5 | `summarize` import broke parent-before-sibling order | resolved | `import { summarize } from '../utils';` moved back above the `./DeckCard` / `./DeckRow` sibling imports (IntroCard.tsx:3). |
| C1 | product-fetch-mock spec routes both fixtures to "the timeout screen" | resolved | New `specs/product-fetch-mock/spec.md` MODIFIED delta; the scenario is restated as "Each failure fixture reaches its own kind on the failure screen" — `fetch-failed` → failed kind, `timeout` → timeout kind. `openspec validate add-item-decision-deck --strict` passes with the delta in place. |
| C2 | Tasks 7.3 / 10.3 `[x]` but describe the superseded screen | resolved | Both reworded to the delivered screen with an explicit supersession annotation (7.3: "_superseded by 14.2/14.3_"; 10.3 names the e2e arc's timeout-kind scope and points the `fetch_failed`/cap coverage at 14.5). 7.1 and 7.5 picked up the same `timeout` → `failure` correction. |
| C3 | 14.6 `[x]` "Folds into 11.1" contradicts 11.1 `[ ]` | resolved | Reconciled in the honest direction: 14.6 keeps its `[x]` and now says "Walked and confirmed good; 11.1 still owns the re-walk after 14.7"; 11.1's note narrows to the outstanding scope (re-walk the timeout kind's new escape path and the post-success cap reset). The two no longer contradict. |
| C4 | Timeout kind's missing escape path not contractual either way | resolved | Reconciled by amending **both** sides toward the same answer: `showTryDifferent` is gone — "Try a different link" now renders on every kind, primary once capped, secondary while uncapped. The spec's timeout bullet, its scenario, and design.md D10 all state the three actions plus the rationale ("a timeout is the slowest failure to observe… SHALL NOT have to spend the retry cap to return to URL entry"). The two tests asserting the exclusion were inverted to assert its presence. S4 (dispositioned File issue) is closed by the same fix — no issue needed. |

### New findings

None. The fix delta introduces no new defect; every change is confined to the finding it addresses, and section 14b documents each fix against its finding id.

### Notes for landing (not findings)

- `openspec validate add-item-decision-deck --strict` passes.
- Tasks 11.1, 11.2, and 12.5 remain `[ ]`. Not review findings — C3's resolution deliberately left 11.1 open — but `/land-change` gates on all tasks `[x]`, so they are the next blocker after S2/V1.
- Unrelated to this change: `ItemFormContainer.test.tsx` also fails `prettier --check` at lines untouched by either round (:87, :137, :159, :171). Pre-existing drift outside both diffs; `--write` on that file would sweep it up alongside V1.

**Verdict:** findings remain
<!-- Round 2's S2 and V1 "still open" statuses were overturned in round 3 — both re-dispositioned to Drop. Round 3 is the current disposition. -->

## Round 3 — recheck (2026-07-14)

**Fix delta:** none — no code changed since round 2. This round re-adjudicates two round-1 dispositions on evidence the persisted report predates (a post-review explore pass), and corrects two errors carried by rounds 1 and 2.

### Re-dispositioned findings

| # | Prior disposition | New disposition | Evidence |
|---|-------------------|-----------------|----------|
| S2 | Fix now (dead code) | **Drop** | The line is load-bearing, not dead. `failCount` persists **across** `startFetch` calls, and line 114's write is read by the *next* call at `const priorFails = url === pastedUrl ? failCount : 0` (:113). Two exits leave `failCount` untouched, and line 114 is the only reset covering them: the rate-limit exit (`status === 429 \|\| result.error === 'rate_limited'` → `setScreen('start'); return`, :130-136) and the abort exits (:146 in the ok-branch — *before* the S1 reset at :148 — and :154 in the catch). Verified trace: fetch A fails (`failCount=1`, `pastedUrl=A`) → "Try a different link" → fetch B (`priorFails=0`; without line 114, `failCount` stays 1) → B hits 429 and returns without writing → re-fetch B → `priorFails = (B===B) → 1`. B, which never failed, inherits A's history and hardens to "That link keeps failing" one failure early. Removing the line is a regression. Rounds 1 and 2 traced only the current invocation ("the zeroed value can never render") — true, and irrelevant to the actual channel, which is the next invocation. |
| V1 | Fix now (Prettier drift) | **Drop** | The citation's premise — "the repo is uniformly Prettier-formatted" — is false. Verified: `grep -in prettier eslint.config.mjs` → no match (`eslint-config-prettier`/`eslint-plugin-prettier` are in package.json but wired into nothing, so `npm run lint`, a pure `eslint .`, checks no formatting); `npx prettier --check .` → **387 files fail repo-wide**; `check-format` exists in package.json (and in an unused `validate` script) but is not among CLAUDE.md's five gates. Formatting these three files enforces no rule, fixes no gate, and adds diff noise against a repo-wide baseline this change did not set. Round 1's detection was also vacuous: its glob `app/(main)/.../**/*.{ts,tsx}` matched zero files (the `(main)` parens are glob syntax), printing both "No files matching the pattern were found" and "All matched files use Prettier code style" in one run. Round 2's own line-93 note — the test file fails at lines untouched by either round — is the same pre-existing drift seen from the other side. |

### Correction to rounds 1 and 2

Round 2 reported S2 as "still open" with the note "the original argument stands verbatim". That was re-assertion, not verification: the round-1 reasoning was accepted rather than re-traced against the 429 and abort exits, which is precisely where it fails. V1's citation was likewise carried forward without checking whether the rule it cites exists. Both errors are the same failure mode — a recheck inheriting a prior round's conclusion instead of testing it.

### Residual note (not a finding)

Line 114's channel is not covered by any test — `DifferentLinkAfterCap_ResetsRetryCount` passes on `priorFails=0` alone and would still pass with the line removed, which is what let rounds 1 and 2 read it as dead. A test driving fail-A → fetch-B → 429 → re-fetch-B would pin the behavior against a future "cleanup". Not a blocker and out of scope for this change; worth a follow-up if the reset is ever revisited.

### Open Fix-now findings

None. S1, S3, V2, V3, V4, V5, C1, C2, C3, C4 resolved in round 2; S2 and V1 dropped here; S4 (File issue) closed by the C4 fix; S5 dropped in round 1.

### Notes for landing

- `openspec validate add-item-decision-deck --strict` passes.
- **The landing gate remains blocked separately by tasks 11.1, 11.2, and 12.5 being `[ ]`** — not review findings, and not cleared by this verdict. 11.1 is deliberately open pending the `dev:local` re-walk that the C4 fix invalidated (the timeout kind now offers "Try a different link" from the first failure, and the post-success cap reset needs walking). `/land-change` gates on all tasks `[x]`.

**Verdict:** clear to land

## Round 4 — recheck (2026-07-14)

**Fix delta:** `git diff` — `FetchFailure.tsx` (2 copy strings), `FetchFailure.test.tsx` (2 assertions added), `tasks.md` (14b.6). All inside round 1's reviewed scope; +9/−3. No escalation.

**Origin:** not a round-3 finding — surfaced by the owner walking `mock.test/timeout` for task 11.1, i.e. the re-walk 11.1 exists to force. Recorded here because the fix lands in reviewed code and the report is the change's review record.

### New findings

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| S6 | Minor | app/(main)/items/ui/components/itemform/deck/FetchFailure.tsx:23 | The timeout sub enumerated the screen's actions ("The link may still work — give it another try, or build the item by hand") and 14b.1 added a third button without updating it, so the copy told the user about two of the three actions rendered. Structural cause: of the three copy variants, only the timeout sub enumerated actions *and* had an action added — the capped sub enumerates two and renders two, and the failed sub describes the cause and never enumerates, so neither could drift. | Fix now | FetchFailure.tsx:23 vs the three `<Button>`s at :50-62 after 14b.1 removed `showTryDifferent` |
| S7 | Minor | app/(main)/items/ui/components/itemform/deck/FetchFailure.tsx:17 | Hardened sub read "build **the item** by hand" while both the spec's and design.md's quoted wording of that same copy read "build **it** by hand" — which is also the button's own label ("Build it by hand"). Quoted-copy mismatch between implementation and a `SHALL` sentence. | Fix now | FetchFailure.tsx:17 vs specs/item-decision-deck/spec.md:244 ("the copy SHALL harden (\"That link keeps failing — try a different one, or build it by hand\")") and design.md:86 |

### Resolutions (this round)

| # | Status | Notes |
|---|--------|-------|
| S6 | resolved | Timeout sub is now "The link may still work — a retry often does it." — states the cause, lets the buttons carry the actions, adopting the failed kind's existing shape. Deliberately **not** fixed by listing all three: D10's rationale is that "'Try again' leading is what carries the timeout's 'this link may well work' message, not the absence of the alternative", and an even three-way enumeration would flatten the hierarchy the button variants express. No spec change required — the timeout bullet and its scenario quote only the title ("This is taking longer than expected"); the sub is not contractual. Reconciliation direction: implementation only. |
| S7 | resolved | Hardened sub is now "Try a different one, or build it by hand." — implementation moved to the spec's wording, not the reverse, because the spec's phrasing already matches the button label. specs/item-decision-deck/spec.md:244 and design.md:86 now quote the delivered string verbatim. |

### Regression guard added

Neither sub was asserted anywhere — `grep` over `*.ts`/`*.tsx`/`*.md` found the timeout sub only at its own definition. That is precisely why S6 landed silently: `TimeoutKind_ShowsSlownessCopyWithAllThreeActions` asserted the title and all three buttons, so it stayed green while the copy contradicted the buttons it was checking. The failed kind was the only variant with a sub assertion (`/might be the link, or a hiccup on our end/`). Both gaps are now closed — the timeout and capped tests assert their subs alongside the actions they describe, so copy and actions can no longer disagree without a red test.

### Gates run

- `npx vitest run app/(main)/items/ui/components/itemform` — 29 files, 296 tests, all pass.
- `npx tsc --noEmit` — clean.
- `npx eslint` on both touched files — clean (`vitest/valid-title` included).
- `openspec validate add-item-decision-deck --strict` — passes (re-run after the tasks.md edit).

### Open Fix-now findings

None. S6 and S7 fixed in-round; rounds 1–3 dispositions unchanged.

### Notes for landing

- **Task 11.1 is not cleared by this round, and its walk is now partly stale again** — S6 changed the very screen the re-walk targets. The `mock.test/timeout` pass needs redoing against the new sub copy. `mock.test/fetch-failed` and the capped state are also touched (S7 changed the hardened sub both kinds share).
- The post-success retry reset (14b.2 / S1) **cannot** be walked from the mock: fixtures are a static `Record<Scenario, ProductResult>` (lib/product-fetch/mock.ts:37), so `mock.test/timeout` always times out and no scenario fails-then-succeeds for one URL. Its only coverage is `SameLinkSucceedsAfterFailure_ResetsRetryCount`. 11.1's note currently asks for a walk that no fixture can produce — narrow it to the reachable arcs before ticking.
- Tasks 11.1, 11.2, 12.5 remain `[ ]`; `/land-change` gates on all tasks `[x]`.

**Verdict:** clear to land
