# Abstraction (DRY · KISS · coupling)

## Duplication (DRY)

**Extract at the second copy.** A repeated unit gets one home the moment a second copy exists. There is no count threshold above two.

**The only inline allowance** — every clause must hold:

- the repeated unit is a **single line**, and
- it has no branching, no typed factory, no multi-field literal, and
- divergence between the copies would fail **loudly** (type error, failing test) rather than silently.

Fail any clause and it extracts.

- Identical-by-design logic → one home on sight; don't ask.
- Keep copies apart only when nameable as different concepts changing for different reasons; looks-alike ≠ duplication. That is the one judgment worth making — not "how many copies?"
- Silent drift outranks size. A one-line copy that can fall behind without anything failing extracts like anything else.

## Over-generality (KISS)

- No generality for cases that don't exist — parameters/flags/branches with no current caller = dead code, unless planned for imminent use.
- Don't tear down clean, working, tested abstraction for being more general than needed; stripping covered code = risk, no live defect.

## Redundant guards

- Don't re-test a condition your own earlier control flow decided. A guard (`if (cond) redirect()/return/throw`) whose condition was already excluded upstream in the same function is dead code — remove it and let narrowing flow from the existing control flow (merge/move the upstream guard, early-return).
- NOT the same as a defensive guard, whose condition turns on an invariant established outside the function (framework lifecycle, platform, third-party/DB contract) that the compiler can't prove — that one is legitimate. Tell: a rationale citing the function's own earlier code ("guard above already redirects…") means the redundant kind.

## Fragile coupling

- Shared abstraction's callers diverge → split back into separate concepts; no flags/params/branches so one thing serves all.
- Coupling between callers that are genuinely one concept changing together = abstraction working.

## Extraction for leanness

Extract single-caller helpers for lean files — readability extraction is the norm, needs no justification.

## Where extracted helpers live

- Small/generic/pure helpers → **co-located `utils.ts`** for that directory (create if absent), not their own single-purpose file. `capRail` in `app/(main)/lists/ui/components/rails/utils.ts`, following `app/ui/components/utils.ts` (`initialsOf`).
- A descriptively-named standalone module is reserved for a genuine domain/capability concept (`lib/data/user.ts`, `lib/visibility.ts`, `lib/listAccess.ts`). `utils.ts` = small stuff, not a domain-logic dump.

## Worked example: `Button` / `LinkButton`

Trio in `app/ui/components/button/`:

- **DRY** — the only genuine shared thing, visual styling, lives in `buttonClasses()`.
- **Fragile coupling** — separate components, not one polymorphic thing behind an `as`/`href` flag: `Button` = `<button>` (`ButtonHTMLAttributes` + `type`), `LinkButton` = Next `<Link>` (`AnchorHTMLAttributes` + `LinkProps`).
- **KISS** — each carries only its concept's props: `Button` has `isLoading`/`disabled`, `LinkButton` doesn't — a link can't load or be disabled; adding it "for symmetry" is generality for a nonexistent caller.
