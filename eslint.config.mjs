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
      'vitest/expect-expect': 'error',
      'vitest/valid-expect': 'error',
      'vitest/no-standalone-expect': 'error',
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
