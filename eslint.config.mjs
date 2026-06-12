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
      'sonarjs/cognitive-complexity': ['error', 15],
    },
  },
  // File-size bands (policy: CLAUDE.md); two rules because each carries one
  // severity.
  {
    files: ['app/**', 'lib/**', 'hooks/**', 'db/**'],
    ignores: [
      '**/*.test.*',
      '**/__tests__/**',
      'app/changelog/releases.ts',
    ],
    plugins: { sonarjs },
    rules: {
      'max-lines': [
        'error',
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
      // sonarjs always skips blank lines and comments (no option exists)
      'sonarjs/max-lines': ['warn', { maximum: 300 }],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
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
