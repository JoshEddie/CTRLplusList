## Context

`eslint-plugin-react-hooks@7.1.1` (transitively pulled in by `eslint-config-next@16.2.4`) graduated three rules from opt-in to default-error: `set-state-in-effect`, `use-memo` (complex deps), and `immutability`. CI lint now reports 7 errors and 6 warnings across 9 files. Five other OpenSpec changes are in flight that touch overlapping files; folding the lint work into each would muddy their scope. A dedicated hygiene change keeps responsibility clear.

Most failures are mechanical. The interesting subset is the four `set-state-in-effect` cases — each is technically idiomatic React but the new rule is opinionated about expressing the same intent without an effect. Each needs a per-file decision.

## Goals / Non-Goals

**Goals:**
- `npm run lint` exits 0 with no errors and no warnings.
- For each `set-state-in-effect` site, choose between refactor and justified `eslint-disable-next-line` (with a one-line reason comment) — no blanket disables.
- Preserve behavior. Any incidental bug fixes get called out but the change does not depend on user-visible behavior changes.

**Non-Goals:**
- Upgrading or downgrading `eslint-plugin-react-hooks` or `eslint-config-next`.
- Refactoring effect-heavy components beyond what the four flagged sites require.
- Changes to specs/requirements. This is dev-experience cleanup; no spec deltas.
- Resolving merge conflicts with the in-flight changes ahead of time — those land on `dev` in whatever order they're ready; mechanical conflicts on these few lines are cheap.

## Decisions

### D1 — `EditItemButton.tsx:28` (`setMounted(true)` mount guard)

**Decision:** Replace the `useState`/`useEffect` mount gate with `useSyncExternalStore` returning `typeof document !== 'undefined'`.

**Why:** This is the canonical React 19 pattern for "am I on the client?" gates. The current `mounted` state exists solely so the `createPortal(..., document.body)` call doesn't run during SSR. `useSyncExternalStore` expresses this without an effect and satisfies the rule honestly.

**Alternatives considered:**
- `'use client'` alone won't help — the file is already a client component; the SSR pass still runs and `document` is undefined.
- `eslint-disable` would be honest but trains us to ignore the rule for legitimately-rewritable patterns.

### D2 — `ItemsToolbar.tsx:96` (`setSearchInput(q)` URL→local sync)

**Decision:** Drop the sync effect entirely. Make `searchInput` initialize from `q` once with `useState(q)`, then use `key={q}` on the input wrapper or component to reset local state when the URL `q` changes from outside (e.g., back/forward navigation).

**Why:** The effect was syncing prop→state, which is the exact anti-pattern the rule targets. `key`-based reset accomplishes the same external-sync intent without an effect.

**Alternatives considered:**
- Fully controlled input keyed to `q` with debounced URL update via ref: cleaner long-term but a bigger refactor; defer.
- `eslint-disable`: leaves the well-known anti-pattern in place.

### D3 — `ItemsToolbar.tsx:102` (`updateParams` used before declared)

**Decision:** Move the `updateParams` declaration above the debounced search effect (and wrap in `useCallback` so its identity is stable). Drop the existing `eslint-disable-next-line react-hooks/exhaustive-deps` on the effect — once `updateParams` is callback-stable, the rule passes honestly.

**Why:** TDZ violation flagged by `react-hooks/immutability`. The fix is purely ordering.

### D4 — `PriceFilterPopover.tsx:37` (props→local sync for popover)

**Decision:** Use `key={`${min}|${max}`}` on the popover's content element so the component remounts (and reinitializes local state from props) when the URL price truth changes. Remove the sync effect.

**Why:** Same anti-pattern as D2. Incidentally fixes a latent bug: today, while the popover is open and the user is typing, an external URL change would stomp their in-progress edit. The `key` approach only resets when the popover content is unmounted/remounted (closed and reopened, or external change), which matches user expectation.

**Alternatives considered:**
- Track an "initialized" ref: error-prone, adds a ref for no readability gain.
- `eslint-disable`: doesn't address the latent bug.

### D5 — `AppNav.tsx:38` (`setOpen(false)` on `pathname` change)

**Decision:** Keep the effect, add `// eslint-disable-next-line react-hooks/set-state-in-effect` with a one-line reason: closing the menu in response to navigation is a legitimate side effect, not derived state.

**Why:** Unlike D1–D4, this is not "syncing state from props" — it's responding to a navigation event by closing a transient UI element. The rule is being overly conservative. Refactoring to put `setOpen(false)` on every `<Link>` `onClick` would scatter the concern and miss programmatic navigations (e.g., `router.push`).

**Alternatives considered:**
- Move the close logic into a `useEffect` watching `pathname` via `useSyncExternalStore`: same effect, more ceremony.
- `Link onClick` approach: doesn't cover programmatic nav; brittle.

### D6 — `useMemo` complex deps (`ItemsBrowser.tsx:150`, `ChooseItemsForm.tsx:125`)

**Decision:** Extract `const selectedStoresKey = selectedStores.join('|')` to a `const` just above the memo and use the named variable in the deps array. Same fix at both sites.

**Why:** The rule requires deps to be simple expressions. Extracting to a name satisfies it and is idiomatic.

### D7 — Misc warnings

- **`StoreLinks.tsx:30`** — wrap `const stores = item.stores ?? [];` in `useMemo(() => item.stores ?? [], [item.stores])` so its identity is stable across renders. (Cheaper than restructuring the downstream memos.)
- **`ListSelection.tsx:118`** — add `aria-selected={isSelected}` (or equivalent) to every element with `role="option"`. Required by WCAG; the warning is correct.
- **`ChooseItemsForm.tsx:363`** — delete the stale `// eslint-disable-next-line react/jsx-no-target-blank` directive; the rule no longer fires at that line.
- **`app/api/image-search/route.ts:189`** — delete the unused `tags` variable (or prefix with `_` if it documents the API shape; default to delete unless reading the surrounding code shows it's intentional API contract).

## Risks / Trade-offs

- **`key`-based resets (D2, D4)** discard local component state on every URL change. For D4 this is desired (fixes the stomp bug); for D2 we should confirm the URL `q` changes only happen on actions that *should* reset the input (back/forward, deep-link, clear button) — manual verification step in tasks.
- **`useSyncExternalStore` for `mounted` (D1)** is a small bundle/perf delta (negligible) and a slight readability cost. Acceptable trade for satisfying the rule honestly.
- **D5 disable comment** sets a precedent: when adopting a stricter linter, some flagged patterns are legitimate. Mitigation — comment explains *why* per-site; reviewers can audit by grepping for `set-state-in-effect`.
- **Merge conflicts with five in-flight changes** are likely on `ItemsBrowser.tsx`, `ItemsToolbar.tsx`, `ChooseItemsForm.tsx`, `StoreLinks.tsx`, `ListSelection.tsx`, `AppNav.tsx`. Mitigation — fixes are localized (single-digit lines each); conflicts are mechanical.

## Migration Plan

1. Implement per file in the order in `tasks.md` (mechanical first, then the four set-state-in-effect cases).
2. Run `npm run lint` after each file; goal is zero net new errors at every step.
3. Run `npm run build` once at the end to catch any TS regressions from the `useSyncExternalStore` and callback refactors.
4. Manual preview-verification via the dev-auth bypass: open the items page, exercise search debounce, open/close the price popover with the URL changing externally, navigate around to confirm the nav menu closes.

Rollback: revert the single commit; no data or schema impact.

## Open Questions

- `app/api/image-search/route.ts:189` — is `tags` intentional API-contract documentation or dead code? Read the surrounding block during implementation; default to delete if it's purely unused.
