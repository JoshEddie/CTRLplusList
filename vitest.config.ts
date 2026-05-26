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
        'test/**',
        'e2e/**',
        'app/**/layout.tsx',
        // type-only — TS erases to nothing at runtime; covered by `tsc --noEmit`.
        'lib/types.ts',
      ],
      thresholds: {
        perFile: true,
        // test-pure-libs (sub-proposal 2.1) — Pure-logic class, 95% floor.
        'lib/visibility.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 80,
        },
        'lib/listAccess.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 80,
        },
        'hooks/use-media-query.ts': {
          lines: 95,
          statements: 90,
          functions: 80,
          branches: 50,
        },
        'app/ui/components/button/buttonClasses.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 80,
        },
      },
    },
  },
});
