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

// Universal coverage floor — one bar for every file matched by
// `coverage.include` (subject to `coverage.exclude`), enforced per file with
// no per-file numeric variation (testing-foundation). Functions = 100% is
// non-negotiable: an uninvoked function is a real test gap, not slop. A file
// that cannot meet the floor MUST close the gap via tests OR `/* v8 ignore */`
// with a one-line rationale — lowering the floor is not an acceptable
// disposition.
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
        // constant release-log data (types + one literal array); no executable behavior.
        'app/changelog/releases.ts',
        // pure re-export of NextAuth's handlers — a framework barrel with no logic;
        // the bypass/session behavior behind it is covered by lib/auth.ts tests.
        // `*` matches the literal `[...nextauth]` segment, which written directly
        // would parse as a character class.
        'app/api/auth/*/route.ts',
      ],
      thresholds: {
        perFile: true,
        ...COVERAGE_FLOOR,
      },
    },
  },
});
