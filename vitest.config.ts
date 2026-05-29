import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// vitest 4 removed `environmentMatchGlobs`; the documented replacement is
// `test.projects`. Two projects split test files by extension so .test.tsx
// runs under jsdom (Testing Library) while .test.ts runs under node
// (DAL / DB integration). See openspec change `test-foundation` design D1.
// `@/*` alias mirrors the tsconfig path mapping so test sources can import
// production code via the same specifiers production uses (e.g. `@/db`,
// `@/db/schema`). Without this, static imports like
// `import { db } from '@/db'` fail to resolve under vitest.
const aliasRoot = { '@': resolve(__dirname, '.') };

// Universal coverage floor — one bar for every enumerated file, no per-file
// numeric variation (testing-foundation: "Per-file thresholds SHALL reference
// a single shared COVERAGE_FLOOR constant"). Functions = 100% is non-
// negotiable: an uninvoked function is a real test gap, not slop. A file that
// cannot meet the floor MUST close the gap via tests OR `/* v8 ignore */`
// with a one-line rationale — lowering the floor is not an acceptable
// disposition. While the parent `test-coverage` change is in flight, only
// files with landed tests are enumerated below; at parent archive the
// enumeration deletes and the floor applies universally across
// `coverage.include`.
const COVERAGE_FLOOR = {
  lines: 98,
  statements: 98,
  branches: 95,
  functions: 100,
} as const;

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias: aliasRoot },
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['**/*.test.tsx'],
          exclude: [
            'node_modules/**',
            'dist/**',
            '.next/**',
            'openspec/**',
            'e2e/**',
          ],
          setupFiles: ['./test/helpers/setup.ts'],
        },
      },
      {
        resolve: { alias: aliasRoot },
        test: {
          name: 'node',
          environment: 'node',
          include: ['**/*.test.ts'],
          exclude: [
            'node_modules/**',
            'dist/**',
            '.next/**',
            'openspec/**',
            'e2e/**',
          ],
        },
      },
    ],
    pool: 'forks',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['lib/**', 'app/**', 'hooks/**'],
      exclude: [
        '**/*.d.ts',
        'drizzle/**',
        'app/sw.ts',
        'app/manifest.ts',
        '**/*.test.*',
        '**/__tests__/**',
        'test/**',
        'e2e/**',
        'app/**/layout.tsx',
        '**/types.ts',
        // NOT `**/index.ts` — `db/index.ts` carries runtime (Drizzle init).
        'app/ui/components/*/index.ts',
        // constant ReactNode table; no executable behavior. See test-form-field-system design D2.
        'app/ui/components/field/field-icons.tsx',
      ],
      thresholds: {
        perFile: true,
        'lib/visibility.ts': COVERAGE_FLOOR,
        'lib/listAccess.ts': COVERAGE_FLOOR,
        'lib/sqlstate.ts': COVERAGE_FLOOR,
        'hooks/use-media-query.ts': COVERAGE_FLOOR,
        'app/ui/components/button/buttonClasses.ts': COVERAGE_FLOOR,
        'app/ui/components/button/Button.tsx': COVERAGE_FLOOR,
        'app/ui/components/button/LinkButton.tsx': COVERAGE_FLOOR,
        'app/ui/components/chip/Chip.tsx': COVERAGE_FLOOR,
        'app/ui/components/chip/chipClasses.ts': COVERAGE_FLOOR,
        'app/ui/components/field/FormField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/TextField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/TextareaField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/SelectField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/DateField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/DatalistField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/PriceField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/SearchField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/CheckboxField.tsx': COVERAGE_FLOOR,
        'app/ui/components/field/FieldError.tsx': COVERAGE_FLOOR,
        'app/ui/components/menu/Menu.tsx': COVERAGE_FLOOR,
        'app/ui/components/menu/MenuItem.tsx': COVERAGE_FLOOR,
        'app/ui/components/menu/MenuItemRadio.tsx': COVERAGE_FLOOR,
        'app/ui/components/menu/MenuLinkItem.tsx': COVERAGE_FLOOR,
        'app/ui/components/menu/menuClasses.ts': COVERAGE_FLOOR,
        'app/ui/components/popover-trigger/PopoverTrigger.tsx': COVERAGE_FLOOR,
        'app/ui/components/popover-trigger/triggerClasses.ts': COVERAGE_FLOOR,
        'app/ui/hooks/usePopoverDismiss.ts': COVERAGE_FLOOR,
        'app/ui/components/segmented-control/SegmentedControl.tsx':
          COVERAGE_FLOOR,
        'app/ui/components/segmented-control/SegmentedOption.tsx':
          COVERAGE_FLOOR,
        'app/ui/components/segmented-control/segmentedClasses.ts':
          COVERAGE_FLOOR,
        'app/ui/components/LoadingIndicator.tsx': COVERAGE_FLOOR,
        // test-misc-primitives (sub-proposal 3.8) — locked at universal COVERAGE_FLOOR.
        'app/ui/components/ConfirmDialog.tsx': COVERAGE_FLOOR,
        'app/ui/components/TooltipWrapper.tsx': COVERAGE_FLOOR,
        'app/ui/components/Empty.tsx': COVERAGE_FLOOR,
        'app/ui/components/FormShell.tsx': COVERAGE_FLOOR,
        // test-app-frame (sub-proposal 4.1) — locked at universal COVERAGE_FLOOR.
        'app/ui/components/AppFrame.tsx': COVERAGE_FLOOR,
        'app/ui/components/AppNav.tsx': COVERAGE_FLOOR,
        'app/ui/components/AppMenu.tsx': COVERAGE_FLOOR,
        'app/ui/components/AppLogo.tsx': COVERAGE_FLOOR,
        'app/ui/components/Logo.tsx': COVERAGE_FLOOR,
        'app/ui/components/Header.tsx': COVERAGE_FLOOR,
        'app/ui/components/Nav.tsx': COVERAGE_FLOOR,
        'app/ui/hooks/useKeyboardOffset.ts': COVERAGE_FLOOR,
        // test-following (sub-proposal 4.2) — locked at universal COVERAGE_FLOOR.
        // No `lib/dal.ts` entry: it is a multi-capability aggregate whose
        // file-level floor is deferred (Tier 2 requirement) until the
        // data-layer carve-outs that share it collectively cover it.
        'app/actions/follows.ts': COVERAGE_FLOOR,
        'app/(main)/users/ui/utils.ts': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/Avatar.tsx': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/FollowButton.tsx': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/FollowContainer.tsx': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/FollowControls.tsx': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/FollowDisclosureDialog.tsx':
          COVERAGE_FLOOR,
        'app/(main)/users/ui/components/FollowPrompt.tsx': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/ProfileHeader.tsx': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/PublicListsGrid.tsx': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/UserCard.tsx': COVERAGE_FLOOR,
        'app/(main)/users/ui/components/UserCardGrid.tsx': COVERAGE_FLOOR,
        'app/(main)/following/FollowingPage.tsx': COVERAGE_FLOOR,
        'app/(main)/following/page.tsx': COVERAGE_FLOOR,
        // test-home-digest (sub-proposal 4.3) — locked at universal COVERAGE_FLOOR.
        // No `lib/dal.ts` entry (Decision 7): its per-file floor is deferred
        // until the data-layer carve-outs that share it collectively cover it.
        'app/(main)/HomePage.tsx': COVERAGE_FLOOR,
        'app/(main)/page.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/rails/MyListsRail.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/rails/FollowingRail.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/rails/BookmarksRail.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/rails/RecentlyVisitedRail.tsx':
          COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/rails/utils.ts': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/CollapsibleRail.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/BookmarkMigrationToast.tsx':
          COVERAGE_FLOOR,
        // test-item-store-links (sub-proposal 4.4) — locked at universal COVERAGE_FLOOR.
        'app/(main)/items/ui/components/StoreLinks.tsx': COVERAGE_FLOOR,
      },
    },
  },
});
