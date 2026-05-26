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
