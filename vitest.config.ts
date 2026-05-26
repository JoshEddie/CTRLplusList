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
        // test-button-system (sub-proposal 3.1) — Primitive-component class,
        // 90% per-file floor. branches:90 set up-front per design Decision 5
        // (the standard sets the bar; the code clears it). Adjusted only if
        // v8 flags an uncoverable branch with a named per-branch rationale.
        'app/ui/components/button/Button.tsx': {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 90,
        },
        'app/ui/components/button/LinkButton.tsx': {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 90,
        },
      },
    },
  },
});
