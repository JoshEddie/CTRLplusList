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
        '**/*.test.*',
        '**/__tests__/**',
        'test/**',
        'e2e/**',
        'app/**/layout.tsx',
        '**/types.ts',
        // App-side `index.ts` files are pure re-export barrels. Scoped to `app/**`
        // rather than `**/index.ts` so `db/index.ts` (Drizzle init, carries runtime) stays covered.
        'app/**/index.ts',
        // constant ReactNode table; no executable behavior. See test-form-field-system design D2.
        'app/ui/components/field/field-icons.tsx',
      ],
      thresholds: {
        perFile: true,
        'lib/visibility.ts': COVERAGE_FLOOR,
        'lib/listAccess.ts': COVERAGE_FLOOR,
        'lib/sqlstate.ts': COVERAGE_FLOOR,
        // test-dal-remainder (sub-proposal 9.1) — the DAL read aggregate and the
        // auth bypass surface, now whole-covered. Resolves the §7.7 / §7.10
        // multi-capability-shared-file deferral (the notes removed from the
        // 4.2 / 4.3 / 4.14 blocks below).
        'lib/dal.ts': COVERAGE_FLOOR,
        'lib/auth.ts': COVERAGE_FLOOR,
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
        'app/ui/components/AppLogo.tsx': COVERAGE_FLOOR,
        'app/ui/components/Header.tsx': COVERAGE_FLOOR,
        'app/ui/hooks/useKeyboardOffset.ts': COVERAGE_FLOOR,
        // test-account-auth-ui (sub-proposal 9.3) — locked at universal COVERAGE_FLOOR.
        // The old-chrome cluster (AppMenu/Logo/Nav, formerly floored under 4.1)
        // was deleted as dead code; their entries are removed above.
        'app/(auth)/ui/components/User.tsx': COVERAGE_FLOOR,
        'app/(auth)/ui/components/UserMenu.tsx': COVERAGE_FLOOR,
        'app/(auth)/ui/components/UserAvatarPopover.tsx': COVERAGE_FLOOR,
        'app/(auth)/ui/components/UserImage.tsx': COVERAGE_FLOOR,
        'app/(auth)/ui/components/SignInPage.tsx': COVERAGE_FLOOR,
        'app/(auth)/ui/components/SignInButton.tsx': COVERAGE_FLOOR,
        'app/(auth)/ui/components/AuthContainer.tsx': COVERAGE_FLOOR,
        'app/(auth)/sign-in/page.tsx': COVERAGE_FLOOR,
        // test-following (sub-proposal 4.2) — locked at universal COVERAGE_FLOOR.
        'app/actions/follows.ts': COVERAGE_FLOOR,
        // test-list-item-management (sub-proposal 4.9) — locked at universal
        // COVERAGE_FLOOR. Whole-file ownership for both action files; downstream
        // carve-outs (4.4 / 4.6 / 4.11 / 4.13 / 4.14) inherit these entries.
        'app/actions/items.ts': COVERAGE_FLOOR,
        'app/actions/lists.ts': COVERAGE_FLOOR,
        // test-server-endpoint-authorization (sub-proposal 4.13) — locked at
        // universal COVERAGE_FLOOR. items.ts / lists.ts / follows.ts are owned
        // by sibling carve-outs (4.9 / 4.2); these two files are new here.
        'app/actions/user.ts': COVERAGE_FLOOR,
        'app/api/image-search/route.ts': COVERAGE_FLOOR,
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
        // test-items-browser-chrome (sub-proposal 4.5) — locked at universal COVERAGE_FLOOR.
        'app/(main)/items/ui/components/ItemsBrowser.tsx': COVERAGE_FLOOR,
        // ItemsToolbar split into a co-located itemsToolbar/ module during the
        // complexity-audit refactor (9.3); each executable unit is floored.
        'app/(main)/items/ui/components/itemsToolbar/ItemsToolbar.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemsToolbar/FiltersSheet.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemsToolbar/PurchasesSelect.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemsToolbar/SearchInputControl.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemsToolbar/utils.ts': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemsToolbar/toolbarConstants.ts':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/Items.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/Pagination.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/PageSizeSelect.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemFilters.ts': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/paginationConstants.ts': COVERAGE_FLOOR,
        // test-items-library-shell (sub-proposal 4.18) — locked at universal COVERAGE_FLOOR.
        'app/(main)/items/page.tsx': COVERAGE_FLOOR,
        'app/(main)/items/loading.tsx': COVERAGE_FLOOR,
        'app/(main)/items/utils.ts': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/ItemsContainer.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/ItemsPage.tsx': COVERAGE_FLOOR,
        // test-list-collections (sub-proposal 4.6) — locked at universal COVERAGE_FLOOR.
        'app/ui/components/ListCard.tsx': COVERAGE_FLOOR,
        'app/ui/components/ListCardRow.tsx': COVERAGE_FLOOR,
        'app/ui/components/MoreCard.tsx': COVERAGE_FLOOR,
        'app/ui/components/ListCollectionsNav.tsx': COVERAGE_FLOOR,
        // test-list-hero-header (sub-proposal 4.7) — locked at universal COVERAGE_FLOOR.
        // lib/visibility.ts already enumerated above (from 2.1); the new
        // resolveListVisibility export is covered by the same floor.
        'app/(main)/lists/ui/components/ListDetails.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/ShareButton.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/EditListAction.tsx': COVERAGE_FLOOR,
        // test-list-hero-collapse (sub-proposal 4.8) — locked at universal COVERAGE_FLOOR.
        'app/(main)/lists/ui/components/HeroCollapseShell.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/HeroCollapsedItems.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/HeroCollapsedItemsContainer.tsx':
          COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/ListActionsMenu.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/visibility-rows.tsx': COVERAGE_FLOOR,
        // test-pwa-shell (sub-proposal 4.12) — locked at universal COVERAGE_FLOOR.
        'app/manifest.ts': COVERAGE_FLOOR,
        'app/ui/components/ServiceWorkerRegistration.tsx': COVERAGE_FLOOR,
        // test-visit-history (sub-proposal 4.14) — locked at universal COVERAGE_FLOOR.
        // `app/actions/lists.ts` is already enumerated above (whole-file, from
        // 4.9); this carve-out's three visit-history functions are covered under
        // that gate. `lib/dal.ts` is now enumerated above (test-dal-remainder 9.1).
        'app/(main)/lists/ui/components/BookmarkButton.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/history/HistoryActions.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/history/HistoryCard.tsx': COVERAGE_FLOOR,
        // test-items-price-filter (sub-proposal 4.16) — locked at universal COVERAGE_FLOOR.
        'app/(main)/items/ui/components/PriceFilterPopover.tsx': COVERAGE_FLOOR,
        // test-items-store-filter (sub-proposal 4.17) — locked at universal COVERAGE_FLOOR.
        'app/(main)/items/ui/components/StoreFilterPopover.tsx': COVERAGE_FLOOR,
        // test-list-item-management-ui (sub-proposal 4.9b) — locked at universal COVERAGE_FLOOR.
        'app/(main)/lists/[id]/choose-items/page.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/choose-items/ChooseItemsBody.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/choose-items/utils.ts': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/ListItemsSection.tsx': COVERAGE_FLOOR,
        'app/(main)/items/[id]/page.tsx': COVERAGE_FLOOR,
        'app/(main)/items/[id]/ItemFormBody.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/ItemFormContainer.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/ItemForm.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/useItemForm.ts': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/utils.ts': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/ItemNameInput.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/StoreInput.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/ListSelection.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/QuantityLimitField.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/ImageUrlInput.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/ImageSearch.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/itemform/ImageResultsViewer.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/purchasemodal/Modal.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/purchasemodal/PurchaseFlow.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/purchasemodal/ModalButtons.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/purchasemodal/PurchaseFlowContainer.tsx':
          COVERAGE_FLOOR,
        'app/(main)/items/ui/components/DeleteItemButton.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/Item.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/ItemCard.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/ClaimBanners.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/OwnerActions.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/PurchaseModalSlot.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/SortItems.tsx': COVERAGE_FLOOR,
        'app/(main)/items/ui/components/SortItemsContainer.tsx': COVERAGE_FLOOR,
        // test-list-create-edit-form (sub-proposal 9.2) — locked at universal COVERAGE_FLOOR.
        'app/(main)/lists/ui/components/ListForm.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/ListFormContainer.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/NewListButton.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/VisibilityPicker.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/DeleteListButton.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/ListPrivate.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/ui/components/EmptyList.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/new/page.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/new/loading.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/edit/page.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/edit/EditListBody.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/ListHeroSection.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/page.tsx': COVERAGE_FLOOR,
        'app/(main)/lists/[id]/loading.tsx': COVERAGE_FLOOR,
        // test-connections-and-profile-pages (sub-proposal 9.4) — locked at universal COVERAGE_FLOOR.
        'app/(main)/settings/connections/page.tsx': COVERAGE_FLOOR,
        'app/(main)/settings/connections/ConnectionsPage.tsx': COVERAGE_FLOOR,
        'app/(main)/settings/connections/ConnectionsSection.tsx': COVERAGE_FLOOR,
        'app/(main)/settings/connections/FollowingSection.tsx': COVERAGE_FLOOR,
        'app/(main)/settings/connections/FollowersSection.tsx': COVERAGE_FLOOR,
        'app/(main)/settings/connections/BlockedSection.tsx': COVERAGE_FLOOR,
        'app/(main)/settings/connections/ConnectionRow.tsx': COVERAGE_FLOOR,
        'app/(main)/settings/connections/ConnectionsActions.tsx': COVERAGE_FLOOR,
        'app/(main)/user/[id]/page.tsx': COVERAGE_FLOOR,
        'app/(main)/user/[id]/ProfilePage.tsx': COVERAGE_FLOOR,
        'app/(main)/user/[id]/ProfileHeaderSection.tsx': COVERAGE_FLOOR,
        'app/(main)/user/[id]/ProfileListsSection.tsx': COVERAGE_FLOOR,
      },
    },
  },
});
