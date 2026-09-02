# Components, pages, styling

## Thin `page.tsx`

Route files are shells that forward props to a co-located `<RouteName>Page.tsx` (`HistoryPage.tsx` next to `page.tsx`). The page component awaits `params`/`searchParams` and owns auth, data fetching, and business logic; the route file only maps URL → component.

Touching a page with inline logic → split it. No unprompted bulk-refactor.

## Extract subcomponents

A JSX block with its own identity (row, card, "list + empty state"), or one past ~5 lines, becomes a named subcomponent. No inline nested JSX in the parent.

- `length === 0 ? <empty> : <ul>{map(...)}</ul>` is its own component (`BookmarksList`); per-item rendering is its own (`BookmarkRow`). The parent should read like an outline.
- Co-locate next to the page, or in the feature's `ui/components/` if reused.
- A trivial two-line conditional needs no name.
- **One React component per file**, lint-enforced by `react/no-multi-comp` over `app/**/*.tsx`. This is a rule about components, not about modules: a DAL, utils, or schema module may export as many functions as it likes. File size is the only thing that governs those ([code-style.md](code-style.md)).

## Primitive families

A reusable interactive control lives in `app/ui/components/<kebab-name>/` as a
**primitive family**: PascalCase component files with **named** exports, reached
through an `index.ts` barrel, plus `<name>Classes.ts`, `types.ts`, and a
co-located stylesheet where it needs them. Today: `button`, `chip`, `field`,
`menu`, `popover-trigger`, `segmented-control`.

- Import through the barrel, never the file. Named export is the family
  signature — every component outside these directories uses `export default`.
- Barrels stay pure re-exports. [vitest.config.ts](../vitest.config.ts) excludes
  `app/**/index.ts` from coverage on that basis, so logic placed in one is
  untested *and* invisible in the report.
- A directory without a barrel (`altvatar/`, `onboarding/`) is a feature group,
  not a family, and carries none of this.

Why controls centralise here at all:
[ADR-0013](adr/0013-interactive-controls-are-primitive-families.md).

## Reuse existing CSS variables

When applying a design mockup, defer to the token set and naming in `app/ui/styles/global.css` (`--primary-color`, `--neutral-text-color`, `--secondary-background-color`, …).

Map `mockup value → existing var` first. Add a new token only when no existing token's role covers the value, named in the same `--<role>-color` style — never a parallel shorthand system (`--p`, `--ink`).
