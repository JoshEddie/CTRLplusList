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
      },
    },
  },
});
