import { execSync } from 'node:child_process';

import { E2E_DATABASE_URL } from './constants';

// Build the production bundle ONCE before the two project webServers each run
// `next start`. Reuses package.json's `build` (next build --webpack) so the
// Serwist webpack opt-out stays single-sourced, and points the build at the
// localhost Docker Postgres via the USE_PG_DRIVER switch. `next dev` would
// disable the cache layer the suite exists to exercise — see design Decision 3.
export default function globalSetup(): void {
  execSync('npm run build', {
    stdio: 'inherit',
    env: { ...process.env, USE_PG_DRIVER: '1', DATABASE_URL: E2E_DATABASE_URL },
  });
}
