import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import vitest from 'eslint-plugin-vitest';

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'public/sw.js',
      'coverage/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { sonarjs },
    rules: {
      'sonarjs/cognitive-complexity': ['warn', 15],
    },
  },
  // Per-file promotion of `sonarjs/cognitive-complexity` to error for the
  // test-pure-libs carve-out (sub-proposal 2.1 of test-coverage). Files in
  // this carve-out are now tested at the 95% per-file floor; the error-level
  // override locks the complexity ceiling so future edits cannot grow them
  // past 15 without an explicit per-line disable + reason.
  {
    files: [
      'lib/visibility.ts',
      'lib/listAccess.ts',
      // test-dal-remainder (sub-proposal 9.1) — DAL read aggregate + auth bypass,
      // now whole-covered, so the complexity ceiling is promoted to error.
      'lib/dal.ts',
      'lib/auth.ts',
      'hooks/use-media-query.ts',
      'app/ui/components/button/buttonClasses.ts',
      // test-button-system (sub-proposal 3.1) — locked at 90% per-file floor.
      'app/ui/components/button/Button.tsx',
      'app/ui/components/button/LinkButton.tsx',
      // test-chip-system (sub-proposal 3.2) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/chip/Chip.tsx',
      'app/ui/components/chip/chipClasses.ts',
      // test-form-field-system (sub-proposal 3.3) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/field/FormField.tsx',
      'app/ui/components/field/TextField.tsx',
      'app/ui/components/field/TextareaField.tsx',
      'app/ui/components/field/SelectField.tsx',
      'app/ui/components/field/DateField.tsx',
      'app/ui/components/field/DatalistField.tsx',
      'app/ui/components/field/PriceField.tsx',
      'app/ui/components/field/SearchField.tsx',
      'app/ui/components/field/CheckboxField.tsx',
      'app/ui/components/field/FieldError.tsx',
      // test-menu-system (sub-proposal 3.4) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/menu/Menu.tsx',
      'app/ui/components/menu/MenuItem.tsx',
      'app/ui/components/menu/MenuItemRadio.tsx',
      'app/ui/components/menu/MenuLinkItem.tsx',
      'app/ui/components/menu/menuClasses.ts',
      // test-popover-trigger-system (sub-proposal 3.5) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/popover-trigger/PopoverTrigger.tsx',
      'app/ui/components/popover-trigger/triggerClasses.ts',
      'app/ui/hooks/usePopoverDismiss.ts',
      // test-segmented-control-system (sub-proposal 3.6) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/segmented-control/SegmentedControl.tsx',
      'app/ui/components/segmented-control/SegmentedOption.tsx',
      'app/ui/components/segmented-control/segmentedClasses.ts',
      // test-loading-indicator-system (sub-proposal 3.7) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/LoadingIndicator.tsx',
      // test-misc-primitives (sub-proposal 3.8) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/ConfirmDialog.tsx',
      'app/ui/components/TooltipWrapper.tsx',
      'app/ui/components/Empty.tsx',
      'app/ui/components/FormShell.tsx',
      // test-app-frame (sub-proposal 4.1) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/AppFrame.tsx',
      'app/ui/components/AppNav.tsx',
      'app/ui/components/AppMenu.tsx',
      'app/ui/components/AppLogo.tsx',
      'app/ui/components/Logo.tsx',
      'app/ui/components/Header.tsx',
      'app/ui/components/Nav.tsx',
      'app/ui/hooks/useKeyboardOffset.ts',
      // test-following (sub-proposal 4.2) — locked at universal COVERAGE_FLOOR.
      'app/actions/follows.ts',
      // test-list-item-management (sub-proposal 4.9) — complexity locked at error.
      'app/actions/items.ts',
      'app/actions/lists.ts',
      // test-server-endpoint-authorization (sub-proposal 4.13) — complexity
      // locked at error. items.ts / lists.ts / follows.ts are owned above.
      'app/actions/user.ts',
      'app/api/image-search/route.ts',
      'app/(main)/users/ui/utils.ts',
      'app/(main)/users/ui/components/Avatar.tsx',
      'app/(main)/users/ui/components/FollowButton.tsx',
      'app/(main)/users/ui/components/FollowContainer.tsx',
      'app/(main)/users/ui/components/FollowControls.tsx',
      'app/(main)/users/ui/components/FollowDisclosureDialog.tsx',
      'app/(main)/users/ui/components/FollowPrompt.tsx',
      'app/(main)/users/ui/components/ProfileHeader.tsx',
      'app/(main)/users/ui/components/PublicListsGrid.tsx',
      'app/(main)/users/ui/components/UserCard.tsx',
      'app/(main)/users/ui/components/UserCardGrid.tsx',
      'app/(main)/following/FollowingPage.tsx',
      'app/(main)/following/page.tsx',
      // test-home-digest (sub-proposal 4.3) — locked at universal COVERAGE_FLOOR.
      'app/(main)/HomePage.tsx',
      'app/(main)/page.tsx',
      'app/(main)/lists/ui/components/rails/MyListsRail.tsx',
      'app/(main)/lists/ui/components/rails/FollowingRail.tsx',
      'app/(main)/lists/ui/components/rails/BookmarksRail.tsx',
      'app/(main)/lists/ui/components/rails/RecentlyVisitedRail.tsx',
      'app/(main)/lists/ui/components/rails/utils.ts',
      'app/(main)/lists/ui/components/CollapsibleRail.tsx',
      'app/(main)/lists/ui/components/BookmarkMigrationToast.tsx',
      // test-item-store-links (sub-proposal 4.4) — locked at universal COVERAGE_FLOOR.
      'app/(main)/items/ui/components/StoreLinks.tsx',
      // test-items-browser-chrome (sub-proposal 4.5) — locked at universal COVERAGE_FLOOR.
      'app/(main)/items/ui/components/ItemsBrowser.tsx',
      // ItemsToolbar split into a co-located itemsToolbar/ module during the
      // complexity-audit refactor (9.3); complexity locked across the split.
      'app/(main)/items/ui/components/itemsToolbar/ItemsToolbar.tsx',
      'app/(main)/items/ui/components/itemsToolbar/FiltersSheet.tsx',
      'app/(main)/items/ui/components/itemsToolbar/PurchasesSelect.tsx',
      'app/(main)/items/ui/components/itemsToolbar/SearchInputControl.tsx',
      'app/(main)/items/ui/components/itemsToolbar/utils.ts',
      'app/(main)/items/ui/components/itemsToolbar/toolbarConstants.ts',
      'app/(main)/items/ui/components/Items.tsx',
      'app/(main)/items/ui/components/Pagination.tsx',
      'app/(main)/items/ui/components/PageSizeSelect.tsx',
      'app/(main)/items/ui/components/itemFilters.ts',
      'app/(main)/items/ui/components/paginationConstants.ts',
      // test-items-library-shell (sub-proposal 4.18) — locked at universal COVERAGE_FLOOR.
      'app/(main)/items/page.tsx',
      'app/(main)/items/loading.tsx',
      'app/(main)/items/utils.ts',
      'app/(main)/items/ui/components/ItemsContainer.tsx',
      'app/(main)/items/ui/components/ItemsPage.tsx',
      // test-list-collections (sub-proposal 4.6) — locked at universal COVERAGE_FLOOR.
      'app/ui/components/ListCard.tsx',
      'app/ui/components/ListCardRow.tsx',
      'app/ui/components/MoreCard.tsx',
      'app/ui/components/ListCollectionsNav.tsx',
      // test-list-hero-header (sub-proposal 4.7) — locked at universal COVERAGE_FLOOR.
      'app/(main)/lists/ui/components/ListDetails.tsx',
      'app/(main)/lists/ui/components/ShareButton.tsx',
      'app/(main)/lists/ui/components/EditListAction.tsx',
      // test-list-hero-collapse (sub-proposal 4.8) — locked at universal COVERAGE_FLOOR.
      'app/(main)/lists/ui/components/HeroCollapseShell.tsx',
      'app/(main)/lists/ui/components/HeroCollapsedItems.tsx',
      'app/(main)/lists/ui/components/HeroCollapsedItemsContainer.tsx',
      'app/(main)/lists/ui/components/ListActionsMenu.tsx',
      'app/(main)/lists/ui/components/visibility-rows.tsx',
      // test-pwa-shell (sub-proposal 4.12) — locked at universal COVERAGE_FLOOR.
      'app/manifest.ts',
      'app/ui/components/ServiceWorkerRegistration.tsx',
      // app/actions/lists.ts already promoted above (whole-file, from 4.9);
      'app/(main)/lists/ui/components/BookmarkButton.tsx',
      'app/(main)/lists/history/HistoryActions.tsx',
      'app/(main)/lists/history/HistoryCard.tsx',
      // test-items-price-filter (sub-proposal 4.16) — complexity locked at error.
      'app/(main)/items/ui/components/PriceFilterPopover.tsx',
      // test-items-store-filter (sub-proposal 4.17) — complexity locked at error.
      'app/(main)/items/ui/components/StoreFilterPopover.tsx',
      // test-list-item-management-ui (sub-proposal 4.9b) — complexity locked at error.
      'app/(main)/lists/[id]/choose-items/page.tsx',
      'app/(main)/lists/[id]/choose-items/ChooseItemsBody.tsx',
      'app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx',
      'app/(main)/lists/[id]/choose-items/utils.ts',
      'app/(main)/lists/[id]/ListItemsSection.tsx',
      'app/(main)/items/[id]/page.tsx',
      'app/(main)/items/[id]/ItemFormBody.tsx',
      'app/(main)/items/ui/components/itemform/ItemFormContainer.tsx',
      'app/(main)/items/ui/components/itemform/ItemForm.tsx',
      'app/(main)/items/ui/components/itemform/useItemForm.ts',
      'app/(main)/items/ui/components/itemform/utils.ts',
      'app/(main)/items/ui/components/itemform/ItemNameInput.tsx',
      'app/(main)/items/ui/components/itemform/StoreInput.tsx',
      'app/(main)/items/ui/components/itemform/ListSelection.tsx',
      'app/(main)/items/ui/components/itemform/QuantityLimitField.tsx',
      'app/(main)/items/ui/components/itemform/ImageUrlInput.tsx',
      'app/(main)/items/ui/components/itemform/ImageSearch.tsx',
      'app/(main)/items/ui/components/itemform/ImageResultsViewer.tsx',
      'app/(main)/items/ui/components/purchasemodal/Modal.tsx',
      'app/(main)/items/ui/components/purchasemodal/PurchaseFlow.tsx',
      'app/(main)/items/ui/components/purchasemodal/ModalButtons.tsx',
      'app/(main)/items/ui/components/purchasemodal/PurchaseFlowContainer.tsx',
      'app/(main)/items/ui/components/DeleteItemButton.tsx',
      'app/(main)/items/ui/components/Item.tsx',
      'app/(main)/items/ui/components/ItemCard.tsx',
      'app/(main)/items/ui/components/ClaimBanners.tsx',
      'app/(main)/items/ui/components/OwnerActions.tsx',
      'app/(main)/items/ui/components/PurchaseModalSlot.tsx',
      'app/(main)/items/ui/components/SortItems.tsx',
      'app/(main)/items/ui/components/SortItemsContainer.tsx',
    ],
    plugins: { sonarjs },
    rules: {
      'sonarjs/cognitive-complexity': ['error', 15],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/expect-expect': [
        'error',
        // Permit named-helper assertions like `expectOnlyActive` /
        // `expectClosed` — they wrap one or more `expect()` calls and
        // dedupe shared assertion blocks across sibling tests.
        { assertFunctionNames: ['expect', 'expect*'] },
      ],
      'vitest/valid-expect': 'error',
      'vitest/no-standalone-expect': 'error',
      'vitest/valid-title': [
        'error',
        {
          mustMatch: {
            it: [
              '^[A-Z][A-Za-z0-9%#]*_[A-Z%][A-Za-z0-9%#]*(-[A-Z][A-Za-z0-9%#]*)*$',
              'it()/test() titles must match <State>_<Behavior>(-<Behavior>)*: one underscore = the state│behavior boundary, single-token PascalCase state (compound state → nested describe), dash-joined PascalCase behavior facets. See TESTING.md.',
            ],
            test: [
              '^[A-Z][A-Za-z0-9%#]*_[A-Z%][A-Za-z0-9%#]*(-[A-Z][A-Za-z0-9%#]*)*$',
              'it()/test() titles must match <State>_<Behavior>(-<Behavior>)*: one underscore = the state│behavior boundary, single-token PascalCase state (compound state → nested describe), dash-joined PascalCase behavior facets. See TESTING.md.',
            ],
          },
          mustNotMatch: {
            describe: [
              '[^\\w$]',
              'describe() titles must be identifier/tag form: no whitespace or punctuation (dash is the behavior-facet joiner in it()/test() only). See TESTING.md.',
            ],
          },
        },
      ],
    },
  },
  {
    files: ['**/*.test.tsx'],
    plugins: { 'testing-library': testingLibrary },
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
    },
  },
];

export default eslintConfig;
